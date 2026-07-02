"""Réinitialisation de mot de passe par email."""
import logging

from django.conf import settings

from apps.common.email_service import send_platform_email
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)
User = get_user_model()


def encode_user_uid(user) -> str:
    return urlsafe_base64_encode(force_bytes(str(user.pk)))


def get_user_from_uid(uid: str):
    if not uid:
        return None
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=pk, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None


def build_password_reset_link(user) -> str:
    uid = encode_user_uid(user)
    token = default_token_generator.make_token(user)
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200').rstrip('/')
    return f'{frontend}/reset-password?uid={uid}&token={token}'


def send_password_reset_email(user) -> str:
    link = build_password_reset_link(user)
    subject = 'BlockTask — Réinitialisation de votre mot de passe'
    message = (
        f'Bonjour {user.get_full_name() or user.email},\n\n'
        'Vous avez demandé la réinitialisation de votre mot de passe BlockTask.\n'
        'Cliquez sur le lien ci-dessous (valide 24 heures) :\n\n'
        f'{link}\n\n'
        'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.\n\n'
        'L\'équipe BlockTask'
    )
    send_platform_email(
        to=user.email,
        subject=subject,
        message=message,
        fail_silently=False,
    )
    if settings.DEBUG:
        logger.info('Password reset link for %s: %s', user.email, link)
    return link
