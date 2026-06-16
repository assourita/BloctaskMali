from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EscrowTransaction, ProviderDeposit, PaymentLog, BlockchainEvent

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'wallet_address']


class EscrowTransactionSerializer(serializers.ModelSerializer):
    client = UserBasicSerializer(read_only=True)
    provider = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True)

    class Meta:
        model = EscrowTransaction
        fields = [
            'id', 'mission', 'mission_title', 'client', 'provider',
            'transaction_type', 'status', 'amount', 'currency',
            'blockchain_mission_id', 'deposit_tx_hash', 'release_tx_hash',
            'block_number', 'gas_used', 'confirmations',
            'reason', 'created_at', 'confirmed_at'
        ]


class ProviderDepositSerializer(serializers.ModelSerializer):
    provider = UserBasicSerializer(read_only=True)
    locked_for_mission_title = serializers.CharField(
        source='locked_for_mission.title', read_only=True, default=None
    )

    class Meta:
        model = ProviderDeposit
        fields = [
            'id', 'provider', 'amount', 'currency', 'status',
            'blockchain_deposit_id', 'deposit_tx_hash',
            'locked_for_mission', 'locked_for_mission_title',
            'is_dynamic', 'calculated_required_amount',
            'created_at', 'locked_at', 'released_at'
        ]


class PaymentLogSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True, default=None)

    class Meta:
        model = PaymentLog
        fields = [
            'id', 'user', 'mission', 'mission_title',
            'amount', 'currency', 'payment_method', 'status',
            'mobile_provider', 'phone_number', 'transaction_id',
            'description', 'external_reference',
            'created_at', 'completed_at'
        ]


class BlockchainEventSerializer(serializers.ModelSerializer):
    mission_title = serializers.CharField(source='mission.title', read_only=True, default=None)

    class Meta:
        model = BlockchainEvent
        fields = [
            'id', 'event_type', 'mission', 'mission_title',
            'contract_address', 'transaction_hash', 'block_number',
            'log_index', 'event_data', 'processed', 'processed_at',
            'error_message', 'created_at'
        ]


class EscrowStatsSerializer(serializers.Serializer):
    total_transactions = serializers.IntegerField()
    total_volume = serializers.DecimalField(max_digits=20, decimal_places=2)
    pending_transactions = serializers.IntegerField()
    confirmed_transactions = serializers.IntegerField()
    failed_transactions = serializers.IntegerField()
    active_deposits = serializers.IntegerField()
    locked_deposits = serializers.IntegerField()
    total_deposit_volume = serializers.DecimalField(max_digits=20, decimal_places=2)
    blockchain_events_unprocessed = serializers.IntegerField()
