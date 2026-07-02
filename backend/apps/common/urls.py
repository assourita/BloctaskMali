from django.urls import path
from .views import landing_data, market_config, platform_settings

urlpatterns = [
    path('market-config/', market_config, name='market-config'),
    path('landing/', landing_data, name='landing'),
    path('platform-settings/', platform_settings, name='platform-settings'),
]
