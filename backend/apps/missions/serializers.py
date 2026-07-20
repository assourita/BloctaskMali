from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Category, Mission, MissionApplication, MissionSolicitation,
    MissionStatusHistory, MissionBookmark, MissionReview
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour les informations utilisateur"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_picture', 'city']


class MissionCounterpartySerializer(serializers.ModelSerializer):
    """Profil complet de la contrepartie — visible mission démarrée (client ↔ prestataire)."""
    reputation_score = serializers.FloatField(
        source='provider_profile.reputation_score', read_only=True, default=None,
    )
    completed_missions = serializers.IntegerField(
        source='provider_profile.total_missions_completed', read_only=True, default=None,
    )
    identity_verified = serializers.SerializerMethodField()
    enterprise_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'profile_picture',
            'email', 'phone_number', 'bio', 'city', 'country',
            'reputation_score', 'completed_missions', 'identity_verified',
            'enterprise_name',
        ]

    def get_identity_verified(self, obj):
        return obj.kyc_status == User.KYCStatus.VERIFIED

    def get_enterprise_name(self, obj):
        ent = getattr(obj, 'enterprise_profile', None)
        return ent.company_name if ent else None


class ProviderApplicationSerializer(serializers.ModelSerializer):
    """Prestataire — infos visibles par le client sur une candidature (sans contact direct)"""
    reputation_score = serializers.FloatField(
        source='provider_profile.reputation_score', read_only=True, default=50.0
    )
    completed_missions = serializers.IntegerField(
        source='provider_profile.total_missions_completed', read_only=True, default=0
    )
    level = serializers.CharField(
        source='provider_profile.level', read_only=True, default='bronze'
    )
    skills = serializers.JSONField(
        source='provider_profile.skills', read_only=True, default=list
    )
    is_available = serializers.BooleanField(
        source='provider_profile.is_available', read_only=True, default=True
    )
    identity_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'profile_picture',
            'bio', 'city', 'country',
            'reputation_score', 'completed_missions', 'level', 'skills', 'is_available',
            'identity_verified',
        ]

    def get_identity_verified(self, obj):
        return obj.kyc_status == User.KYCStatus.VERIFIED


class CategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories de missions"""
    mission_count = serializers.IntegerField(source='missions.count', read_only=True)
    rules = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'icon', 'description',
            'order', 'is_active', 'mission_count', 'rules', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_rules(self, obj):
        from .category_rules import get_category_rule
        return get_category_rule(obj).to_dict()


class MissionListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des missions (aperçu)"""
    client = UserBasicSerializer(read_only=True)
    provider = UserBasicSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True, allow_null=True)
    requirements = serializers.SerializerMethodField()
    deposit_required = serializers.SerializerMethodField()
    requirement_labels = serializers.SerializerMethodField()
    application_count = serializers.IntegerField(source='applications.count', read_only=True)
    distance_km = serializers.SerializerMethodField()
    is_applied = serializers.SerializerMethodField()
    can_apply = serializers.SerializerMethodField()
    apply_block_reason = serializers.SerializerMethodField()
    applications_open = serializers.SerializerMethodField()
    
    class Meta:
        model = Mission
        fields = [
            'id', 'title', 'mission_hash', 'category', 'category_name', 'category_icon', 'category_slug',
            'client', 'provider', 'status', 'priority',
            'budget', 'deposit_amount', 'required_deposit', 'deposit_paid', 'deposit_deadline', 'currency',
            'deposit_required', 'requirement_labels', 'requirements',
            'expiry_decision_pending', 'expiry_decision_due_at',
            'pickup_address', 'delivery_address',
            'deadline', 'expected_duration',
            'requires_verified_provider', 'enterprise_only', 'requires_gps_tracking',
            'application_count',
            'mission_contract_id', 'blockchain_status', 'escrow_tx_hash',
            'distance_km', 'is_applied', 'can_apply', 'apply_block_reason', 'applications_open', 'created_at'
        ]
    
    def get_is_applied(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.applications.filter(provider=request.user).exists()
        return False

    def get_can_apply(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from .eligibility import can_apply_to_mission
        return can_apply_to_mission(request.user, obj)

    def get_apply_block_reason(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .eligibility import get_apply_block_reason
        return get_apply_block_reason(request.user, obj)

    def get_applications_open(self, obj):
        from .eligibility import mission_is_open_for_applications
        return mission_is_open_for_applications(obj)

    def get_requirements(self, obj):
        from .requirements import parse_mission_requirements
        return parse_mission_requirements(obj)

    def get_deposit_required(self, obj):
        return bool(obj.required_deposit and float(obj.required_deposit) > 0)

    def get_requirement_labels(self, obj):
        from .requirements import parse_mission_requirements
        from .category_rules import get_category_rule
        req = parse_mission_requirements(obj)
        labels = list(req.get('requirement_labels') or [])
        if not labels:
            rule = get_category_rule(obj.category)
            labels = list(rule.requirement_labels)
        return labels

    def get_distance_km(self, obj):
        """Calcule la distance si les coordonnées sont disponibles."""
        if obj.pickup_latitude and obj.pickup_longitude and obj.delivery_latitude and obj.delivery_longitude:
            from math import radians, sin, cos, sqrt, atan2

            R = 6371  # Rayon de la Terre en km

            lat1 = radians(float(obj.pickup_latitude))
            lon1 = radians(float(obj.pickup_longitude))
            lat2 = radians(float(obj.delivery_latitude))
            lon2 = radians(float(obj.delivery_longitude))

            dlat = lat2 - lat1
            dlon = lon2 - lon1

            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))

            return round(R * c, 1)
        return None


class MissionDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une mission"""
    client = UserBasicSerializer(read_only=True)
    provider = UserBasicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    status_history = serializers.SerializerMethodField()
    is_applied = serializers.SerializerMethodField()
    can_apply = serializers.SerializerMethodField()
    apply_block_reason = serializers.SerializerMethodField()
    applications_open = serializers.SerializerMethodField()
    
    requirements = serializers.SerializerMethodField()
    
    payment_id = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    assigned_enterprise_id = serializers.UUIDField(read_only=True, allow_null=True)
    assigned_enterprise_name = serializers.CharField(
        source='assigned_enterprise.company_name', read_only=True, allow_null=True,
    )
    executing_employee = serializers.SerializerMethodField()
    category_rule = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()
    can_view_counterparty = serializers.SerializerMethodField()
    pending_applications_count = serializers.SerializerMethodField()
    deposit_policy = serializers.SerializerMethodField()

    class Meta:
        model = Mission
        fields = [
            'id', 'mission_hash', 'title', 'description', 'category',
            'client', 'provider', 'status', 'priority',
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'delivery_address', 'delivery_latitude', 'delivery_longitude',
            'budget', 'final_price', 'currency',
            'required_deposit', 'deposit_amount', 'deposit_paid', 'deposit_tx_hash', 'deposit_deadline',
            'deposit_policy', 'category_rule',
            'expiry_decision_pending', 'expiry_decision_due_at',
            'deadline', 'expected_duration', 'started_at', 'completed_at',
            'requires_verified_provider', 'min_reputation_score', 'enterprise_only',
            'requires_gps_tracking', 'provider_gps_consent_at', 'requires_qr_validation',
            'auto_validation_delay', 'auto_validation_scheduled_at',
            'escrow_tx_hash', 'mission_contract_id', 'blockchain_status',
            'views_count', 'applications_count', 'pending_applications_count',
            'requirements', 'payment_id', 'payment_status',
            'assigned_enterprise_id', 'assigned_enterprise_name', 'executing_employee',
            'counterparty', 'can_view_counterparty',
            'created_at', 'updated_at',
            'status_history', 'is_applied', 'can_apply', 'apply_block_reason', 'applications_open'
        ]
        read_only_fields = ['mission_hash', 'created_at', 'updated_at']
    
    def get_status_history(self, obj):
        """Récupère l'historique des statuts"""
        history = obj.status_history.all()[:10]
        return MissionStatusHistorySerializer(history, many=True).data
    
    def get_is_applied(self, obj):
        """Vérifie si l'utilisateur courant a déjà postulé"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.applications.filter(provider=request.user).exists()
        return False
    
    def get_can_apply(self, obj):
        """Vérifie si l'utilisateur peut postuler"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from .eligibility import can_apply_to_mission
        return can_apply_to_mission(request.user, obj)

    def get_apply_block_reason(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .eligibility import get_apply_block_reason
        return get_apply_block_reason(request.user, obj)

    def get_applications_open(self, obj):
        from .eligibility import mission_is_open_for_applications
        return mission_is_open_for_applications(obj)

    def get_payment_id(self, obj):
        payment = getattr(obj, 'payment', None)
        return str(payment.id) if payment else None

    def get_payment_status(self, obj):
        payment = getattr(obj, 'payment', None)
        return payment.status if payment else None

    def get_executing_employee(self, obj):
        emp = getattr(obj, 'executing_employee', None)
        if not emp:
            return None
        return {
            'id': str(emp.id),
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'email': emp.email or '',
        }
    
    def get_requirements(self, obj):
        from .requirements import parse_mission_requirements
        return parse_mission_requirements(obj)

    def get_category_rule(self, obj):
        from .category_rules import get_category_rule
        return get_category_rule(obj.category).to_dict()

    def get_deposit_policy(self, obj):
        from .requirements import parse_mission_requirements
        from .category_rules import get_category_rule
        rule = get_category_rule(obj.category)
        req = parse_mission_requirements(obj)
        return {
            'requires_deposit': bool(obj.required_deposit and float(obj.required_deposit) > 0),
            'required_deposit': float(obj.required_deposit or 0),
            'deposit_paid': obj.deposit_paid,
            'deposit_mode': req.get('deposit_mode') or rule.deposit_mode,
            'deposit_reason': req.get('deposit_reason') or rule.deposit_reason,
            'merchandise_value': req.get('merchandise_value'),
        }

    def get_can_view_counterparty(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from .counterparty import can_view_counterparty_profile
        return can_view_counterparty_profile(request.user, obj)

    def get_pending_applications_count(self, obj):
        return obj.applications.filter(status=MissionApplication.Status.PENDING).count()

    def get_counterparty(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .counterparty import can_view_counterparty_profile, get_counterparty_user
        if not can_view_counterparty_profile(request.user, obj):
            return None
        other = get_counterparty_user(obj, request.user)
        if not other:
            return None
        return MissionCounterpartySerializer(other, context=self.context).data


class MissionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'une mission avec paiement"""
    # Additional fields from frontend
    pickup_contact_name = serializers.CharField(required=False, allow_blank=True)
    pickup_contact_phone = serializers.CharField(required=False, allow_blank=True)
    delivery_contact_name = serializers.CharField(required=False, allow_blank=True)
    delivery_contact_phone = serializers.CharField(required=False, allow_blank=True)
    
    # GPS coordinates - allow null to handle empty strings from frontend
    pickup_latitude = serializers.FloatField(required=False, allow_null=True)
    pickup_longitude = serializers.FloatField(required=False, allow_null=True)
    delivery_latitude = serializers.FloatField(required=False, allow_null=True)
    delivery_longitude = serializers.FloatField(required=False, allow_null=True)
    requires_vehicle = serializers.BooleanField(required=False, default=False)
    requires_photo = serializers.BooleanField(required=False, default=False)
    requires_signature = serializers.BooleanField(required=False, default=False)
    requires_id_verification = serializers.BooleanField(required=False, default=False)
    merchandise_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True,
    )
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    estimated_duration = serializers.IntegerField(required=False, default=60)
    escrow_enabled = serializers.BooleanField(required=False, default=True)
    escrow_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    platform_fee = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    expected_duration = serializers.IntegerField(required=False, default=60)
    start_time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    end_time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    # Payment fields
    payment_method = serializers.CharField(required=False, allow_blank=True)
    country_code = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    operator = serializers.CharField(required=False, allow_blank=True)

    # Dynamic custom fields from category schema
    custom_data = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = Mission
        fields = [
            'title', 'description', 'category',
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'pickup_contact_name', 'pickup_contact_phone',
            'delivery_address', 'delivery_latitude', 'delivery_longitude',
            'delivery_contact_name', 'delivery_contact_phone',
            'budget', 'currency',
            'deadline', 'expected_duration',
            'requires_gps_tracking', 'requires_qr_validation',
            'special_instructions', 'requirements',
            'requires_vehicle', 'requires_photo', 'requires_signature', 'requires_id_verification',
            'merchandise_value',
            'escrow_enabled', 'escrow_amount', 'platform_fee',
            'start_time', 'end_time', 'estimated_duration',
            'payment_method', 'country_code', 'phone_number', 'operator',
            'custom_data',
        ]

    def to_internal_value(self, data):
        """Convert empty strings to None for coordinate fields"""
        import logging
        logger = logging.getLogger(__name__)
        
        coordinate_fields = ['pickup_latitude', 'pickup_longitude', 'delivery_latitude', 'delivery_longitude']
        for field in coordinate_fields:
            if field in data and data[field] == '':
                data[field] = None
        
        # Log incoming data for debugging
        logger.info(f"MissionCreateSerializer data: {data}")
        
        try:
            return super().to_internal_value(data)
        except Exception as e:
            logger.error(f"to_internal_value error: {e}")
            raise

    def validate(self, data):
        from decimal import Decimal
        from django.utils import timezone
        from .category_rules import (
            apply_category_defaults_to_mission_data,
            build_requirements_payload,
            calculate_category_deposit,
            get_category_rule,
        )

        if data.get('budget', 0) <= 0:
            raise serializers.ValidationError('Le budget doit être supérieur à 0')

        if data.get('deadline') and data['deadline'] < timezone.now():
            raise serializers.ValidationError('La deadline ne peut pas être dans le passé')

        category = data.get('category')
        rule = get_category_rule(category)
        data = apply_category_defaults_to_mission_data(data, category)

        if rule.requires_merchandise_value:
            mv = data.get('merchandise_value')
            if mv is None or Decimal(str(mv)) <= 0:
                raise serializers.ValidationError({
                    'merchandise_value': (
                        f'Pour « {rule.label} », indiquez la valeur de la marchandise confiée (XOF).'
                    ),
                })

        if rule.requires_pickup and not data.get('pickup_address'):
            raise serializers.ValidationError({'pickup_address': 'Adresse de retrait requise pour cette catégorie.'})
        if rule.requires_delivery and not data.get('delivery_address'):
            raise serializers.ValidationError({'delivery_address': 'Adresse de livraison requise pour cette catégorie.'})

        # Merge custom_data with requirements payload
        custom_data = data.get('custom_data', {})
        req_payload = {**data, 'requires_vehicle': rule.requires_vehicle or data.get('requires_vehicle')}
        req_payload.update(custom_data)
        
        requirements_dict = build_requirements_payload(req_payload, rule)
        data['_requirements_dict'] = requirements_dict

        import json
        from types import SimpleNamespace
        preview_mission = SimpleNamespace(
            category=category,
            budget=data['budget'],
            final_price=None,
            requirements=json.dumps(requirements_dict),
        )
        deposit = calculate_category_deposit(preview_mission)
        data['required_deposit'] = deposit
        data['deposit_amount'] = data.get('escrow_amount', deposit)
        data['requirements'] = json.dumps(requirements_dict)

        return data

    def create(self, validated_data):
        """Création de la mission avec paiement"""
        from apps.payments.models import Payment
        
        request = self.context['request']
        
        # Extract payment data
        payment_method = validated_data.pop('payment_method', 'mobile_money')
        country_code = validated_data.pop('country_code', '+223')
        phone_number = validated_data.pop('phone_number', '')
        operator = validated_data.pop('operator', '')
        escrow_amount = validated_data.pop('escrow_amount', validated_data.get('budget', 0))
        from decimal import Decimal
        platform_fee = validated_data.pop('platform_fee', validated_data.get('budget', 0) * Decimal('0.05'))
        
        validated_data['client'] = request.user
        validated_data['status'] = Mission.Status.PENDING

        # Remove extra fields not in model
        validated_data.pop('requires_vehicle', None)
        validated_data.pop('requires_photo', None)
        validated_data.pop('requires_signature', None)
        validated_data.pop('requires_id_verification', None)
        validated_data.pop('merchandise_value', None)
        validated_data.pop('special_instructions', None)
        validated_data.pop('estimated_duration', None)
        validated_data.pop('expected_duration', None)
        validated_data.pop('escrow_enabled', None)
        validated_data.pop('start_time', None)
        validated_data.pop('end_time', None)
        validated_data.pop('pickup_contact_name', None)
        validated_data.pop('pickup_contact_phone', None)
        validated_data.pop('delivery_contact_name', None)
        validated_data.pop('delivery_contact_phone', None)
        requirements_dict = validated_data.pop('_requirements_dict', None)
        validated_data.pop('custom_data', None)  # Remove custom_data as it's merged into requirements

        mission = super().create(validated_data)

        from .category_rules import calculate_category_deposit
        deposit = calculate_category_deposit(mission)
        if deposit and (not mission.required_deposit or float(mission.required_deposit) <= 0):
            mission.required_deposit = deposit
            mission.deposit_amount = deposit
            mission.save(update_fields=['required_deposit', 'deposit_amount', 'updated_at'])
        
        # Create associated payment
        try:
            Payment.objects.create(
                mission=mission,
                client=request.user,
                amount=mission.budget,
                platform_fee=platform_fee,
                escrow_amount=escrow_amount,
                provider_amount=mission.budget - platform_fee,
                currency=mission.currency,
                payment_method=payment_method,
                country_code=country_code,
                phone_number=phone_number,
                operator=operator,
                status=Payment.Status.PENDING
            )
        except Exception as e:
            # Log error but don't fail mission creation
            print(f"Error creating payment: {e}")

        return mission


class MissionApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour les candidatures"""
    provider = ProviderApplicationSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True)
    mission_budget = serializers.DecimalField(
        source='mission.budget', max_digits=15, decimal_places=2, read_only=True
    )
    mission_currency = serializers.CharField(source='mission.currency', read_only=True)

    class Meta:
        model = MissionApplication
        fields = [
            'id', 'mission', 'mission_title', 'mission_budget', 'mission_currency',
            'provider', 'proposed_price', 'estimated_duration', 'message',
            'status', 'responded_at', 'created_at'
        ]
        read_only_fields = ['status', 'responded_at', 'created_at']

    def validate(self, data):
        mission = data.get('mission')
        request = self.context.get('request')

        if mission and request:
            if MissionApplication.objects.filter(
                mission=mission, provider=request.user
            ).exists():
                raise serializers.ValidationError(
                    "Vous avez déjà postulé à cette mission"
                )
            if mission.status != Mission.Status.FUNDED:
                raise serializers.ValidationError(
                    "Cette mission n'est plus ouverte aux candidatures"
                )
        return data

    def create(self, validated_data):
        validated_data['provider'] = self.context['request'].user
        validated_data['status'] = MissionApplication.Status.PENDING
        if not validated_data.get('proposed_price') and validated_data.get('mission'):
            validated_data['proposed_price'] = validated_data['mission'].budget
        return super().create(validated_data)


class MissionSolicitationSerializer(serializers.ModelSerializer):
    """Sollicitation directe client → prestataire ou entreprise."""
    provider = ProviderApplicationSerializer(read_only=True)
    client = UserBasicSerializer(read_only=True)
    enterprise_id = serializers.UUIDField(source='enterprise.user_id', read_only=True, allow_null=True)
    enterprise_name = serializers.CharField(source='enterprise.company_name', read_only=True, allow_null=True)
    enterprise_city = serializers.CharField(source='enterprise.city', read_only=True, allow_null=True)
    enterprise_logo = serializers.SerializerMethodField()
    mission_title = serializers.CharField(source='mission.title', read_only=True)
    mission_budget = serializers.DecimalField(
        source='mission.budget', max_digits=15, decimal_places=2, read_only=True
    )
    mission_currency = serializers.CharField(source='mission.currency', read_only=True)
    mission_status = serializers.CharField(source='mission.status', read_only=True)
    pickup_address = serializers.CharField(source='mission.pickup_address', read_only=True)
    deadline = serializers.DateTimeField(source='mission.deadline', read_only=True)

    class Meta:
        model = MissionSolicitation
        fields = [
            'id', 'mission', 'mission_title', 'mission_budget', 'mission_currency',
            'mission_status', 'pickup_address', 'deadline', 'target_type',
            'provider', 'enterprise_id', 'enterprise_name', 'enterprise_city', 'enterprise_logo',
            'client', 'message', 'status', 'responded_at', 'created_at',
        ]
        read_only_fields = ['status', 'responded_at', 'created_at', 'client']

    def get_enterprise_logo(self, obj):
        if not obj.enterprise or not obj.enterprise.user.profile_picture:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.enterprise.user.profile_picture.url)
        return obj.enterprise.user.profile_picture.url


class ClientPreviewSerializer(serializers.ModelSerializer):
    """Profil client visible avant acceptation d'une sollicitation."""
    identity_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'profile_picture',
            'bio', 'city', 'country', 'identity_verified',
        ]

    def get_identity_verified(self, obj):
        return obj.kyc_status == User.KYCStatus.VERIFIED


class OtherSolicitationSerializer(serializers.ModelSerializer):
    """Autres sollicitations directes sur la même mission."""
    provider = UserBasicSerializer(read_only=True)
    enterprise_name = serializers.CharField(
        source='enterprise.company_name', read_only=True, allow_null=True,
    )

    class Meta:
        model = MissionSolicitation
        fields = [
            'id', 'target_type', 'status', 'provider', 'enterprise_name', 'created_at',
        ]


class MissionSolicitationPreviewSerializer(serializers.Serializer):
    """Contexte complet avant acceptation / refus."""
    solicitation = MissionSolicitationSerializer()
    mission = MissionDetailSerializer()
    client = ClientPreviewSerializer()
    applications = MissionApplicationSerializer(many=True)
    other_solicitations = OtherSolicitationSerializer(many=True)


class MissionStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer pour l'historique des statuts"""
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = MissionStatusHistory
        fields = [
            'id', 'old_status', 'new_status',
            'changed_by_name', 'reason',
            'created_at'
        ]


class MissionBookmarkSerializer(serializers.ModelSerializer):
    """Serializer pour les favoris"""
    mission = MissionListSerializer(read_only=True)
    
    class Meta:
        model = MissionBookmark
        fields = ['id', 'mission', 'notes', 'alert_enabled', 'created_at']


class MissionReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations"""
    reviewer = UserBasicSerializer(read_only=True)
    reviewed_user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MissionReview
        fields = [
            'id', 'mission', 'reviewer', 'reviewed_user',
            'rating', 'comment',
            'timeliness_score', 'communication_score', 'quality_score',
            'is_recommendation', 'is_visible', 'blockchain_hash',
            'created_at'
        ]
        read_only_fields = ['blockchain_hash', 'created_at']
    
    def validate_rating(self, value):
        """Validation de la note"""
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "La note doit être comprise entre 1 et 5"
            )
        return value


class MissionStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques des missions"""
    total_missions = serializers.IntegerField()
    open_missions = serializers.IntegerField()
    in_progress_missions = serializers.IntegerField()
    completed_missions = serializers.IntegerField()
    total_spent = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_mission_value = serializers.DecimalField(max_digits=15, decimal_places=2)
