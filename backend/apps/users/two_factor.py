"""Authentification à deux facteurs (TOTP) — compatible Google Authenticator."""
import base64
import io
import secrets

import pyotp
import qrcode

from django.conf import settings


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(user, secret: str) -> str:
    issuer = getattr(settings, 'PLATFORM_NAME', 'BlockTask')
    return pyotp.TOTP(secret).provisioning_uri(
        name=user.email or user.username,
        issuer_name=issuer,
    )


def qr_code_data_url(uri: str) -> str:
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    encoded = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/png;base64,{encoded}'


def verify_totp(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    clean = str(code).strip().replace(' ', '')
    totp = pyotp.TOTP(secret)
    return totp.verify(clean, valid_window=1)


def generate_backup_codes(count: int = 8) -> list[str]:
    return [secrets.token_hex(4).upper() for _ in range(count)]
