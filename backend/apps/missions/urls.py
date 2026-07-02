from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, MissionViewSet,
    MissionApplicationViewSet, MissionSolicitationViewSet,
    MissionBookmarkViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'', MissionViewSet, basename='mission')
router.register(r'applications', MissionApplicationViewSet, basename='application')
router.register(r'solicitations', MissionSolicitationViewSet, basename='solicitation')
router.register(r'bookmarks', MissionBookmarkViewSet, basename='bookmark')

urlpatterns = [
    path('admin_list/', MissionViewSet.as_view({'get': 'admin_list'}), name='mission-admin-list'),
    path('<pk>/admin_cancel/', MissionViewSet.as_view({'post': 'admin_cancel'}), name='mission-admin-cancel'),
    path('', include(router.urls)),
]
