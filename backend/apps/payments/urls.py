"""
BlockTask Payment URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentViewSet,
    PaymentRefundViewSet,
    UserPaymentMethodViewSet
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'refunds', PaymentRefundViewSet, basename='refund')
router.register(r'payment-methods', UserPaymentMethodViewSet, basename='payment-method')

urlpatterns = [
    path('', include(router.urls)),
]
