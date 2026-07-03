"""
BlockTask Django Settings
Configuration complète pour la plateforme décentralisée
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', os.getenv('SECRET_KEY', 'django-insecure-blocktask-dev-key'))

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = ['*'] if DEBUG else os.getenv('ALLOWED_HOSTS', '').split(',')

# Render injecte RENDER_EXTERNAL_HOSTNAME
render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'django_filters',
    'drf_spectacular',
]

LOCAL_APPS = [
    'apps.common',
    'apps.users',
    'apps.missions',
    'apps.payments',
    'apps.escrow',
    'apps.reputation',
    'apps.disputes',
    'apps.tracking',
    'apps.proofs',
    'apps.enterprises',
    'apps.notifications',
    'apps.analytics',
    'apps.chat',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'blocktask'),
        'USER': os.getenv('DB_USER', 'blocktask_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'blocktask_password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Render fournit DATABASE_URL : on l'utilise si présente
database_url = os.getenv('DATABASE_URL')
if database_url:
    DATABASES['default'] = dj_database_url.parse(database_url, conn_max_age=600, ssl_require=True)

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Bamako'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'BlockTask API',
    'DESCRIPTION': 'API plateforme de délégation de tâches avec escrow blockchain',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://localhost:4201",
    "http://127.0.0.1:4201",
    "http://localhost:4202",
    "http://127.0.0.1:4202",
    "http://localhost:4203",
    "http://127.0.0.1:4203",
    "http://localhost:4204",
    "http://127.0.0.1:4204",
    "http://localhost:4205",
    "http://127.0.0.1:4205",
    "http://localhost:4206",
    "http://127.0.0.1:4206",
    "http://localhost:4207",
    "http://127.0.0.1:4207",
    "http://localhost:4208",
    "http://127.0.0.1:4208",
    "http://localhost:4209",
    "http://127.0.0.1:4209",
]

# Ajouter dynamiquement les origines Render / prod via CORS_ALLOWED_ORIGINS
_extra_cors = os.getenv('CORS_ALLOWED_ORIGINS', '')
if _extra_cors:
    for origin in _extra_cors.split(','):
        origin = origin.strip()
        if origin and origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(origin)

CORS_ALLOW_CREDENTIALS = True

CHANNEL_LAYERS = (
    {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')],
            },
        },
    }
    if os.getenv('USE_REDIS_CHANNELS', '').lower() in ('1', 'true', 'yes')
    else {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
)

CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Blockchain Configuration
BLOCKCHAIN_CONFIG = {
    'ETHEREUM_RPC_URL': os.getenv('ETHEREUM_RPC_URL', 'https://sepolia.infura.io/v3/YOUR_KEY'),
    'ESCROW_CONTRACT_ADDRESS': os.getenv('ESCROW_CONTRACT_ADDRESS', ''),
    'REPUTATION_CONTRACT_ADDRESS': os.getenv('REPUTATION_CONTRACT_ADDRESS', ''),
    'LITIGATION_CONTRACT_ADDRESS': os.getenv('LITIGATION_CONTRACT_ADDRESS', ''),
    'CHAIN_ID': int(os.getenv('CHAIN_ID', os.getenv('ETHEREUM_CHAIN_ID', '11155111'))),
}
ETHEREUM_RPC_URL = BLOCKCHAIN_CONFIG['ETHEREUM_RPC_URL']
BLOCKCHAIN_RELAYER_PRIVATE_KEY = os.getenv('BLOCKCHAIN_RELAYER_PRIVATE_KEY', '')
BLOCKCHAIN_RELAYER_ADDRESS = os.getenv('BLOCKCHAIN_RELAYER_ADDRESS', '')

# Email
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', '')
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@blocktask.ml')
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:4200')
REQUIRE_EMAIL_VERIFICATION = os.getenv('REQUIRE_EMAIL_VERIFICATION', 'True').lower() == 'true'

# Google OAuth (Console Google Cloud → Identifiants OAuth 2.0 → Client Web)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', '')

# Mobile Money APIs (Mali / UEMOA)
MOBILE_MONEY_CONFIG = {
    'SANDBOX': os.getenv('MOBILE_MONEY_SANDBOX', 'True').lower() == 'true',
    'ORANGE_MONEY_API_KEY': os.getenv('ORANGE_MONEY_API_KEY', ''),
    'ORANGE_MONEY_MERCHANT_ID': os.getenv('ORANGE_MONEY_MERCHANT_ID', ''),
    'ORANGE_MONEY_API_URL': os.getenv('ORANGE_MONEY_API_URL', ''),
    'MOOV_MONEY_API_KEY': os.getenv('MOOV_MONEY_API_KEY', ''),
    'MOOV_MONEY_API_URL': os.getenv('MOOV_MONEY_API_URL', ''),
    'WAVE_API_KEY': os.getenv('WAVE_API_KEY', ''),
    'PAYMENT_RETURN_URL': os.getenv('PAYMENT_RETURN_URL', 'http://localhost:4200/client/missions'),
    'PAYMENT_CANCEL_URL': os.getenv('PAYMENT_CANCEL_URL', 'http://localhost:4200/client/missions'),
    'PAYMENT_WEBHOOK_URL': os.getenv('PAYMENT_WEBHOOK_URL', ''),
}

AUTH_USER_MODEL = 'users.User'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
