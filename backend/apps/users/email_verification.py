"""Vérification d'adresse email à l'inscription."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator

from apps.common.email_service import send_platform_email
from .password_reset import encode_user_uid, get_user_from_uid

logger = logging.getLogger(__name__)
User = get_user_model()

DISPOSABLE_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com',
    '10minutemail.com', 'throwaway.email', 'trashmail.com',
}


def is_disposable_email(email: str) -> bool:
    domain = (email or '').split('@')[-1].lower().strip()
    return domain in DISPOSABLE_DOMAINS


def build_email_verification_link(user) -> str:
    uid = encode_user_uid(user)
    token = default_token_generator.make_token(user)
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200').rstrip('/')
    return f'{frontend}/verify-email?uid={uid}&token={token}'


def send_verification_email(user) -> str:
    link = build_email_verification_link(user)
    subject = 'BlockTask — Confirmez votre adresse email'
    name = user.get_full_name() or user.email
    message = (
        f'Bonjour {name},\n\n'
        'Bienvenue sur BlockTask ! Confirmez votre adresse email en cliquant sur le lien ci-dessous '
        '(valide 24 heures) :\n\n'
        f'{link}\n\n'
        'Si vous n\'avez pas créé de compte, ignorez cet email.\n\n'
        'L\'équipe BlockTask'
    )
    html = (
        f'<p>Bonjour {name},</p>'
        '<p>Bienvenue sur <strong>BlockTask</strong> ! Confirmez votre adresse email :</p>'
        f'<p><a href="{link}">Activer mon compte</a></p>'
        f'<p style="color:#666;font-size:12px">Ou copiez ce lien : {link}</p>'
    )
    send_platform_email(
        to=user.email,
        subject=subject,
        message=message,
        html=html,
        fail_silently=False,
    )
    if settings.DEBUG:
        logger.info('Email verification link for %s: %s', user.email, link)
    return link


def verify_email(uid: str, token: str) -> tuple[bool, str, User | None]:
    user = get_user_from_uid(uid)
    if not user:
        return False, 'Lien invalide ou compte introuvable.', None
    if user.email_verified:
        return True, 'Votre email est déjà vérifié.', user
    if not default_token_generator.check_token(user, token):
        return False, 'Lien expiré ou invalide. Demandez un nouvel email de vérification.', None

    user.email_verified = True
    user.save(update_fields=['email_verified', 'updated_at'])

    from .kyc_access import sync_trust_identity
    sync_trust_identity(user, identity_verified=user.kyc_status == User.KYCStatus.VERIFIED)

    return True, 'Email vérifié avec succès. Vous pouvez vous connecter.', user


def email_verification_required(user) -> bool:
    if not getattr(settings, 'REQUIRE_EMAIL_VERIFICATION', True):
        return False
    if user.is_staff or getattr(user, 'user_type', '') == 'admin':
        return False
    return not user.email_verified
