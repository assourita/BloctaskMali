from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count

from .models import Dispute, DisputeMessage
from .serializers import (
    DisputeListSerializer, DisputeDetailSerializer,
    DisputeResolveSerializer, DisputeStatusSerializer,
    DisputeMessageSerializer, DisputeCreateSerializer,
    DisputeEvidenceCreateSerializer, DisputeEvidenceSerializer,
)


def is_admin(user):
    return user.is_staff or getattr(user, 'user_type', '') == 'admin'


class DisputeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = Dispute.objects.select_related(
            'mission', 'plaintiff', 'defendant', 'decided_by'
        ).prefetch_related('evidence', 'messages')

        if not is_admin(self.request.user):
            user = self.request.user
            if getattr(user, 'user_type', '') == 'enterprise':
                qs = qs.filter(mission__client=user)
            else:
                qs = qs.filter(Q(plaintiff=user) | Q(defendant=user))

        mission_id = self.request.query_params.get('mission')
        if mission_id:
            qs = qs.filter(mission_id=mission_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        reason_filter = self.request.query_params.get('reason')
        if reason_filter:
            qs = qs.filter(reason=reason_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(mission__title__icontains=search) |
                Q(plaintiff__first_name__icontains=search) |
                Q(plaintiff__last_name__icontains=search) |
                Q(plaintiff__email__icontains=search) |
                Q(defendant__first_name__icontains=search) |
                Q(defendant__last_name__icontains=search)
            )

        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DisputeDetailSerializer
        if self.action == 'create':
            return DisputeCreateSerializer
        return DisputeListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispute = serializer.save()

        from apps.notifications.services import create_notification
        create_notification(
            dispute.defendant,
            'dispute_opened',
            'Litige ouvert',
            f'Un litige a été ouvert pour la mission « {dispute.mission.title} »',
            mission=dispute.mission,
            dispute=dispute,
            priority='high',
        )

        return Response(DisputeDetailSerializer(dispute).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """Litiges de l'utilisateur courant."""
        qs = self.get_queryset()
        serializer = DisputeListSerializer(qs, many=True)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques globales des litiges (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        qs = Dispute.objects.all()
        return Response({
            'total': qs.count(),
            'open': qs.filter(status='open').count(),
            'under_review': qs.filter(status='under_review').count(),
            'pending_evidence': qs.filter(status='pending_evidence').count(),
            'arbitration': qs.filter(status='arbitration').count(),
            'resolved': qs.filter(status='resolved').count(),
            'closed': qs.filter(status='closed').count(),
            'by_reason': list(
                qs.values('reason').annotate(count=Count('id')).order_by('-count')
            ),
        })

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Résoudre un litige avec une décision (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        dispute = self.get_object()
        if dispute.status in ['resolved', 'closed']:
            return Response({'error': 'Ce litige est déjà résolu ou fermé'}, status=400)

        serializer = DisputeResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        dispute.status = Dispute.Status.RESOLVED
        dispute.decision = data['decision']
        dispute.decision_reason = data['decision_reason']
        dispute.client_refund_amount = data.get('client_refund_amount', 0)
        dispute.provider_payment_amount = data.get('provider_payment_amount', 0)
        dispute.deposit_penalty = data.get('deposit_penalty', 0)
        dispute.decided_by = request.user
        dispute.decided_at = timezone.now()
        dispute.resolved_at = timezone.now()
        dispute.save()

        from apps.notifications.services import create_notification
        for party in (dispute.plaintiff, dispute.defendant):
            create_notification(
                party,
                'dispute_resolved',
                'Litige résolu',
                f'Le litige pour « {dispute.mission.title} » a été résolu.',
                mission=dispute.mission,
                dispute=dispute,
            )

        from apps.reputation.services import recalculate_reputation
        if dispute.mission.provider_id:
            recalculate_reputation(
                dispute.mission.provider,
                event_type='dispute_resolved',
                mission=dispute.mission,
                description='Litige résolu',
            )

        return Response(DisputeListSerializer(dispute).data)

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """Changer le statut d'un litige (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        dispute = self.get_object()
        serializer = DisputeStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        dispute.status = serializer.validated_data['status']
        dispute.save()
        return Response(DisputeListSerializer(dispute).data)

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """Ajouter un message interne à un litige (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        dispute = self.get_object()
        msg_text = request.data.get('message', '').strip()
        if not msg_text:
            return Response({'error': 'Message vide'}, status=400)

        msg = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=msg_text,
            is_internal=request.data.get('is_internal', True)
        )
        return Response(DisputeMessageSerializer(msg).data, status=201)

    @action(detail=True, methods=['post'])
    def add_evidence(self, request, pk=None):
        """Soumettre une preuve pour un litige."""
        dispute = self.get_object()
        user = request.user
        if user not in (dispute.plaintiff, dispute.defendant) and not is_admin(user):
            return Response({'error': 'Non autorisé'}, status=403)

        serializer = DisputeEvidenceCreateSerializer(
            data=request.data,
            context={'request': request, 'dispute': dispute},
        )
        serializer.is_valid(raise_exception=True)
        evidence = serializer.save()
        return Response(DisputeEvidenceSerializer(evidence).data, status=201)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Fermer un litige (admin)"""
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        dispute = self.get_object()
        dispute.status = Dispute.Status.CLOSED
        dispute.save()
        return Response({'status': 'Litige fermé'})
