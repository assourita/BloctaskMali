from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Avg, Count
from django.utils import timezone

from .models import ReputationScore, ReputationHistory, ReputationPenalty, TrustFactor
from .serializers import (
    ReputationScoreSerializer, ReputationHistorySerializer,
    ReputationPenaltySerializer, ReputationPenaltyCreateSerializer,
    TrustFactorSerializer
)


def is_admin(user):
    return user.is_staff or getattr(user, 'user_type', '') == 'admin'


class ReputationScoreViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReputationScoreSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return ReputationScore.objects.filter(user=self.request.user)

        qs = ReputationScore.objects.select_related('user').order_by('-overall_score')

        level = self.request.query_params.get('level')
        if level:
            qs = qs.filter(level=level)

        user_type = self.request.query_params.get('user_type')
        if user_type:
            qs = qs.filter(user__user_type=user_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Accès non autorisé'}, status=403)

        all_scores = ReputationScore.objects.all()
        return Response({
            'total_users': all_scores.count(),
            'average_score': all_scores.aggregate(a=Avg('overall_score'))['a'] or 0,
            'by_level': list(
                all_scores.values('level').annotate(count=Count('id')).order_by('level')
            ),
            'top_performers': ReputationScoreSerializer(
                all_scores.order_by('-overall_score')[:5], many=True
            ).data,
            'worst_performers': ReputationScoreSerializer(
                all_scores.filter(total_missions__gt=0).order_by('overall_score')[:5], many=True
            ).data,
            'total_penalties': ReputationPenalty.objects.count(),
            'recent_penalties': ReputationPenalty.objects.count() > 0 and
                ReputationPenalty.objects.filter(
                    created_at__gte=timezone.now() - timezone.timedelta(days=30)
                ).count() or 0,
        })

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        score = self.get_object()
        history = ReputationHistory.objects.filter(user=score.user).order_by('-created_at')[:50]
        return Response(ReputationHistorySerializer(history, many=True).data)


class ReputationPenaltyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ReputationPenaltyCreateSerializer
        return ReputationPenaltySerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return ReputationPenalty.objects.filter(user=self.request.user)
        qs = ReputationPenalty.objects.select_related('user', 'applied_by', 'mission').order_by('-created_at')

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def perform_create(self, serializer):
        penalty = serializer.save(applied_by=self.request.user)
        # Mettre à jour le score de réputation
        try:
            rep = ReputationScore.objects.get(user=penalty.user)
            rep.overall_score = max(0, rep.overall_score - penalty.points_deducted)
            rep.save()
            ReputationHistory.objects.create(
                user=penalty.user,
                event_type='penalty',
                old_score=rep.overall_score + penalty.points_deducted,
                new_score=rep.overall_score,
                change_amount=-penalty.points_deducted,
                description=f"Pénalité admin: {penalty.description}"
            )
        except ReputationScore.DoesNotExist:
            pass


class TrustFactorViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TrustFactorSerializer

    def get_queryset(self):
        if not is_admin(self.request.user):
            return TrustFactor.objects.filter(user=self.request.user)
        return TrustFactor.objects.select_related('user').order_by('-trust_score')
