"""
BlockTask Payment Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import Payment, PaymentRefund, UserPaymentMethod
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer,
    PaymentRefundSerializer,
    UserPaymentMethodSerializer
)
from .mobile_money import MobileMoneyService, MobileMoneyError
from apps.users.roles import get_effective_role


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet pour les paiements"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        role = get_effective_role(user)
        if role == 'provider':
            return Payment.objects.filter(mission__provider=user).select_related('mission')
        return Payment.objects.filter(client=user).select_related('mission')

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        """Confirme un paiement Mobile Money et finance la mission (escrow)."""
        payment = self.get_object()

        if payment.client != request.user and not request.user.is_staff:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        if payment.status != Payment.Status.PENDING:
            return Response(
                {'detail': 'Ce paiement ne peut pas être confirmé.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp = request.data.get('otp') or request.data.get('pin')

        try:
            result = MobileMoneyService.process_payment(payment, otp=otp)
        except MobileMoneyError as exc:
            payment.status = Payment.Status.FAILED
            payment.error_message = str(exc)
            payment.save(update_fields=['status', 'error_message'])
            return Response(
                {'detail': str(exc), 'code': exc.code},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.refresh_from_db()
        return Response({
            'detail': result.get('message', 'Paiement confirmé et fonds bloqués en escrow.'),
            'transaction_id': result.get('transaction_id'),
            'escrow_tx_hash': payment.escrow_tx_hash,
            'mission_id': str(payment.mission_id),
            'mission_status': payment.mission.status,
            'sandbox': result.get('sandbox', False),
        })

    @action(detail=True, methods=['post'])
    def request_refund(self, request, pk=None):
        payment = self.get_object()

        if payment.client != request.user:
            return Response(
                {'detail': 'Seul le client peut demander un remboursement.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment.mission.status not in ['pending', 'funded']:
            return Response(
                {'detail': 'Cette mission ne peut pas être remboursée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'other')
        reason_details = request.data.get('reason_details', '')

        refund = PaymentRefund.objects.create(
            payment=payment,
            amount=payment.escrow_amount,
            reason=reason,
            reason_details=reason_details
        )

        return Response({
            'detail': 'Demande de remboursement créée.',
            'refund_id': str(refund.id)
        })


class PaymentRefundViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentRefundSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = get_effective_role(user)
        if role == 'provider':
            return PaymentRefund.objects.filter(payment__mission__provider=user)
        return PaymentRefund.objects.filter(payment__client=user)


class UserPaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = UserPaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserPaymentMethod.objects.filter(
            user=self.request.user,
            is_active=True
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        payment_method = self.get_object()
        UserPaymentMethod.objects.filter(
            user=request.user,
            is_default=True
        ).update(is_default=False)
        payment_method.is_default = True
        payment_method.save()
        return Response({'detail': 'Méthode de paiement définie par défaut.'})

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        payment_method = self.get_object()
        payment_method.is_verified = True
        payment_method.save()
        return Response({'detail': 'Méthode de paiement vérifiée.'})
