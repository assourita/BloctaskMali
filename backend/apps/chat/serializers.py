from rest_framework import serializers

from .models import Conversation, Message


class SenderSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        if getattr(obj, 'profile_picture', None):
            request = self.context.get('request')
            url = obj.profile_picture.url if hasattr(obj.profile_picture, 'url') else str(obj.profile_picture)
            if request and url and not url.startswith('http'):
                return request.build_absolute_uri(url)
            return url
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender = SenderSerializer(read_only=True)
    delivery_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'content', 'message_type',
            'attachment_url', 'is_read', 'delivered_at', 'delivery_status', 'created_at',
        ]
        read_only_fields = fields

    def get_delivery_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.sender_id != request.user.id:
            return None
        if obj.is_read:
            return 'read'
        if obj.delivered_at:
            return 'delivered'
        return 'sent'


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=4000)
    message_type = serializers.ChoiceField(
        choices=Message.MessageType.choices,
        default=Message.MessageType.TEXT,
    )


class MissionMiniSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    status = serializers.CharField()


class ConversationSerializer(serializers.ModelSerializer):
    mission = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    can_write = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'mission', 'other_participant', 'last_message',
            'unread_count', 'can_write', 'is_closed', 'updated_at',
        ]

    def _other_user(self, obj):
        user = self.context['request'].user
        return obj.provider if obj.client_id == user.id else obj.client

    def get_mission(self, obj):
        m = obj.mission
        return {'id': str(m.id), 'title': m.title, 'status': m.status}

    def get_other_participant(self, obj):
        u = self._other_user(obj)
        return SenderSerializer(u, context=self.context).data

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return MessageSerializer(msg, context=self.context).data

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()

    def get_can_write(self, obj):
        from .services import can_write_chat
        return can_write_chat(self.context['request'].user, obj.mission)
