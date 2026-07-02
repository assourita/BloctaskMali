"""Contrôle d'accès plateforme selon le statut KYC admin."""
from apps.users.models import User
from apps.users.roles import get_effective_role

from .profile_completion import is_profile_complete

KYC_ACCESS_INCOMPLETE = 'incomplete'
KYC_ACCESS_PENDING = 'pending_review'
KYC_ACCESS_REJECTED = 'rejected'
KYC_ACCESS_APPROVED = 'approved'

KYC_BLOCK_MESSAGES = {
    KYC_ACCESS_INCOMPLETE: (
        'Complétez votre vérification d\'identité (NINA, téléphone, documents) '
        'pour accéder à la plateforme.'
    ),
    KYC_ACCESS_PENDING: (
        'Votre identité est en cours de validation par l\'équipe BlockTask. '
        'L\'accès complet sera débloqué après approbation.'
    ),
    KYC_ACCESS_REJECTED: (
        'Votre vérification d\'identité a été rejetée. '
        'Corrigez vos documents et resoumettez votre dossier KYC.'
    ),
}


def _require_kyc() -> bool:
    from apps.common.models import PlatformSettings
    return PlatformSettings.get_solo().require_kyc


def get_kyc_access_status(user, role: str | None = None) -> str:
    if user.user_type == User.UserType.ADMIN or user.is_staff:
        return KYC_ACCESS_APPROVED

    if not _require_kyc():
        if is_profile_complete(user, role=role):
            return KYC_ACCESS_APPROVED
        return KYC_ACCESS_INCOMPLETE

    if not is_profile_complete(user, role=role):
        return KYC_ACCESS_INCOMPLETE

    if user.kyc_status == User.KYCStatus.VERIFIED:
        return KYC_ACCESS_APPROVED
    if user.kyc_status == User.KYCStatus.REJECTED:
        return KYC_ACCESS_REJECTED
    if user.kyc_status == User.KYCStatus.PENDING:
        return KYC_ACCESS_PENDING

    return KYC_ACCESS_PENDING


def can_access_platform(user, role: str | None = None) -> bool:
    return get_kyc_access_status(user, role=role) == KYC_ACCESS_APPROVED


def get_kyc_block_message(user, role: str | None = None) -> str:
    status = get_kyc_access_status(user, role=role)
    base = KYC_BLOCK_MESSAGES.get(status, KYC_BLOCK_MESSAGES[KYC_ACCESS_INCOMPLETE])
    if status == KYC_ACCESS_REJECTED:
        reason = (getattr(user, 'kyc_rejection_reason', '') or '').strip()
        if reason:
            return f'{base} Motif : {reason}'
    return base


def kyc_access_payload(user, role: str | None = None) -> dict:
    role = role or get_effective_role(user)
    status = get_kyc_access_status(user, role=role)
    return {
        'kyc_access_status': status,
        'can_access_platform': status == KYC_ACCESS_APPROVED,
        'kyc_block_message': get_kyc_block_message(user, role=role) if status != KYC_ACCESS_APPROVED else '',
    }


def sync_trust_identity(user, *, identity_verified: bool) -> None:
    from apps.reputation.models import TrustFactor

    tf, _ = TrustFactor.objects.get_or_create(user=user)
    tf.identity_verified = identity_verified
    tf.phone_verified = bool(user.phone_verified)
    tf.email_verified = bool(user.email_verified)
    tf.save(update_fields=['identity_verified', 'phone_verified', 'email_verified', 'updated_at'])


def handle_kyc_status_change(user, old_status: str, new_status: str) -> None:
    """Notifications + réputation après décision admin (post_save uniquement)."""
    from apps.notifications.models import Notification
    from apps.notifications.services import create_notification

    role = get_effective_role(user)
    profile_path = f'/{role}/profile'

    if new_status == User.KYCStatus.VERIFIED and old_status != User.KYCStatus.VERIFIED:
        sync_trust_identity(user, identity_verified=True)
        create_notification(
            user=user,
            notification_type=Notification.Type.KYC_VERIFIED,
            title='Identité vérifiée',
            message=(
                'Félicitations ! Votre identité a été validée. '
                'Vous avez maintenant accès à toutes les fonctionnalités BlockTask.'
            ),
            action_url=profile_path,
            priority='high',
        )
    elif new_status == User.KYCStatus.REJECTED and old_status != User.KYCStatus.REJECTED:
        sync_trust_identity(user, identity_verified=False)
        reason = (getattr(user, 'kyc_rejection_reason', '') or '').strip()
        message = (
            f'Votre dossier KYC a été rejeté. Motif : {reason}. '
            'Consultez votre profil, corrigez vos documents et soumettez à nouveau.'
            if reason else
            'Votre dossier KYC a été rejeté. Consultez votre profil, '
            'corrigez vos documents et soumettez à nouveau.'
        )
        create_notification(
            user=user,
            notification_type=Notification.Type.KYC_REJECTED,
            title='Vérification d\'identité rejetée',
            message=message,
            action_url=f'{profile_path}?kyc=rejected',
            priority='high',
        )
