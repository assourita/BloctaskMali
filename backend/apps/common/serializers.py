from rest_framework import serializers

from .models import PlatformSettings


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = [
            'maintenance_mode',
            'registration_open',
            'email_notifications',
            'service_fee_percent',
            'default_currency',
            'require_2fa_admin',
            'require_kyc',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_service_fee_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('Les frais doivent être entre 0 et 100 %.')
        return value
