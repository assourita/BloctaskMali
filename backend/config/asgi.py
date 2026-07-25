"""
ASGI config for BlockTask project.
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from django.conf import settings  # noqa: E402
from apps.tracking.routing import websocket_urlpatterns  # noqa: E402
from apps.common.websocket_auth import JwtAuthMiddlewareStack  # noqa: E402

websocket_app = JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))

# En DEBUG, ne pas bloquer les origines locales (Angular :4200 → API :8000)
if not settings.DEBUG:
    websocket_app = AllowedHostsOriginValidator(websocket_app)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": websocket_app,
})
