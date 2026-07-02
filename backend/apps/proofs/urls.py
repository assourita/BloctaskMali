from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MissionProofViewSet, ProofChecklistViewSet, QRValidationViewSet

router = DefaultRouter()
router.register(r'proofs', MissionProofViewSet, basename='mission-proof')
router.register(r'checklists', ProofChecklistViewSet, basename='proof-checklist')
router.register(r'qr', QRValidationViewSet, basename='qr-validation')

urlpatterns = [
    path('', include(router.urls)),
]
