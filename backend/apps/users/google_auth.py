"""Authentification Google OAuth (validation id_token)."""
import logging
import uuid

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()

ALLOWED_GOOGLE_USER_TYPES = {User.UserType.CLIENT, User.UserType.PROVIDER, User.UserType.ENTERPRISE}


def verify_google_id_token(id_token: str) -> dict:
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    if not client_id:
        raise ValueError('Google OAuth non configuré sur le serveur.')

    resp = requests.get(
        'https://oauth2.googleapis.com/tokeninfo',
        params={'id_token': id_token},
        timeout=15,
    )
    if resp.status_code != 200:
        raise ValueError('Token Google invalide ou expiré.')

    payload = resp.json()
    aud = payload.get('aud') or payload.get('azp')
    if aud != client_id:
        raise ValueError('Token Google non émis pour cette application.')

    email_verified = payload.get('email_verified')
    if str(email_verified).lower() not in ('true', '1'):
        raise ValueError('Email Google non vérifié.')

    if not payload.get('email') or not payload.get('sub'):
        raise ValueError('Profil Google incomplet.')

    return payload


def _unique_username(base: str) -> str:
    base = (base or 'user').replace('@', '_').replace('.', '_')[:24]
    candidate = base
    n = 0
    while User.objects.filter(username=candidate).exists():
        n += 1
        candidate = f'{base}{n}'[:30]
    return candidate


@transaction.atomic
def authenticate_or_register_google_user(payload: dict, user_type: str = 'client') -> tuple[User, bool]:
    """Retourne (user, created)."""
    google_id = payload['sub']
    email = payload['email'].lower().strip()
    first_name = (payload.get('given_name') or '').strip() or email.split('@')[0]
    last_name = (payload.get('family_name') or '').strip()

    if user_type not in ALLOWED_GOOGLE_USER_TYPES:
        user_type = User.UserType.CLIENT

    user = User.objects.filter(google_id=google_id).first()
    if user:
        user.email_verified = True
        user.save(update_fields=['email_verified', 'updated_at'])
        return user, False

    user = User.objects.filter(email__iexact=email).first()
    if user:
        user.google_id = google_id
        user.email_verified = True
        if not user.first_name:
            user.first_name = first_name
        if not user.last_name:
            user.last_name = last_name
        user.save(update_fields=['google_id', 'email_verified', 'first_name', 'last_name', 'updated_at'])
        return user, False

    username = _unique_username(email.split('@')[0])
    user = User.objects.create_user(
        username=username,
        email=email,
        password=uuid.uuid4().hex,
        first_name=first_name,
        last_name=last_name,
        user_type=user_type,
        email_verified=True,
        google_id=google_id,
    )
    user.set_unusable_password()
    user.save(update_fields=['password'])

    if user_type == User.UserType.PROVIDER:
        from .models import ProviderProfile
        ProviderProfile.objects.get_or_create(user=user, defaults={})
    elif user_type == User.UserType.ENTERPRISE:
        from .models import EnterpriseProfile
        from .enterprise_helpers import enterprise_profile_defaults
        EnterpriseProfile.objects.get_or_create(
            user=user,
            defaults=enterprise_profile_defaults(user),
        )

    return user, True
