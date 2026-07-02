from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EscrowTransactionViewSet, ProviderDepositViewSet,
    PaymentLogViewSet, BlockchainEventViewSet
)
from .blockchain_views import (
    record_mission_on_chain,
    record_provider_deposit,
    record_proof_on_chain,
    blockchain_status,
    sync_blockchain_events,
)

router = DefaultRouter()
router.register(r'transactions', EscrowTransactionViewSet, basename='escrow-transaction')
router.register(r'deposits', ProviderDepositViewSet, basename='escrow-deposit')
router.register(r'payments', PaymentLogViewSet, basename='escrow-payment')
router.register(r'events', BlockchainEventViewSet, basename='blockchain-event')

urlpatterns = [
    path('blockchain/record-mission/', record_mission_on_chain, name='blockchain-record-mission'),
    path('blockchain/record-provider-deposit/', record_provider_deposit, name='blockchain-record-provider-deposit'),
    path('blockchain/record-proof/', record_proof_on_chain, name='blockchain-record-proof'),
    path('blockchain/status/', blockchain_status, name='blockchain-status'),
    path('blockchain/sync-events/', sync_blockchain_events, name='blockchain-sync-events'),
    path('', include(router.urls)),
]
