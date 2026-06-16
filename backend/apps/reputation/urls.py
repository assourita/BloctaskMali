from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReputationScoreViewSet, ReputationPenaltyViewSet, TrustFactorViewSet

router = DefaultRouter()
router.register(r'scores', ReputationScoreViewSet, basename='reputation-score')
router.register(r'penalties', ReputationPenaltyViewSet, basename='reputation-penalty')
router.register(r'trust', TrustFactorViewSet, basename='trust-factor')

urlpatterns = [
    path('', include(router.urls)),
]
