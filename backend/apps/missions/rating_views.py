"""
Endpoint de notation après mission (client <-> prestataire).

Branche le modèle MissionReview existant sur la route /api/ratings/
attendue par le frontend web et l'app mobile, puis recalcule la réputation
de l'utilisateur noté.
"""
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import Mission, MissionReview


class RatingCreateSerializer(serializers.Serializer):
    mission_id = serializers.UUIDField()
    rated_user_id = serializers.UUIDField(required=False)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default='')


class RatingView(APIView):
    """POST /api/ratings/ — enregistre une évaluation de mission."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            mission = Mission.objects.select_related('client', 'provider').get(
                id=data['mission_id']
            )
        except Mission.DoesNotExist:
            return Response({'error': 'Mission introuvable'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_client = mission.client_id == user.id
        is_provider = mission.provider_id == user.id

        if not (is_client or is_provider):
            return Response(
                {'error': 'Vous ne participez pas à cette mission.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if mission.status != Mission.Status.COMPLETED:
            return Response(
                {'error': 'La mission doit être terminée pour être notée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review, _ = MissionReview.objects.get_or_create(mission=mission)
        rating = data['rating']
        comment = data.get('comment', '')

        if is_client:
            if review.client_rating:
                return Response(
                    {'error': 'Vous avez déjà noté cette mission.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            review.client_rating = rating
            review.client_comment = comment
            review.client_reviewed_at = timezone.now()
            rated_user = mission.provider
        else:
            if review.provider_rating:
                return Response(
                    {'error': 'Vous avez déjà noté cette mission.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            review.provider_rating = rating
            review.provider_comment = comment
            review.provider_reviewed_at = timezone.now()
            rated_user = mission.client

        review.save()

        # Recalcule la réputation de l'utilisateur noté
        if rated_user:
            try:
                from apps.reputation.services import recalculate_reputation
                recalculate_reputation(
                    rated_user,
                    event_type='rating_received',
                    mission=mission,
                    description=f'Note reçue: {rating}/5',
                )
            except Exception:
                pass

            try:
                from apps.notifications.services import notify_mission_event
                notify_mission_event(
                    mission, 'completed', rated_user,
                    'Nouvelle évaluation',
                    f'Vous avez reçu une note de {rating}/5 pour « {mission.title} ».',
                )
            except Exception:
                pass

        return Response(
            {
                'detail': 'Évaluation enregistrée.',
                'mission_id': str(mission.id),
                'rating': rating,
            },
            status=status.HTTP_201_CREATED,
        )
