"""Accès profil contrepartie et règles mission actives."""
from apps.missions.models import Mission

ACTIVE_COUNTERPARTY_STATUSES = {
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
    Mission.Status.COMPLETED,
}


def mission_is_active_for_counterparty(mission) -> bool:
    return mission.status in ACTIVE_COUNTERPARTY_STATUSES


def user_is_mission_participant(user, mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if mission.client_id == user.id:
        return True
    if mission.provider_id == user.id:
        return True
    ent = getattr(mission, 'assigned_enterprise', None)
    if ent and ent.user_id == user.id:
        return True
    return False


def can_view_counterparty_profile(user, mission) -> bool:
    if not mission_is_active_for_counterparty(mission):
        return False
    if not user_is_mission_participant(user, mission):
        return False
    if mission.client_id == user.id:
        return bool(mission.provider_id or mission.assigned_enterprise_id)
    return True


def get_counterparty_user(mission, viewer):
    """Utilisateur « autre partie » vu par viewer (client ↔ prestataire / entreprise)."""
    if not viewer or not viewer.is_authenticated:
        return None
    if mission.client_id == viewer.id:
        if mission.provider_id:
            return mission.provider
        ent = getattr(mission, 'assigned_enterprise', None)
        return ent.user if ent else None
    if mission.provider_id == viewer.id:
        return mission.client
    ent = getattr(mission, 'assigned_enterprise', None)
    if ent and ent.user_id == viewer.id:
        return mission.client
    return None
