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
    Ne pas utiliser si la mission est en cours ou soumise (litige requis) —
    sauf via provider_cancel_in_progress.
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

    return _finalize_cancel_with_refunds(
        mission,
        changed_by=changed_by,
        reason=reason,
        new_status=new_status,
        forfeit_deposit=False,
    )


def provider_cancel_in_progress(
    mission,
    *,
    changed_by,
    reason: str = '',
) -> dict:
    """
    Annulation par le prestataire d'une mission en cours.
    - Rembourse le client (fonds escrow)
    - Confisque la caution prestataire (pénalité d'abandon)
    """
    if mission.status != Mission.Status.IN_PROGRESS:
        return {
            'ok': False,
            'error': (
                'Seul une mission en cours peut être annulée par le prestataire. '
                'Après soumission des preuves, ouvrez un litige.'
            ),
        }
    if not mission.provider_id or mission.provider_id != getattr(changed_by, 'id', None):
        return {'ok': False, 'error': 'Seul le prestataire assigné peut annuler cette mission'}

    return _finalize_cancel_with_refunds(
        mission,
        changed_by=changed_by,
        reason=reason or 'Annulation par le prestataire — mission abandonnée en cours d\'exécution',
        new_status=Mission.Status.CANCELLED,
        forfeit_deposit=True,
    )


def _finalize_cancel_with_refunds(
    mission,
    *,
    changed_by,
    reason: str,
    new_status: str,
    forfeit_deposit: bool,
) -> dict:
    from apps.escrow.services import escrow_service

    old_status = mission.status
    client_refund = None
    deposit_refund = False
    deposit_forfeited = False

    if mission.status in (
        Mission.Status.FUNDED,
        Mission.Status.ACCEPTED,
        Mission.Status.IN_PROGRESS,
    ):
        client_refund = escrow_service.refund_client(mission, reason=reason)

    if mission.provider and mission.deposit_paid:
        if forfeit_deposit:
            # Caution non restituée (pénalité)
            deposit_forfeited = True
            mission.deposit_paid = False
        else:
            deposit_refund = escrow_service.refund_provider_deposit(mission)
            mission.deposit_paid = False

    if mission.provider and old_status in (Mission.Status.ACCEPTED, Mission.Status.IN_PROGRESS):
        MissionApplication.objects.filter(
            mission=mission,
            provider=mission.provider,
            status=MissionApplication.Status.ACCEPTED,
        ).update(
            status=MissionApplication.Status.WITHDRAWN,
            responded_at=timezone.now(),
        )

    provider = mission.provider
    mission.status = new_status
    mission.expiry_decision_pending = False
    mission.expiry_decision_due_at = None
    mission.auto_validation_scheduled_at = None
    if new_status in (Mission.Status.CANCELLED, Mission.Status.EXPIRED):
        mission.provider = None
        mission.deposit_deadline = None
    mission.save(update_fields=[
        'status', 'deposit_paid', 'expiry_decision_pending', 'expiry_decision_due_at',
        'provider', 'deposit_deadline', 'auto_validation_scheduled_at', 'updated_at',
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
        'Mission annulée',
        reason,
    )
    if provider:
        deposit_msg = (
            'Votre caution a été confisquée (abandon en cours).'
            if deposit_forfeited
            else 'Votre caution a été restituée.'
        )
        create_notification(
            provider,
            'mission_cancelled',
            'Mission annulée',
            f'La mission « {mission.title} » a été annulée. {deposit_msg}',
            mission=mission,
        )

    return {
        'ok': True,
        'client_refund': client_refund,
        'deposit_refunded': deposit_refund,
        'deposit_forfeited': deposit_forfeited,
        'status': new_status,
    }


DEFAULT_AUTO_VALIDATION_HOURS = 48


def schedule_auto_validation(mission) -> None:
    """Planifie la validation auto après soumission des preuves."""
    delay_h = mission.auto_validation_delay or DEFAULT_AUTO_VALIDATION_HOURS
    if delay_h < DEFAULT_AUTO_VALIDATION_HOURS:
        delay_h = DEFAULT_AUTO_VALIDATION_HOURS
    mission.auto_validation_delay = delay_h
    mission.auto_validation_scheduled_at = timezone.now() + timedelta(hours=delay_h)
    mission.save(update_fields=['auto_validation_delay', 'auto_validation_scheduled_at', 'updated_at'])


def complete_mission_and_payout(mission, *, changed_by=None, reason: str = '') -> dict:
    """
    Passe SUBMITTED → COMPLETED et libère le paiement prestataire.
    Utilisé par validation client et auto-validation 48h.
    """
    if mission.status != Mission.Status.SUBMITTED:
        return {'ok': False, 'error': 'La mission doit être en statut soumise'}

    # Litige ouvert → pas d'auto-paiement
    if mission.disputes.filter(status__in=['open', 'under_review', 'pending_evidence', 'arbitration']).exists():
        return {'ok': False, 'error': 'Litige ouvert — validation bloquée', 'dispute_open': True}

    old_status = mission.status
    mission.status = Mission.Status.COMPLETED
    mission.completed_at = timezone.now()
    mission.auto_validation_scheduled_at = None
    if mission.final_price is None:
        mission.final_price = mission.budget
    mission.save(update_fields=[
        'status', 'completed_at', 'final_price', 'auto_validation_scheduled_at', 'updated_at',
    ])

    if mission.provider_id and hasattr(mission.provider, 'provider_profile'):
        from django.db.models import Sum, F, Value, DecimalField
        from django.db.models.functions import Coalesce
        profile = mission.provider.provider_profile
        completed = Mission.objects.filter(
            provider=mission.provider, status=Mission.Status.COMPLETED,
        )
        profile.total_missions_completed = completed.count()
        profile.total_earnings = completed.aggregate(
            t=Sum(Coalesce(
                F('final_price'), F('budget'), Value(0),
                output_field=DecimalField(max_digits=15, decimal_places=2),
            ))
        )['t'] or 0
        profile.save(update_fields=['total_missions_completed', 'total_earnings'])

    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=old_status,
        new_status=Mission.Status.COMPLETED,
        changed_by=changed_by or mission.client,
        reason=reason or 'Mission validée',
    )

    from apps.payments.mobile_money import MobileMoneyService, MobileMoneyError
    from apps.escrow.services import escrow_service

    payment = getattr(mission, 'payment', None)
    payout = None
    payout_error = None
    if payment:
        try:
            payout = MobileMoneyService.release_to_provider(payment)
        except MobileMoneyError as exc:
            payout_error = str(exc)

    blockchain_release = escrow_service.release_payment_to_provider(mission)
    if blockchain_release:
        payout = {**(payout or {}), **blockchain_release}

    # Restituer caution prestataire si encore bloquée
    if mission.provider and mission.deposit_paid:
        escrow_service.release_provider_deposit(mission)
        mission.deposit_paid = False
        mission.save(update_fields=['deposit_paid', 'updated_at'])

    from apps.notifications.services import notify_mission_event, create_notification
    if mission.provider:
        notify_mission_event(
            mission, 'completed', mission.provider,
            'Mission validée',
            reason or f'La mission « {mission.title} » a été validée — paiement en cours.',
        )
    create_notification(
        mission.client,
        'completed',
        'Mission terminée',
        reason or f'La mission « {mission.title} » est terminée.',
        mission=mission,
    )

    return {
        'ok': True,
        'payout': payout,
        'payout_error': payout_error,
        'status': Mission.Status.COMPLETED,
    }


def process_auto_validations() -> dict:
    """Valide automatiquement les missions soumises dont le délai client est dépassé."""
    now = timezone.now()
    due = Mission.objects.filter(
        status=Mission.Status.SUBMITTED,
        auto_validation_scheduled_at__lte=now,
    ).select_related('client', 'provider', 'payment')

    stats = {'validated': 0, 'skipped_dispute': 0, 'errors': 0}
    for mission in due:
        result = complete_mission_and_payout(
            mission,
            changed_by=mission.client,
            reason=(
                f'Validation automatique après {mission.auto_validation_delay or DEFAULT_AUTO_VALIDATION_HOURS}h '
                f'sans action du client — paiement libéré au prestataire'
            ),
        )
        if result.get('ok'):
            stats['validated'] += 1
        elif result.get('dispute_open'):
            stats['skipped_dispute'] += 1
        else:
            stats['errors'] += 1
    return stats


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
