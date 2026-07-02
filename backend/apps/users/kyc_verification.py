"""Simulation de vérification téléphone / NINA (en attendant une API officielle)."""
import random
import re

from django.core.cache import cache

OTP_TTL_SECONDS = 600


def _digits(value: str) -> str:
    return re.sub(r'\D', '', value or '')


def validate_nina_format(nina: str) -> bool:
    """NINA : au moins 8 caractères alphanumériques."""
    cleaned = re.sub(r'[\s\-]', '', nina or '')
    return len(cleaned) >= 8 and bool(re.match(r'^[A-Za-z0-9]+$', cleaned))


def validate_nina_phone_match(nina: str, phone_number: str) -> bool:
    """
    Simulation : les 4 derniers chiffres du NINA doivent correspondre
    aux 4 derniers chiffres du numéro de téléphone.
    """
    nina_digits = _digits(nina)
    phone_digits = _digits(phone_number)
    if len(nina_digits) < 4 or len(phone_digits) < 4:
        return False
    return nina_digits[-4:] == phone_digits[-4:]


def request_phone_verification(user, nina: str, phone_number: str) -> dict:
    if not validate_nina_format(nina):
        return {
            'ok': False,
            'error': 'Format NINA invalide (minimum 8 caractères alphanumériques).',
        }
    if not validate_nina_phone_match(nina, phone_number):
        return {
            'ok': False,
            'error': (
                'Le numéro ne correspond pas au NINA (simulation : les 4 derniers '
                'chiffres doivent être identiques).'
            ),
        }

    otp = f'{random.randint(100000, 999999)}'
    cache.set(
        f'kyc_otp_{user.pk}',
        {'otp': otp, 'nina': nina.strip(), 'phone_number': phone_number.strip()},
        OTP_TTL_SECONDS,
    )

    user.nina = nina.strip()
    user.phone_number = phone_number.strip()
    user.phone_verified = False
    user.save(update_fields=['nina', 'phone_number', 'phone_verified'])

    return {
        'ok': True,
        'message': 'Code de vérification envoyé par SMS (simulation).',
        'simulation_otp': otp,
        'expires_in_seconds': OTP_TTL_SECONDS,
    }


def confirm_phone_verification(user, otp: str) -> dict:
    cached = cache.get(f'kyc_otp_{user.pk}')
    if not cached:
        return {'ok': False, 'error': 'Code expiré ou demande introuvable. Relancez la vérification.'}

    if str(otp).strip() != str(cached['otp']):
        return {'ok': False, 'error': 'Code incorrect.'}

    user.nina = cached['nina']
    user.phone_number = cached['phone_number']
    user.phone_verified = True
    user.save(update_fields=['nina', 'phone_number', 'phone_verified'])
    cache.delete(f'kyc_otp_{user.pk}')

    return {
        'ok': True,
        'message': 'Téléphone vérifié et lié au NINA.',
        'phone_verified': True,
    }
