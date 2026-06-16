from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from decimal import Decimal

from .models import EscrowTransaction, ProviderDeposit, PaymentLog, BlockchainEvent
from .serializers import (
    EscrowTransactionSerializer, ProviderDepositSerializer,
    PaymentLogSerializer, BlockchainEventSerializer
)


def is_admin(user):
    return user.is_staff or getattr(user, 'user_type', '') == 'admin'


class EscrowTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EscrowTransactionSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return EscrowTransaction.objects.filter(
                Q(client=self.request.user) | Q(provider=self.request.user)
            )
        qs = EscrowTransaction.objects.select_related('mission', 'client', 'provider').order_by('-created_at')

        tx_type = self.request.query_params.get('type')
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)

        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(mission__title__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search) |
                Q(deposit_tx_hash__icontains=search)
            )
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        txs = EscrowTransaction.objects.all()
        deposits = ProviderDeposit.objects.all()

        total_volume = txs.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        deposit_volume = deposits.aggregate(v=Sum('amount'))['v'] or Decimal('0')

        return Response({
            'total_transactions': txs.count(),
            'total_volume': total_volume,
            'pending_transactions': txs.filter(status='pending').count(),
            'confirmed_transactions': txs.filter(status='confirmed').count(),
            'failed_transactions': txs.filter(status='failed').count(),
            'active_deposits': deposits.filter(status='active').count(),
            'locked_deposits': deposits.filter(status='locked').count(),
            'total_deposit_volume': deposit_volume,
            'blockchain_events_unprocessed': BlockchainEvent.objects.filter(processed=False).count(),
            'by_type': list(
                txs.values('transaction_type').annotate(
                    count=Count('id'), volume=Sum('amount')
                ).order_by('-count')
            )
        })


class ProviderDepositViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProviderDepositSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return ProviderDeposit.objects.filter(provider=self.request.user)

        qs = ProviderDeposit.objects.select_related(
            'provider', 'locked_for_mission'
        ).order_by('-created_at')

        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        return qs

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Libérer manuellement une caution (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)
        deposit = self.get_object()
        if deposit.status == 'released':
            return Response({'error': 'Caution déjà libérée'}, status=400)
        from django.utils import timezone
        deposit.status = 'released'
        deposit.released_at = timezone.now()
        deposit.save()
        return Response(ProviderDepositSerializer(deposit).data)

    @action(detail=True, methods=['post'])
    def forfeit(self, request, pk=None):
        """Confisquer une caution (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)
        deposit = self.get_object()
        if deposit.status == 'forfeited':
            return Response({'error': 'Caution déjà confisquée'}, status=400)
        deposit.status = 'forfeited'
        deposit.save()
        return Response(ProviderDepositSerializer(deposit).data)


class PaymentLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentLogSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return PaymentLog.objects.filter(user=self.request.user)
        qs = PaymentLog.objects.select_related('user', 'mission').order_by('-created_at')
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs


class BlockchainEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BlockchainEventSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return BlockchainEvent.objects.none()
        qs = BlockchainEvent.objects.select_related('mission').order_by('-block_number')
        processed = self.request.query_params.get('processed')
        if processed is not None:
            qs = qs.filter(processed=(processed == 'true'))
        return qs

    @action(detail=True, methods=['post'])
    def mark_processed(self, request, pk=None):
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)
        from django.utils import timezone
        event = self.get_object()
        event.processed = True
        event.processed_at = timezone.now()
        event.save()
        return Response(BlockchainEventSerializer(event).data)
