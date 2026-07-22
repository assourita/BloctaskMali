from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, MissionViewSet,
    MissionApplicationViewSet, MissionSolicitationViewSet,
    MissionBookmarkViewSet
)
from .employee_views import employee_mission_detail, claim_mission_timeout
from .client_timeout_views import client_expired_mission_detail, cancel_expired_mission, renegotiate_mission

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'', MissionViewSet, basename='mission')
router.register(r'applications', MissionApplicationViewSet, basename='application')
router.register(r'solicitations', MissionSolicitationViewSet, basename='solicitation')
router.register(r'bookmarks', MissionBookmarkViewSet, basename='bookmark')

urlpatterns = [
    path('admin_list/', MissionViewSet.as_view({'get': 'admin_list'}), name='mission-admin-list'),
    path('<pk>/admin_cancel/', MissionViewSet.as_view({'post': 'admin_cancel'}), name='mission-admin-cancel'),
    # Endpoints employé pour gestion des échéances
    path('<pk>/employee-view/', employee_mission_detail, name='employee-mission-detail'),
    path('<pk>/claim-timeout/', claim_mission_timeout, name='claim-mission-timeout'),
    # Endpoints client pour gestion des missions expirées
    path('<pk>/expired-detail/', client_expired_mission_detail, name='client-expired-mission-detail'),
    path('<pk>/cancel-expired/', cancel_expired_mission, name='cancel-expired-mission'),
    path('<pk>/renegotiate/', renegotiate_mission, name='renegotiate-mission'),
    path('', include(router.urls)),
]
