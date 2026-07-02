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
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'user_type', 'is_active',
            'password', 'password_confirm'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        email = (attrs.get('email') or '').strip().lower()
        if email:
            from .email_verification import is_disposable_email
            if is_disposable_email(email):
                raise serializers.ValidationError({
                    'email': 'Les adresses email temporaires ne sont pas acceptées.',
                })
            attrs['email'] = email
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user_type = validated_data.get('user_type', User.UserType.CLIENT)
        if user_type != User.UserType.ADMIN:
            validated_data['kyc_status'] = User.KYCStatus.PENDING
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
    profile_complete = serializers.SerializerMethodField()
    profile_missing_fields = serializers.SerializerMethodField()
    kyc_access_status = serializers.SerializerMethodField()
    can_access_platform = serializers.SerializerMethodField()
    kyc_block_message = serializers.SerializerMethodField()
    id_card_front_url = serializers.SerializerMethodField()
    id_card_back_url = serializers.SerializerMethodField()
    selfie_verification_url = serializers.SerializerMethodField()
    has_id_card_front = serializers.SerializerMethodField()
    has_id_card_back = serializers.SerializerMethodField()
    has_selfie_verification = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone_number', 'user_type', 'secondary_role', 'active_role',
            'profile_picture', 'bio', 'address',
            'city', 'country', 'wallet_address', 'kyc_status', 'nina',
            'email_verified', 'phone_verified', 'two_factor_enabled',
            'gps_tracking_enabled', 'is_active', 'created_at', 'updated_at',
            'kyc_submitted_at', 'kyc_verified_at', 'kyc_rejection_reason',
            'id_card_front_url', 'id_card_back_url', 'selfie_verification_url',
            'has_id_card_front', 'has_id_card_back', 'has_selfie_verification',
            'provider_profile', 'enterprise_profile',
            'profile_complete', 'profile_missing_fields',
            'kyc_access_status', 'can_access_platform', 'kyc_block_message',
        ]
        read_only_fields = [
            'id', 'username', 'email', 'kyc_status', 'email_verified', 'phone_verified',
            'created_at', 'updated_at', 'secondary_role', 'profile_complete',
            'profile_missing_fields', 'kyc_submitted_at', 'kyc_verified_at', 'kyc_rejection_reason',
            'id_card_front_url', 'id_card_back_url', 'selfie_verification_url',
            'has_id_card_front', 'has_id_card_back', 'has_selfie_verification',
            'kyc_access_status', 'can_access_platform', 'kyc_block_message',
        ]

    def _file_url(self, obj, field_name: str) -> str | None:
        field = getattr(obj, field_name, None)
        if not field:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(field.url)
        return field.url

    def get_id_card_front_url(self, obj):
        return self._file_url(obj, 'id_card_front')

    def get_id_card_back_url(self, obj):
        return self._file_url(obj, 'id_card_back')

    def get_selfie_verification_url(self, obj):
        return self._file_url(obj, 'selfie_verification')

    def get_has_id_card_front(self, obj):
        return bool(obj.id_card_front)

    def get_has_id_card_back(self, obj):
        return bool(obj.id_card_back)

    def get_has_selfie_verification(self, obj):
        return bool(obj.selfie_verification)
    
    def get_profile_complete(self, obj):
        from .profile_completion import is_profile_complete
        return is_profile_complete(obj)

    def get_profile_missing_fields(self, obj):
        from .profile_completion import get_profile_missing_fields
        return get_profile_missing_fields(obj)

    def get_kyc_access_status(self, obj):
        from .kyc_access import get_kyc_access_status
        return get_kyc_access_status(obj)

    def get_can_access_platform(self, obj):
        from .kyc_access import can_access_platform
        return can_access_platform(obj)

    def get_kyc_block_message(self, obj):
        from .kyc_access import get_kyc_block_message, can_access_platform
        if can_access_platform(obj):
            return ''
        return get_kyc_block_message(obj)
    
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
            'phone_number', 'user_type', 'kyc_status', 'kyc_rejection_reason',
            'is_active', 'email_verified', 'created_at', 'last_login', 'wallet_address',
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'wallet_address']

    def validate(self, attrs):
        new_status = attrs.get('kyc_status')
        if new_status == User.KYCStatus.REJECTED:
            reason = (attrs.get('kyc_rejection_reason') or '').strip()
            if not reason and self.instance:
                reason = (self.instance.kyc_rejection_reason or '').strip()
            if not reason:
                raise serializers.ValidationError({
                    'kyc_rejection_reason': 'Le motif de rejet est obligatoire.',
                })
            attrs['kyc_rejection_reason'] = reason
        if new_status == User.KYCStatus.VERIFIED:
            attrs['kyc_rejection_reason'] = ''
        return attrs


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
    website = serializers.URLField(required=False, allow_blank=True)
    company_email = serializers.EmailField(required=False, allow_blank=True)
    
    class Meta:
        model = EnterpriseProfile
        fields = [
            'id', 'company_name', 'rccm', 'ifu', 'trade_register',
            'company_email', 'company_phone', 'website', 'address', 'city',
            'total_employees', 'total_missions_posted', 'total_spent',
            'reputation_score', 'deposit_balance', 'deposit_locked',
            'is_verified', 'verified_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['deposit_balance', 'deposit_locked']


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
        read_only_fields = [
            'id', 'enterprise', 'user', 'user_email', 'created_at',
            'missions_completed', 'missions_failed',
        ]


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
            'kyc_status', 'kyc_submitted_at', 'kyc_verified_at', 'phone_verified',
        ]
        read_only_fields = ['kyc_status', 'kyc_submitted_at', 'kyc_verified_at', 'phone_verified']

    def validate(self, attrs):
        user = self.instance
        nina = attrs.get('nina') or (user.nina if user else None)
        id_front = attrs.get('id_card_front') or (user.id_card_front if user else None)
        id_back = attrs.get('id_card_back') or (user.id_card_back if user else None)
        selfie = attrs.get('selfie_verification') or (user.selfie_verification if user else None)

        if not nina:
            raise serializers.ValidationError({'nina': 'Le NINA est obligatoire.'})
        if not id_front:
            raise serializers.ValidationError({'id_card_front': 'La pièce d\'identité (recto) est obligatoire.'})
        if not id_back:
            raise serializers.ValidationError({'id_card_back': 'La pièce d\'identité (verso) est obligatoire.'})
        if not selfie:
            raise serializers.ValidationError({'selfie_verification': 'La photo d\'identité (selfie) est obligatoire.'})
        if user and not user.phone_verified:
            raise serializers.ValidationError(
                'Vérifiez votre numéro de téléphone avant de soumettre le dossier KYC.'
            )
        return attrs


class PhoneVerificationRequestSerializer(serializers.Serializer):
    nina = serializers.CharField(max_length=20)
    phone_number = serializers.CharField(max_length=17)


class PhoneVerificationConfirmSerializer(serializers.Serializer):
    otp = serializers.CharField(min_length=6, max_length=6)


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


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """Sérialiseur liste utilisateurs (light)"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'user_type', 'kyc_status', 'is_active', 'created_at', 'last_login',
            'phone_number', 'wallet_address', 'email_verified',
            'nina', 'kyc_submitted_at', 'kyc_verified_at', 'kyc_rejection_reason',
        ]


class AdminKycListSerializer(serializers.ModelSerializer):
    """Liste KYC admin — inclut les URLs des pièces justificatives."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    id_card_front_url = serializers.SerializerMethodField()
    id_card_back_url = serializers.SerializerMethodField()
    selfie_verification_url = serializers.SerializerMethodField()
    has_id_card_front = serializers.SerializerMethodField()
    has_id_card_back = serializers.SerializerMethodField()
    has_selfie_verification = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'user_type', 'kyc_status', 'is_active', 'created_at', 'last_login',
            'phone_number', 'phone_verified', 'email_verified', 'city', 'country',
            'nina', 'kyc_submitted_at', 'kyc_verified_at', 'kyc_rejection_reason',
            'id_card_front_url', 'id_card_back_url', 'selfie_verification_url',
            'has_id_card_front', 'has_id_card_back', 'has_selfie_verification',
            'company_name',
        ]

    def _file_url(self, obj, field_name: str):
        field = getattr(obj, field_name, None)
        if not field:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(field.url)
        return field.url

    def get_id_card_front_url(self, obj):
        return self._file_url(obj, 'id_card_front')

    def get_id_card_back_url(self, obj):
        return self._file_url(obj, 'id_card_back')

    def get_selfie_verification_url(self, obj):
        return self._file_url(obj, 'selfie_verification')

    def get_has_id_card_front(self, obj):
        return bool(obj.id_card_front)

    def get_has_id_card_back(self, obj):
        return bool(obj.id_card_back)

    def get_has_selfie_verification(self, obj):
        return bool(obj.selfie_verification)

    def get_company_name(self, obj):
        profile = getattr(obj, 'enterprise_profile', None)
        if profile and profile.company_name:
            return profile.company_name
        return ''


class EmailVerificationConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)


class EmailResendSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
