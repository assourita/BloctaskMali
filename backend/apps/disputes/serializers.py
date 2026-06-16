from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Dispute, DisputeEvidence, DisputeMessage

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class MissionBasicSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField()


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    submitted_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = DisputeEvidence
        fields = ['id', 'evidence_type', 'title', 'description', 'file', 'is_accepted', 'submitted_by', 'created_at']


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender = UserBasicSerializer(read_only=True)

    class Meta:
        model = DisputeMessage
        fields = ['id', 'message', 'is_internal', 'sender', 'created_at']


class DisputeListSerializer(serializers.ModelSerializer):
    plaintiff = UserBasicSerializer(read_only=True)
    defendant = UserBasicSerializer(read_only=True)
    decided_by = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True)
    mission_id = serializers.UUIDField(source='mission.id', read_only=True)
    mission_budget = serializers.DecimalField(source='mission.budget', max_digits=15, decimal_places=2, read_only=True)
    mission_currency = serializers.CharField(source='mission.currency', read_only=True)
    evidence_count = serializers.IntegerField(source='evidence.count', read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id', 'dispute_hash',
            'mission_id', 'mission_title', 'mission_budget', 'mission_currency',
            'plaintiff', 'defendant',
            'reason', 'description', 'requested_resolution',
            'status', 'decision', 'decision_reason',
            'decided_by', 'decided_at',
            'client_refund_amount', 'provider_payment_amount', 'deposit_penalty',
            'evidence_deadline', 'auto_resolve_at',
            'evidence_count', 'message_count',
            'created_at', 'updated_at', 'resolved_at'
        ]


class DisputeDetailSerializer(DisputeListSerializer):
    evidence = DisputeEvidenceSerializer(many=True, read_only=True)
    messages = DisputeMessageSerializer(many=True, read_only=True)

    class Meta(DisputeListSerializer.Meta):
        fields = DisputeListSerializer.Meta.fields + ['evidence', 'messages']


class DisputeResolveSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=Dispute.Decision.choices)
    decision_reason = serializers.CharField()
    client_refund_amount = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    provider_payment_amount = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_penalty = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)


class DisputeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Dispute.Status.choices)
