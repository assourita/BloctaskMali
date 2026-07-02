import math
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.missions.models import Mission
from apps.proofs.models import GPSLocation
from apps.proofs.serializers import GPSLocationSerializer, GPSLocationCreateSerializer


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371
    p = math.pi / 180
    a = (
        0.5 - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(a))


class GPSLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return GPSLocationCreateSerializer
        return GPSLocationSerializer

    def get_queryset(self):
        qs = GPSLocation.objects.select_related('user', 'mission').order_by('-timestamp')
        mission_id = self.request.query_params.get('mission')
        user_id = self.request.query_params.get('user')
        if mission_id:
            qs = qs.filter(mission_id=mission_id)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if not (self.request.user.is_staff or getattr(self.request.user, 'user_type', '') == 'admin'):
            user = self.request.user
            qs = qs.filter(
                Q(mission__client=user) | Q(mission__provider=user) | Q(user=user)
            )
        return qs.distinct()

    def create(self, request, *args, **kwargs):
        mission_id = request.data.get('mission') or request.query_params.get('mission')
        if not mission_id:
            return Response({'error': 'mission requis'}, status=status.HTTP_400_BAD_REQUEST)

        mission = get_object_or_404(Mission, id=mission_id)
        allowed = (
            request.user.is_staff
            or mission.provider == request.user
            or mission.client == request.user
        )
        if not allowed:
            return Response({'error': 'Non autorisé'}, status=403)

        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'mission_id': mission_id}
        )
        serializer.is_valid(raise_exception=True)
        location = serializer.save()

        from apps.tracking.broadcast import broadcast_gps_location
        broadcast_gps_location(mission.id, GPSLocationSerializer(location).data)
        return Response(GPSLocationSerializer(location).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def live(self, request):
        """Positions actives des prestataires (entreprise / admin)."""
        if getattr(request.user, 'user_type', '') not in ('enterprise', 'admin') and not request.user.is_staff:
            return Response({'error': 'Accès non autorisé'}, status=403)

        since = timezone.now() - timezone.timedelta(minutes=15)
        qs = GPSLocation.objects.filter(
            timestamp__gte=since,
            location_type='current'
        ).select_related('user', 'mission').order_by('user', '-timestamp')

        if getattr(request.user, 'user_type', '') == 'enterprise':
            from django.db.models import Q
            profile = getattr(request.user, 'enterprise_profile', None)
            if profile:
                qs = qs.filter(
                    Q(mission__client=request.user)
                    | Q(mission__assigned_enterprise=profile)
                )
            else:
                qs = qs.filter(mission__client=request.user)

        seen = set()
        results = []
        for loc in qs:
            if loc.user_id in seen:
                continue
            seen.add(loc.user_id)
            results.append(GPSLocationSerializer(loc).data)

        return Response(results)

    @action(detail=False, methods=['get'])
    def mission_route(self, request):
        mission_id = request.query_params.get('mission')
        if not mission_id:
            return Response({'error': 'mission requis'}, status=400)
        points = self.get_queryset().filter(mission_id=mission_id).order_by('timestamp')
        return Response(GPSLocationSerializer(points, many=True).data)
