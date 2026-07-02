"""Services métier missions (caution, expiration, remboursements)."""
from datetime import timedelta

from django.utils import timezone

from .models import Mission, MissionApplication, MissionStatusHistory

DEPOSIT_GRACE_HOURS = 4
CLIENT_DECISION_HOURS = 48

# Statuts annulables sans litige (prestataire pas encore engagé en exécution)
CANCELLABLE_STATUSES = frozenset({
    Mission.Status.PENDING,
    Mission.Status.FUNDED,
    Mission.Status.ACCEPTED,
})

# Statuts nécessitant un litige si le client veut annuler
DISPUTE_REQUIRED_STATUSES = frozenset({
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
})


def schedule_deposit_deadline(mission) -> None:
    mission.deposit_deadline = timezone.now() + timedelta(hours=DEPOSIT_GRACE_HOURS)


def release_expired_deposit_deadlines() -> int:
    """Libère les missions dont le prestataire n'a pas déposé la caution à temps."""
    now = timezone.now()
    expired = Mission.objects.filter(
        status=Mission.Status.ACCEPTED,
        deposit_paid=False,
        deposit_deadline__lt=now,
    ).select_related('provider', 'client')

    count = 0
    for mission in expired:
        provider = mission.provider
        old_provider_name = provider.get_full_name() if provider else ''

        if provider:
            MissionApplication.objects.filter(
                mission=mission,
                provider=provider,
                status=MissionApplication.Status.ACCEPTED,
            ).update(
                status=MissionApplication.Status.REJECTED,
                responded_at=now,
            )

        mission.provider = None
        mission.status = Mission.Status.FUNDED
        mission.deposit_deadline = None
        mission.deposit_amount = 0
        mission.required_deposit = 0
        mission.save(update_fields=[
            'provider', 'status', 'deposit_deadline',
            'deposit_amount', 'required_deposit', 'updated_at',
        ])

        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=Mission.Status.ACCEPTED,
            new_status=Mission.Status.FUNDED,
            changed_by=mission.client,
            reason=(
                f'Caution non déposée dans les {DEPOSIT_GRACE_HOURS}h '
                f'(prestataire: {old_provider_name}). Mission rouverte.'
            ),
        )

        from apps.notifications.services import create_notification, notify_mission_event
        notify_mission_event(
            mission,
            'deposit_expired',
            mission.client,
            'Mission rouverte',
            f'La mission « {mission.title} » est à nouveau disponible (caution non reçue à temps).',
        )
        if provider:
            create_notification(
                provider,
                'deposit_expired',
                'Délai de caution dépassé',
                (
                    f'Vous n\'avez pas déposé la caution à temps pour « {mission.title} ». '
                    f'La mission a été réassignée.'
                ),
                mission=mission,
            )
        count += 1

    return count


def cancel_mission_with_refunds(
    mission,
    *,
    changed_by,
    reason: str,
    new_status: str = Mission.Status.CANCELLED,
) -> dict:
    """
    Annule ou expire une mission en remboursant le client et, si applicable, la caution prestataire.
    Ne pas utiliser si la mission est en cours ou soumise (litige requis).
    """
    if mission.status in DISPUTE_REQUIRED_STATUSES:
        return {
            'ok': False,
            'error': (
                'La mission est en cours ou des preuves ont été soumises. '
                'Ouvrez un litige pour résoudre la situation.'
            ),
            'dispute_required': True,
        }

    if mission.status in (Mission.Status.COMPLETED, Mission.Status.CANCELLED, Mission.Status.EXPIRED):
        return {'ok': False, 'error': 'Cette mission ne peut plus être annulée'}

    from apps.escrow.services import escrow_service

    old_status = mission.status
    client_refund = None
    deposit_refund = False

    if mission.status in (Mission.Status.FUNDED, Mission.Status.ACCEPTED):
        client_refund = escrow_service.refund_client(mission, reason=reason)

    if mission.provider and mission.deposit_paid:
        deposit_refund = escrow_service.refund_provider_deposit(mission)
        mission.deposit_paid = False

    if mission.provider and old_status == Mission.Status.ACCEPTED:
        MissionApplication.objects.filter(
            mission=mission,
            provider=mission.provider,
            status=MissionApplication.Status.ACCEPTED,
        ).update(
            status=MissionApplication.Status.REJECTED,
            responded_at=timezone.now(),
        )

    provider = mission.provider
    mission.status = new_status
    mission.expiry_decision_pending = False
    mission.expiry_decision_due_at = None
    if new_status in (Mission.Status.CANCELLED, Mission.Status.EXPIRED):
        mission.provider = None
        mission.deposit_deadline = None
    mission.save(update_fields=[
        'status', 'deposit_paid', 'expiry_decision_pending', 'expiry_decision_due_at',
        'provider', 'deposit_deadline', 'updated_at',
    ])

    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        reason=reason,
    )

    from apps.notifications.services import create_notification, notify_mission_event
    notify_mission_event(
        mission,
        'cancelled',
        mission.client,
        'Mission annulée' if new_status == Mission.Status.CANCELLED else 'Mission expirée',
        reason,
    )
    if provider:
        create_notification(
            provider,
            'mission_cancelled',
            'Mission annulée',
            f'La mission « {mission.title} » a été annulée. Votre caution a été restituée.',
            mission=mission,
        )

    return {
        'ok': True,
        'client_refund': client_refund,
        'deposit_refunded': deposit_refund,
        'status': new_status,
    }


def process_expired_missions() -> dict:
    """
    Traite les missions dont l'échéance est dépassée :
    - sans prestataire → remboursement auto + expired
    - avec prestataire (accepted) → notification client, décision requise
    - décision non prise à temps → annulation auto avec remboursements
    """
    release_expired_deposit_deadlines()

    now = timezone.now()
    stats = {
        'auto_expired': 0,
        'decision_notified': 0,
        'auto_cancelled': 0,
    }

    # Cas A : échéance dépassée, aucun prestataire
    no_provider = Mission.objects.filter(
        deadline__lt=now,
        provider__isnull=True,
        status=Mission.Status.FUNDED,
    ).select_related('client')

    for mission in no_provider:
        result = cancel_mission_with_refunds(
            mission,
            changed_by=mission.client,
            reason='Échéance dépassée sans prestataire assigné — fonds remboursés au client',
            new_status=Mission.Status.EXPIRED,
        )
        if result.get('ok'):
            stats['auto_expired'] += 1

    # Cas B : échéance dépassée, prestataire assigné mais mission pas démarrée
    with_provider = Mission.objects.filter(
        deadline__lt=now,
        status=Mission.Status.ACCEPTED,
        provider__isnull=False,
        expiry_decision_pending=False,
    ).select_related('client', 'provider')

    for mission in with_provider:
        mission.expiry_decision_pending = True
        mission.expiry_decision_due_at = now + timedelta(hours=CLIENT_DECISION_HOURS)
        mission.save(update_fields=['expiry_decision_pending', 'expiry_decision_due_at', 'updated_at'])

        from apps.notifications.services import create_notification
        create_notification(
            mission.client,
            'mission_expired_decision',
            'Échéance dépassée — action requise',
            (
                f'L\'échéance de « {mission.title} » est dépassée. '
                f'Choisissez de prolonger la mission ou de l\'annuler '
                f'(délai : {CLIENT_DECISION_HOURS}h).'
            ),
            mission=mission,
            action_url=f'/missions/{mission.id}',
        )
        if mission.provider:
            create_notification(
                mission.provider,
                'mission_expired_decision',
                'Échéance dépassée',
                (
                    f'L\'échéance de « {mission.title} » est dépassée. '
                    f'En attente de la décision du client.'
                ),
                mission=mission,
            )
        stats['decision_notified'] += 1

    # Décision client non prise à temps → annulation auto
    overdue = Mission.objects.filter(
        expiry_decision_pending=True,
        expiry_decision_due_at__lt=now,
        status=Mission.Status.ACCEPTED,
    ).select_related('client', 'provider')

    for mission in overdue:
        result = cancel_mission_with_refunds(
            mission,
            changed_by=mission.client,
            reason=(
                f'Décision non prise dans les {CLIENT_DECISION_HOURS}h '
                f'après expiration — annulation automatique'
            ),
            new_status=Mission.Status.CANCELLED,
        )
        if result.get('ok'):
            stats['auto_cancelled'] += 1

    return stats


def continue_expired_mission(mission, *, new_deadline, changed_by) -> dict:
    """Prolonge une mission expirée après décision client."""
    if mission.status != Mission.Status.ACCEPTED:
        return {'ok': False, 'error': 'Seules les missions acceptées peuvent être prolongées'}

    now = timezone.now()
    if mission.deadline >= now and not mission.expiry_decision_pending:
        return {'ok': False, 'error': 'L\'échéance n\'est pas encore dépassée'}

    if new_deadline <= now:
        return {'ok': False, 'error': 'La nouvelle échéance doit être dans le futur'}

    old_deadline = mission.deadline
    mission.deadline = new_deadline
    mission.expiry_decision_pending = False
    mission.expiry_decision_due_at = None
    mission.save(update_fields=['deadline', 'expiry_decision_pending', 'expiry_decision_due_at', 'updated_at'])

    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=mission.status,
        new_status=mission.status,
        changed_by=changed_by,
        reason=f'Échéance prolongée ({old_deadline.isoformat()} → {new_deadline.isoformat()})',
    )

    from apps.notifications.services import create_notification
    create_notification(
        mission.client,
        'mission_extended',
        'Mission prolongée',
        f'La mission « {mission.title} » a été prolongée jusqu\'au {new_deadline.strftime("%d/%m/%Y %H:%M")}.',
        mission=mission,
    )
    if mission.provider:
        create_notification(
            mission.provider,
            'mission_extended',
            'Mission prolongée',
            f'Le client a prolongé la mission « {mission.title} ».',
            mission=mission,
        )

    return {'ok': True, 'deadline': new_deadline.isoformat()}
