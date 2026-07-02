from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/tracking/mission/(?P<mission_id>[0-9a-f-]+)/$',
        consumers.MissionGPSConsumer.as_asgi(),
    ),
    re_path(
        r'ws/tracking/enterprise/$',
        consumers.EnterpriseFleetGPSConsumer.as_asgi(),
    ),
]
