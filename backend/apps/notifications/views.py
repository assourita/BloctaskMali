from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer, NotificationPreferenceSerializer
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).select_related('mission', 'dispute')
        unread = self.request.query_params.get('unread')
        if unread == 'true':
            qs = qs.filter(is_read=False)
        return qs

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'marked': updated})

    @action(detail=False, methods=['post'])
    def register_push(self, request):
        """Enregistre un token push (Expo ou FCM)."""
        from .models import PushSubscription

        token = (
            request.data.get('push_token')
            or request.data.get('expo_push_token')
            or request.data.get('fcm_token')
        )
        if not token:
            return Response({'error': 'push_token, expo_push_token ou fcm_token requis'}, status=400)

        device_type = request.data.get('device_type', 'web')
        if token.startswith('ExponentPushToken[') or token.startswith('ExpoPushToken['):
            device_type = request.data.get('device_type') or 'mobile'

        sub, created = PushSubscription.objects.update_or_create(
            fcm_token=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'device_id': request.data.get('device_id', ''),
                'device_model': request.data.get('device_model', ''),
                'app_version': request.data.get('app_version', ''),
                'is_active': True,
            },
        )
        return Response({'registered': True, 'created': created, 'provider': 'expo' if 'Exponent' in token or 'ExpoPush' in token else 'fcm'})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferenceSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if request.method == 'PATCH':
            serializer = self.get_serializer(prefs, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(prefs).data)
