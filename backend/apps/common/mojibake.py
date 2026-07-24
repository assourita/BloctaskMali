"""Détection et correction du mojibake (UTF-8 mal interprété en Latin-1/CP1252).

Exemples :
  "M\\u00c3\\u00a9nage" (MÃ©nage) → "Ménage"
  "R\\u00c3\\u00a9paration" → "Réparation"
"""
from __future__ import annotations

from typing import Any, Optional

# Séquences typiques : octet UTF-8 de tête (C2/C3/E2) relu en Latin-1
# Définis uniquement via escapes pour éviter les problèmes d'encodage du fichier source.
MOJIBAKE_MARKERS = (
    '\u00c3\u00a9',  # é
    '\u00c3\u00a8',  # è
    '\u00c3\u00a0',  # à
    '\u00c3\u00a2',  # â
    '\u00c3\u00aa',  # ê
    '\u00c3\u00ae',  # î
    '\u00c3\u00b4',  # ô
    '\u00c3\u00bb',  # û
    '\u00c3\u00a7',  # ç
    '\u00c3\u00b9',  # ù
    '\u00c3\u00bc',  # ü
    '\u00c3\u00b6',  # ö
    '\u00c3\u00a4',  # ä
    '\u00c3\u00af',  # ï
    '\u00c3\u00ab',  # ë
    '\u00c3\u0089',  # É (latin-1 0xC3 0x89)
    '\u00c3\u0088',  # È
    '\u00c3\u0080',  # À
    '\u00c3\u00a1',  # á
    '\u00c3\u00ad',  # í
    '\u00c3\u00b3',  # ó
    '\u00c3\u00ba',  # ú
    '\u00c3\u00b1',  # ñ
    '\u00c2\u00ab',  # «
    '\u00c2\u00bb',  # »
    '\u00c2\u00b0',  # °
    '\u00c2\u00a0',  # nbsp
    '\u00e2\u0080\u0099',  # ’
    '\u00e2\u0080\u0098',  # ‘
    '\u00e2\u0080\u009c',  # “
    '\u00e2\u0080\u009d',  # ”
    '\u00e2\u0080\u0094',  # —
    '\u00e2\u0080\u0093',  # –
    '\u00e2\u0080\u00a6',  # …
)

# Champs à ne jamais toucher (secrets / hashes / tokens)
SKIP_FIELD_NAMES = {
    'password', 'password_hash', 'secret', 'secret_key', 'token',
    'access_token', 'refresh_token', 'api_key', 'private_key',
    'signature', 'tx_hash', 'mission_hash', 'qr_code_data',
}


def looks_mojibake(value: str) -> bool:
    if not value or not isinstance(value, str):
        return False
    if any(m in value for m in MOJIBAKE_MARKERS):
        return True
    # Heuristique large : présence de Ã / Â / â€ souvent issus d'un mauvais décodage
    if '\u00c3' in value or '\u00c2\u00a0' in value or '\u00e2\u0080' in value:
        return fix_mojibake(value) is not None
    return False


def _mojibake_score(value: str) -> int:
    """Plus le score est bas, plus la chaîne ressemble à du mojibake."""
    score = 0
    score += value.count('\u00c3') * 3
    score += value.count('\u00c2') * 2
    score += value.count('\ufffd') * 5
    for marker in MOJIBAKE_MARKERS:
        score += value.count(marker) * 4
    return score


def fix_mojibake(value: str) -> Optional[str]:
    """Corrige une chaîne mojibake. Retourne None si aucune correction utile."""
    if not value or not isinstance(value, str):
        return None

    best = value
    best_score = _mojibake_score(value)

    for encoding in ('latin-1', 'cp1252'):
        current = value
        for _ in range(2):  # jusqu'à double encodage
            try:
                candidate = current.encode(encoding).decode('utf-8')
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
            if candidate == current:
                break
            cand_score = _mojibake_score(candidate)
            if cand_score < best_score or (
                cand_score == best_score and candidate != value and len(candidate) < len(best)
            ):
                best = candidate
                best_score = cand_score
            current = candidate

    if best != value and best_score < _mojibake_score(value):
        return best
    return None


def walk_fix_json(data: Any) -> tuple[Any, bool]:
    """Parcourt récursivement dict/list et corrige les strings mojibake."""
    changed = False
    if isinstance(data, str):
        fixed = fix_mojibake(data)
        if fixed is not None:
            return fixed, True
        return data, False
    if isinstance(data, list):
        out = []
        for item in data:
            new_item, ch = walk_fix_json(item)
            changed = changed or ch
            out.append(new_item)
        return out, changed
    if isinstance(data, dict):
        out = {}
        for key, item in data.items():
            new_item, ch = walk_fix_json(item)
            changed = changed or ch
            out[key] = new_item
        return out, changed
    return data, False


def should_skip_field(field_name: str) -> bool:
    name = field_name.lower()
    if name in SKIP_FIELD_NAMES:
        return True
    if name.endswith('_hash') or name.endswith('_token') or name.endswith('_secret'):
        return True
    return False
