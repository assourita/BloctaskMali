"""
BlockTask Payment Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Payment, PaymentRefund, UserPaymentMethod
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer,
    PaymentRefundSerializer,
    UserPaymentMethodSerializer
)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet pour les paiements"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre les paiements par utilisateur"""
        user = self.request.user
        if user.user_type == 'client':
            return Payment.objects.filter(client=user)
        elif user.user_type == 'provider':
            return Payment.objects.filter(mission__provider=user)
        return Payment.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer
    
    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        """Confirme un paiement et active l'escrow"""
        payment = self.get_object()
        
        if payment.status != Payment.Status.PENDING:
            return Response(
                {'detail': 'Ce paiement ne peut pas àªtre confirmé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Intégrer avec le fournisseur de paiement (Mobile Money, etc.)
        # TODO: Déployer le smart contract escrow sur la blockchain
        
        # Simuler pour l'instant
        payment.status = Payment.Status.COMPLETED
        payment.escrow_tx_hash = '0x' + '0' * 64  # Placeholder
        payment.save()
        
        # Mettre à  jour le statut de la mission
        payment.mission.status = 'funded'
        payment.mission.save()
        
        return Response({
            'detail': 'Paiement confirmé et fonds bloqués en escrow.',
            'escrow_tx_hash': payment.escrow_tx_hash
        })
    
    @action(detail=True, methods=['post'])
    def request_refund(self, request, pk=None):
        """Demande un remboursement"""
        payment = self.get_object()
        
        # Vérifier que le client demande le remboursement
        if payment.client != request.user:
            return Response(
                {'detail': 'Seul le client peut demander un remboursement.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier que la mission peut àªtre remboursée
        if payment.mission.status not in ['pending', 'funded']:
            return Response(
                {'detail': 'Cette mission ne peut pas àªtre remboursée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', 'other')
        reason_details = request.data.get('reason_details', '')
        
        # Créer le remboursement
        refund = PaymentRefund.objects.create(
            payment=payment,
            amount=payment.escrow_amount,
            reason=reason,
            reason_details=reason_details
        )
        
        # TODO: Traiter le remboursement via le fournisseur de paiement
        
        return Response({
            'detail': 'Demande de remboursement créée.',
            'refund_id': refund.id
        })


class PaymentRefundViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les remboursements (lecture seule)"""
    serializer_class = PaymentRefundSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre par utilisateur"""
        user = self.request.user
        if user.user_type == 'client':
            return PaymentRefund.objects.filter(payment__client=user)
        elif user.user_type == 'provider':
            return PaymentRefund.objects.filter(payment__mission__provider=user)
        return PaymentRefund.objects.none()


class UserPaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet pour les méthodes de paiement de l'utilisateur"""
    serializer_class = UserPaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre par utilisateur"""
        return UserPaymentMethod.objects.filter(
            user=self.request.user,
            is_active=True
        )
    
    def perform_create(self, serializer):
        """Crée une méthode de paiement pour l'utilisateur"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Définit comme méthode par défaut"""
        payment_method = self.get_object()
        
        # Retirer le statut par défaut des autres
        UserPaymentMethod.objects.filter(
            user=request.user,
            is_default=True
        ).update(is_default=False)
        
        # Définir celle-ci par défaut
        payment_method.is_default = True
        payment_method.save()
        
        return Response({
            'detail': 'Méthode de paiement définie par défaut.'
        })
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Vérifie une méthode de paiement"""
        payment_method = self.get_object()
        
        # TODO: Envoyer un code de vérification
        # TODO: Vérifier le code
        
        payment_method.is_verified = True
        payment_method.save()
        
        return Response({
            'detail': 'Méthode de paiement vérifiée.'
        })
