from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ReputationScore, ReputationHistory, ReputationPenalty, ReputationBonus, TrustFactor

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'user_type']


class ReputationScoreSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    success_rate = serializers.FloatField(read_only=True)
    dispute_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = ReputationScore
        fields = [
            'id', 'user',
            'overall_score', 'success_rate_score', 'rating_score', 'dispute_score', 'volume_score',
            'total_missions', 'successful_missions', 'failed_missions', 'cancelled_missions',
            'total_rating_sum', 'rating_count', 'average_rating',
            'dispute_count', 'dispute_won', 'dispute_lost',
            'on_time_count', 'late_count', 'on_time_rate',
            'level', 'success_rate', 'dispute_rate',
            'last_calculated_at', 'created_at'
        ]


class ReputationHistorySerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True, default=None)

    class Meta:
        model = ReputationHistory
        fields = [
            'id', 'user', 'event_type', 'mission', 'mission_title',
            'old_score', 'new_score', 'change_amount', 'description', 'created_at'
        ]


class ReputationPenaltySerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    applied_by = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True, default=None)

    class Meta:
        model = ReputationPenalty
        fields = [
            'id', 'user', 'penalty_type', 'points_deducted',
            'mission', 'mission_title', 'description',
            'applied_by', 'is_temporary', 'expires_at', 'created_at'
        ]


class ReputationPenaltyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReputationPenalty
        fields = ['user', 'penalty_type', 'points_deducted', 'mission', 'description', 'is_temporary', 'expires_at']


class TrustFactorSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = TrustFactor
        fields = [
            'id', 'user',
            'email_verified', 'phone_verified', 'identity_verified', 'address_verified',
            'account_age_days', 'login_frequency', 'response_time_avg',
            'trust_score', 'updated_at'
        ]
