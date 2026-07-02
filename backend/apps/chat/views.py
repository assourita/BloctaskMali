from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.missions.models import Mission

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from .services import (
    can_read_chat,
    can_write_chat,
    get_or_create_conversation,
    user_is_participant,
)


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Conversation.objects.filter(
            Q(client=user) | Q(provider=user),
        ).select_related('mission', 'client', 'provider').prefetch_related('messages')

        mission_id = self.request.query_params.get('mission_id')
        if mission_id:
            mission = Mission.objects.filter(id=mission_id).first()
            if mission and can_read_chat(user, mission):
                get_or_create_conversation(mission)
            qs = qs.filter(mission_id=mission_id)

        return qs.order_by('-updated_at')

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if not can_read_chat(request.user, conversation.mission):
            return Response({'error': 'Messagerie non disponible pour cette mission'}, status=403)

        if request.method == 'GET':
            msgs = conversation.messages.select_related('sender').order_by('created_at')
            return Response(MessageSerializer(msgs, many=True, context={'request': request}).data)

        if not can_write_chat(request.user, conversation.mission):
            return Response(
                {'error': 'La messagerie est fermée (mission terminée ou non démarrée).'},
                status=403,
            )

        ser = MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=ser.validated_data['content'],
            message_type=ser.validated_data.get('message_type', Message.MessageType.TEXT),
        )
        conversation.save(update_fields=['updated_at'])

        from apps.notifications.services import notify_chat_message
        if ser.validated_data.get('message_type', Message.MessageType.TEXT) == Message.MessageType.TEXT:
            notify_chat_message(conversation, request.user, ser.validated_data['content'])

        return Response(
            MessageSerializer(msg, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        if not user_is_participant(request.user, conversation.mission):
            return Response({'error': 'Accès refusé'}, status=403)
        conversation.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        return Response({'ok': True})
