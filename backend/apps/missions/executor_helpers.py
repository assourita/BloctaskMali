"""Helpers multi-exécutants mission (équipe / employé)."""


def user_is_mission_executor(user, mission) -> bool:
    """True si l'utilisateur est le provider (chef) ou un membre affecté non refusé."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_staff', False) or getattr(user, 'user_type', '') == 'admin':
        return True
    if mission.provider_id and mission.provider_id == user.id:
        return True
    from apps.enterprises.models import EmployeeAssignment
    return EmployeeAssignment.objects.filter(
        mission=mission,
        employee__user=user,
        rejected_at__isnull=True,
    ).exists()


def payout_recipient_user(mission):
    """Destinataire du paiement : compte entreprise si mission entreprise, sinon provider."""
    if getattr(mission, 'assigned_enterprise_id', None) and mission.assigned_enterprise:
        return mission.assigned_enterprise.user
    return mission.provider
