from django.urls import path
from .views import dashboard_stats, mission_trends, enterprise_mission_trends

urlpatterns = [
    path('dashboard/', dashboard_stats, name='analytics-dashboard'),
    path('mission-trends/', mission_trends, name='analytics-mission-trends'),
    path('enterprise-trends/', enterprise_mission_trends, name='analytics-enterprise-trends'),
]
