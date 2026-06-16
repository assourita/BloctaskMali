"""
BlockTask Users Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import ProviderProfile, EnterpriseProfile, Employee, WalletTransaction

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'inscription"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    kyc_status = serializers.CharField(required=False, default='not_required')
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'user_type', 'kyc_status', 'is_active',
            'password', 'password_confirm'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur utilisateur de base"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone_number', 'user_type', 'secondary_role', 'active_role',
            'profile_picture', 'bio', 'address',
            'city', 'country', 'wallet_address', 'kyc_status',
            'gps_tracking_enabled', 'is_active', 'email_verified', 'phone_verified', 'created_at'
        ]
        read_only_fields = ['id', 'email_verified', 'phone_verified', 'created_at', 'secondary_role']


class UserProfileSerializer(serializers.ModelSerializer):
    """Sérialiseur profil complet"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    provider_profile = serializers.SerializerMethodField()
    enterprise_profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone_number', 'user_type', 'secondary_role', 'active_role',
            'profile_picture', 'bio', 'address',
            'city', 'country', 'wallet_address', 'kyc_status', 'nina',
            'email_verified', 'phone_verified', 'two_factor_enabled',
            'gps_tracking_enabled', 'is_active', 'created_at', 'updated_at',
            'provider_profile', 'enterprise_profile'
        ]
        read_only_fields = ['id', 'username', 'email', 'kyc_status', 'email_verified', 'phone_verified', 'created_at', 'updated_at', 'secondary_role']
    
    def get_provider_profile(self, obj):
        if hasattr(obj, 'provider_profile'):
            return ProviderProfileSerializer(obj.provider_profile).data
        return None
    
    def get_enterprise_profile(self, obj):
        if hasattr(obj, 'enterprise_profile'):
            return EnterpriseProfileSerializer(obj.enterprise_profile).data
        return None


class AdminUserSerializer(serializers.ModelSerializer):
    """Sérialiseur admin — tous les champs modifiables"""
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'user_type', 'kyc_status', 'is_active',
            'email_verified', 'created_at', 'last_login', 'wallet_address'
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'wallet_address']


class ProviderProfileSerializer(serializers.ModelSerializer):
    """Sérialiseur profil prestataire"""
    class Meta:
        model = ProviderProfile
        fields = [
            'id', 'skills', 'categories', 'level', 'reputation_score',
            'total_missions_completed', 'total_earnings', 'is_available',
            'working_hours_start', 'working_hours_end', 'working_days',
            'deposit_balance', 'deposit_locked', 'vehicle_type', 'vehicle_plate',
            'certifications', 'current_latitude', 'current_longitude',
            'created_at', 'updated_at'
        ]


class EnterpriseProfileSerializer(serializers.ModelSerializer):
    """Sérialiseur profil entreprise"""
    total_employees = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = EnterpriseProfile
        fields = [
            'id', 'company_name', 'rccm', 'ifu', 'trade_register',
            'company_email', 'company_phone', 'website', 'address', 'city',
            'total_employees', 'total_missions_posted', 'total_spent',
            'reputation_score', 'is_verified', 'verified_at',
            'created_at', 'updated_at'
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    """Sérialiseur employé"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'enterprise', 'user', 'user_email', 'first_name', 'last_name',
            'email', 'phone', 'position', 'role', 'nina', 'photo',
            'missions_completed', 'missions_failed', 'is_active',
            'hired_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WalletTransactionSerializer(serializers.ModelSerializer):
    """Sérialiseur transactions wallet"""
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'transaction_type', 'amount', 'currency',
            'blockchain_tx_hash', 'mobile_money_provider', 'description',
            'status', 'metadata', 'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at']


class KYCSerializer(serializers.ModelSerializer):
    """Sérialiseur KYC"""
    class Meta:
        model = User
        fields = [
            'nina', 'id_card_front', 'id_card_back', 'selfie_verification',
            'kyc_status', 'kyc_submitted_at', 'kyc_verified_at'
        ]
        read_only_fields = ['kyc_status', 'kyc_submitted_at', 'kyc_verified_at']


class WalletConnectSerializer(serializers.Serializer):
    """Sérialiseur connexion wallet"""
    wallet_address = serializers.CharField(max_length=42, required=True)
    signature = serializers.CharField(required=True)
    message = serializers.CharField(required=True)
    
    def validate_wallet_address(self, value):
        if not value.startswith('0x') or len(value) != 42:
            raise serializers.ValidationError("Adresse wallet invalide.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Sérialiseur changement de mot de passe"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Les nouveaux mots de passe ne correspondent pas.")
        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """Sérialiseur liste utilisateurs (light)"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'user_type', 'kyc_status', 'is_active', 'created_at', 'last_login',
            'phone_number', 'wallet_address', 'email_verified'
        ]
