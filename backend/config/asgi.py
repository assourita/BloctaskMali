"""
ASGI config for BlockTask project.
It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Import routing after settings
django_asgi_app = get_asgi_application()

# WebSocket routing will be added here
# from apps.tracking import routing as tracking_routing
# from apps.notifications import routing as notifications_routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # "websocket": AuthMiddlewareStack(
    #     URLRouter(
    #         tracking_routing.websocket_urlpatterns +
    #         notifications_routing.websocket_urlpatterns
    #     )
    # ),
})
