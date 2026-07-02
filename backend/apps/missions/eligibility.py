from apps.users.kyc_access import can_access_platform
from apps.users.models import User
from apps.users.roles import can_act_as_provider, get_effective_role

from .models import Mission
from .requirements import mission_requires_id_verification


def provider_can_apply_to_mission(user, mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if not can_act_as_provider(user):
        return False
    if get_effective_role(user) != 'provider':
        return False
    if not can_access_platform(user):
        return False
    if mission.status != Mission.Status.FUNDED:
        return False
    if mission.provider_id:
        return False
    if mission.applications.filter(provider=user).exists():
        return False
    if mission.requires_verified_provider and user.kyc_status != User.KYCStatus.VERIFIED:
        return False
    if mission_requires_id_verification(mission) and user.kyc_status != User.KYCStatus.VERIFIED:
        return False
    try:
        return user.provider_profile.is_available
    except Exception:
        return False


def can_apply_to_mission(user, mission) -> bool:
    """Prestataire indépendant ou entreprise (gérant)."""
    if getattr(user, 'user_type', '') == User.UserType.ENTERPRISE:
        from apps.users.enterprise_services import enterprise_can_apply
        return enterprise_can_apply(user, mission)
    return provider_can_apply_to_mission(user, mission)
