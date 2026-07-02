from apps.users.kyc_access import can_access_platform
from apps.users.models import User
from apps.users.roles import can_act_as_provider, get_effective_role

from .models import Mission
from .requirements import mission_requires_id_verification


def mission_is_open_for_applications(mission) -> bool:
    """Mission ouverte aux candidatures : financée, sans prestataire ni entreprise assignée."""
    if mission.status != Mission.Status.FUNDED:
        return False
    if mission.provider_id:
        return False
    if getattr(mission, 'assigned_enterprise_id', None):
        return False
    return True


def provider_can_apply_to_mission(user, mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if not can_act_as_provider(user):
        return False
    if get_effective_role(user) != 'provider':
        return False
    if not can_access_platform(user):
        return False
    if not mission_is_open_for_applications(mission):
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


def get_apply_block_reason(user, mission) -> str | None:
    """Code explicite pour l'UI (mobile/web) quand can_apply est False."""
    if not user or not user.is_authenticated:
        return 'auth_required'
    if mission.applications.filter(provider=user).exists():
        return 'already_applied'
    if mission.provider_id or getattr(mission, 'assigned_enterprise_id', None):
        return 'assigned'
    if mission.status != Mission.Status.FUNDED:
        return 'closed'
    if getattr(user, 'user_type', '') == User.UserType.ENTERPRISE:
        from apps.users.enterprise_services import enterprise_can_apply
        if enterprise_can_apply(user, mission):
            return None
        if mission.client_id == user.id:
            return 'own_mission'
        return 'enterprise_ineligible'
    if not can_act_as_provider(user) or get_effective_role(user) != 'provider':
        return 'wrong_role'
    if not can_access_platform(user):
        return 'kyc_incomplete'
    if mission.requires_verified_provider and user.kyc_status != User.KYCStatus.VERIFIED:
        return 'kyc_required'
    if mission_requires_id_verification(mission) and user.kyc_status != User.KYCStatus.VERIFIED:
        return 'kyc_required'
    try:
        if not user.provider_profile.is_available:
            return 'unavailable'
    except Exception:
        return 'profile_incomplete'
    return None


def can_apply_to_mission(user, mission) -> bool:
    """Prestataire indépendant ou entreprise (gérant)."""
    if getattr(user, 'user_type', '') == User.UserType.ENTERPRISE:
        from apps.users.enterprise_services import enterprise_can_apply
        return enterprise_can_apply(user, mission)
    return provider_can_apply_to_mission(user, mission)
