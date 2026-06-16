from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EscrowTransactionViewSet, ProviderDepositViewSet,
    PaymentLogViewSet, BlockchainEventViewSet
)

router = DefaultRouter()
router.register(r'transactions', EscrowTransactionViewSet, basename='escrow-transaction')
router.register(r'deposits', ProviderDepositViewSet, basename='escrow-deposit')
router.register(r'payments', PaymentLogViewSet, basename='escrow-payment')
router.register(r'events', BlockchainEventViewSet, basename='blockchain-event')

urlpatterns = [
    path('', include(router.urls)),
]
