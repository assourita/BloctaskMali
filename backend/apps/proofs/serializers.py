from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import MissionProof, GPSLocation, ProofChecklist, SignatureRecord

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'profile_picture']


class MissionProofSerializer(serializers.ModelSerializer):
    submitted_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = MissionProof
        fields = [
            'id', 'mission', 'submitted_by', 'proof_type', 'title', 'description',
            'file', 'file_name', 'file_size', 'mime_type',
            'verification_status', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'submitted_by', 'verification_status', 'created_at']


class MissionProofCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MissionProof
        fields = ['proof_type', 'title', 'description', 'file', 'metadata']

    def create(self, validated_data):
        file = validated_data['file']
        validated_data['file_name'] = file.name
        validated_data['file_size'] = file.size
        validated_data['mime_type'] = getattr(file, 'content_type', 'application/octet-stream')
        validated_data['submitted_by'] = self.context['request'].user
        validated_data['mission_id'] = self.context['mission_id']
        if 'title' not in validated_data or not validated_data.get('title'):
            validated_data['title'] = validated_data.get('proof_type', 'Preuve')
        return super().create(validated_data)


class GPSLocationSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()
    mission_title = serializers.CharField(source='mission.title', read_only=True)

    class Meta:
        model = GPSLocation
        fields = [
            'id', 'mission', 'mission_title', 'user', 'user_name', 'location_type',
            'latitude', 'longitude', 'accuracy', 'altitude',
            'speed', 'heading', 'address', 'city', 'timestamp', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'user_name', 'mission_title', 'created_at']

    def get_user_name(self, obj):
        name = f'{obj.user.first_name} {obj.user.last_name}'.strip()
        return name or obj.user.email


class GPSLocationCreateSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(required=False)

    class Meta:
        model = GPSLocation
        fields = [
            'location_type', 'latitude', 'longitude', 'accuracy', 'altitude',
            'speed', 'heading', 'address', 'city', 'timestamp', 'battery_level'
        ]

    def create(self, validated_data):
        validated_data.setdefault('timestamp', timezone.now())
        validated_data['user'] = self.context['request'].user
        validated_data['mission_id'] = self.context.get('mission_id')
        return super().create(validated_data)


class ProofChecklistSerializer(serializers.ModelSerializer):
    completion_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = ProofChecklist
        fields = [
            'requires_pickup_photo', 'requires_delivery_photo', 'requires_signature',
            'requires_qr_code', 'requires_receipt',
            'pickup_photo_done', 'delivery_photo_done', 'signature_done',
            'qr_code_done', 'receipt_done', 'is_complete', 'completion_percentage',
            'completed_at', 'updated_at'
        ]


class SignatureRecordSerializer(serializers.ModelSerializer):
    signer = UserBasicSerializer(read_only=True)

    class Meta:
        model = SignatureRecord
        fields = [
            'id', 'mission', 'signer', 'signer_role',
            'signature_image', 'signed_at', 'is_valid', 'created_at'
        ]
        read_only_fields = ['id', 'signer', 'created_at']
