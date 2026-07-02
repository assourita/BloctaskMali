"""Vérification de complétion du profil utilisateur."""
from apps.users.models import EnterpriseProfile
from apps.users.roles import get_effective_role

KYC_FIELDS = ('nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'phone_verified')


def _kyc_missing_fields(user) -> list[str]:
    missing: list[str] = []
    if not user.nina:
        missing.append('nina')
    if not user.id_card_front:
        missing.append('id_card_front')
    if not user.id_card_back:
        missing.append('id_card_back')
    if not user.selfie_verification:
        missing.append('selfie_verification')
    if not user.phone_verified:
        missing.append('phone_verified')
    return missing


def get_profile_missing_fields(user, role: str | None = None) -> list[str]:
    """Champs manquants pour le rôle actif (espace courant)."""
    role = role or get_effective_role(user)
    missing: list[str] = []

    if role in ('client', 'provider', 'enterprise'):
        missing.extend(_kyc_missing_fields(user))

    if role in ('client', 'provider'):
        if not user.phone_number:
            missing.append('phone_number')
        if not user.city:
            missing.append('city')
        if not user.address:
            missing.append('address')

    if role == 'provider':
        profile = getattr(user, 'provider_profile', None)
        if profile is None:
            missing.append('provider_profile')
        else:
            if not profile.skills:
                missing.append('skills')
            if not profile.categories:
                missing.append('categories')

        from apps.payments.models import UserPaymentMethod
        if not UserPaymentMethod.objects.filter(user=user, is_active=True).exists():
            missing.append('payment_method')

    if role == 'enterprise':
        try:
            enterprise = user.enterprise_profile
        except EnterpriseProfile.DoesNotExist:
            enterprise = None
        if enterprise is None:
            missing.append('enterprise_profile')
        else:
            if not enterprise.company_name:
                missing.append('company_name')
            if not enterprise.address:
                missing.append('address')
            if not enterprise.city:
                missing.append('city')
            if not (enterprise.company_phone or user.phone_number):
                missing.append('company_phone')

    return missing


def is_profile_complete(user, role: str | None = None) -> bool:
    if user.user_type == 'admin' or user.is_staff:
        return True
    return len(get_profile_missing_fields(user, role=role)) == 0
