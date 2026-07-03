from django.urls import path
from .views import (
    landing_data, market_config, platform_settings,
    map_presence, map_update_location, map_user_detail,
    health_check,
)

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('market-config/', market_config, name='market-config'),
    path('landing/', landing_data, name='landing'),
    path('platform-settings/', platform_settings, name='platform-settings'),
    path('map/presence/', map_presence, name='map-presence'),
    path('map/location/', map_update_location, name='map-update-location'),
    path('map/users/<uuid:user_id>/', map_user_detail, name='map-user-detail'),
]
