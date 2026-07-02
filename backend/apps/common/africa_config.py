"""
Configuration marché BlockTask — Mali uniquement (phase 1).
Les autres pays d'Afrique seront ajoutés ultérieurement.
"""

DEFAULT_COUNTRY = 'Mali'
DEFAULT_COUNTRY_CODE = 'ML'
DEFAULT_PHONE_PREFIX = '+223'
DEFAULT_TIMEZONE = 'Africa/Bamako'
DEFAULT_CURRENCY = 'XOF'
MARKET_SCOPE = 'mali'

# Coordonnées par défaut (Bamako)
DEFAULT_MAP_CENTER = {'lat': 12.6392, 'lng': -8.0029}

MALI_CITIES = [
    'Bamako', 'Ségou', 'Mopti', 'Sikasso', 'Kayes', 'Gao',
    'Koutiala', 'Kati', 'Markala', 'Tombouctou', 'San', 'Bougouni',
]

MALI_CONFIG = {
    'code': 'ML',
    'name': 'Mali',
    'phone_prefix': '+223',
    'timezone': 'Africa/Bamako',
    'currency': 'XOF',
    'id_label': 'NINA',
    'cities': MALI_CITIES,
    'mobile_money_operators': ['orange', 'moov'],
}

# Alias rétrocompatibilité API
UEMOA_COUNTRIES = [MALI_CONFIG]

MOBILE_MONEY_OPERATORS = {
    'orange': {'id': 'orange', 'name': 'Orange Money Mali', 'color': '#FF6600'},
    'moov': {'id': 'moov', 'name': 'Moov Money Mali', 'color': '#4169E1'},
}


def get_country_by_code(code: str) -> dict | None:
    if code.upper() == 'ML':
        return MALI_CONFIG
    return None


def get_country_by_name(name: str) -> dict | None:
    if name.lower() in ('mali', 'ml'):
        return MALI_CONFIG
    return None


def get_operators_for_country(country_code: str | None = None) -> list[dict]:
    return [
        MOBILE_MONEY_OPERATORS[op]
        for op in MALI_CONFIG['mobile_money_operators']
        if op in MOBILE_MONEY_OPERATORS
    ]


def get_market_config() -> dict:
    """Configuration marché exposée via l'API (Mali)."""
    return {
        'market_scope': MARKET_SCOPE,
        'default_country': DEFAULT_COUNTRY,
        'default_country_code': DEFAULT_COUNTRY_CODE,
        'default_phone_prefix': DEFAULT_PHONE_PREFIX,
        'default_timezone': DEFAULT_TIMEZONE,
        'default_currency': DEFAULT_CURRENCY,
        'default_map_center': DEFAULT_MAP_CENTER,
        'id_label': 'NINA',
        'countries': [MALI_CONFIG],
        'mobile_money_operators': MOBILE_MONEY_OPERATORS,
        'payment_methods': ['mobile_money'],
        'blockchain_mode': 'hybrid',
        'blockchain_note': (
            'Paiement en FCFA via Orange/Moov Money, '
            'ancrage escrow optionnel sur Sepolia (testnet).'
        ),
    }
