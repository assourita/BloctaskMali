from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    mission_id = serializers.UUIDField(source='mission.id', read_only=True, allow_null=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority', 'channel',
            'image_url', 'action_url', 'data',
            'mission_id', 'mission_title',
            'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enabled', 'email_mission_updates', 'email_payments', 'email_disputes',
            'email_marketing', 'email_digest',
            'push_enabled', 'push_mission_updates', 'push_payments', 'push_messages', 'push_gps',
            'sms_enabled', 'sms_urgent_only', 'sms_security',
            'in_app_enabled', 'in_app_sound', 'in_app_vibration',
            'quiet_hours_start', 'quiet_hours_end', 'timezone',
        ]
