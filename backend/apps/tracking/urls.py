from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GPSLocationViewSet

router = DefaultRouter()
router.register(r'locations', GPSLocationViewSet, basename='gps-location')

urlpatterns = [
    path('', include(router.urls)),
]
