from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Category, Mission, MissionApplication, 
    MissionStatusHistory, MissionBookmark, MissionReview
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour les informations utilisateur"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_picture']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories de missions"""
    mission_count = serializers.IntegerField(source='missions.count', read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'icon', 'description',
            'order', 'is_active', 'mission_count', 'created_at'
        ]
        read_only_fields = ['created_at']


class MissionListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des missions (aperçu)"""
    client = UserBasicSerializer(read_only=True)
    provider = UserBasicSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    application_count = serializers.IntegerField(source='applications.count', read_only=True)
    distance_km = serializers.SerializerMethodField()
    
    class Meta:
        model = Mission
        fields = [
            'id', 'title', 'mission_hash', 'category', 'category_name', 'category_icon',
            'client', 'provider', 'status', 'priority',
            'budget', 'deposit_amount', 'currency',
            'pickup_address', 'delivery_address',
            'deadline', 'expected_duration',
            'requires_verified_provider', 'application_count',
            'distance_km', 'created_at'
        ]
    
    def get_distance_km(self, obj):
        """Calcule la distance si les coordonnées sont disponibles"""
        if obj.pickup_latitude and obj.pickup_longitude and obj.delivery_latitude and obj.delivery_longitude:
            # Calcul simplifié - en production utiliser geopy
            from math import radians, sin, cos, sqrt, atan2
            
            R = 6371  # Rayon de la Terre en km
            
            lat1 = radians(float(obj.pickup_latitude))
            lon1 = radians(float(obj.pickup_longitude))
            lat2 = radians(float(obj.delivery_latitude))
            lon2 = radians(float(obj.delivery_longitude))
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            
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
    
    requirements = serializers.SerializerMethodField()
    
    class Meta:
        model = Mission
        fields = [
            'id', 'mission_hash', 'title', 'description', 'category',
            'client', 'provider', 'status', 'priority',
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'delivery_address', 'delivery_latitude', 'delivery_longitude',
            'budget', 'final_price', 'currency',
            'required_deposit', 'deposit_amount', 'deposit_paid', 'deposit_tx_hash',
            'deadline', 'expected_duration', 'started_at', 'completed_at',
            'requires_verified_provider', 'min_reputation_score', 'enterprise_only',
            'requires_gps_tracking', 'requires_qr_validation',
            'auto_validation_delay', 'auto_validation_scheduled_at',
            'escrow_tx_hash', 'mission_contract_id', 'blockchain_status',
            'views_count', 'applications_count',
            'requirements',
            'created_at', 'updated_at',
            'status_history', 'is_applied', 'can_apply'
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
        if request.user.user_type != 'provider':
            return False
        if obj.status != 'open':
            return False
        if obj.applications.filter(provider=request.user).exists():
            return False
        return False
    
    def get_requirements(self, obj):
        """Parse les requirements JSON"""
        if obj.requirements:
            try:
                import json
                return json.loads(obj.requirements)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}


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
            'escrow_enabled', 'escrow_amount', 'platform_fee',
            'start_time', 'end_time', 'estimated_duration',
            'payment_method', 'country_code', 'phone_number', 'operator'
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
        """Validation personnalisée"""
        # Vérifier que le budget est positif
        if data.get('budget', 0) <= 0:
            raise serializers.ValidationError(
                "Le budget doit être supérieur à 0"
            )

        # Vérifier la deadline
        from django.utils import timezone
        if data.get('deadline') and data['deadline'] < timezone.now():
            raise serializers.ValidationError(
                "La deadline ne peut pas être dans le passé"
            )

        # Calculer automatiquement le dépôt (10% par défaut)
        from decimal import Decimal
        if data.get('budget'):
            data['required_deposit'] = data['budget'] * Decimal('0.10')
            data['deposit_amount'] = data.get('escrow_amount', data['budget'] * Decimal('0.10'))

        # Store requirements as JSON
        requirements = {}
        if data.get('requires_vehicle'):
            requirements['requires_vehicle'] = True
        if data.get('requires_photo'):
            requirements['requires_photo'] = True
        if data.get('requires_signature'):
            requirements['requires_signature'] = True
        if data.get('requires_id_verification'):
            requirements['requires_id_verification'] = True
        if data.get('special_instructions'):
            requirements['special_instructions'] = data['special_instructions']
        if data.get('estimated_duration'):
            requirements['estimated_duration'] = data['estimated_duration']
        if data.get('start_time'):
            requirements['start_time'] = data['start_time']
        if data.get('end_time'):
            requirements['end_time'] = data['end_time']

        data['requirements'] = requirements

        return data

    def create(self, validated_data):
        """Création de la mission avec paiement"""
        from apps.payments.models import Payment
        
        request = self.context['request']
        
        # Extract payment data
        payment_method = validated_data.pop('payment_method', 'mobile_money')
        country_code = validated_data.pop('country_code', '+225')
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

        mission = super().create(validated_data)
        
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
    provider = UserBasicSerializer(read_only=True)
    mission_title = serializers.CharField(source='mission.title', read_only=True)
    
    class Meta:
        model = MissionApplication
        fields = [
            'id', 'mission', 'mission_title', 'provider',
            'proposed_price', 'estimated_duration',
            'cover_message', 'proposed_deadline',
            'status', 'auto_assignment_score',
            'client_notes', 'provider_notes',
            'accepted_at', 'rejected_at', 'created_at'
        ]
        read_only_fields = ['status', 'accepted_at', 'rejected_at', 'created_at']
    
    def validate(self, data):
        """Validation de la candidature"""
        mission = data.get('mission')
        request = self.context.get('request')
        
        if mission and request:
            # Vérifier que l'utilisateur n'a pas déjà postulé
            if MissionApplication.objects.filter(
                mission=mission,
                provider=request.user
            ).exists():
                raise serializers.ValidationError(
                    "Vous avez déjà postulé à cette mission"
                )
            
            # Vérifier que la mission est ouverte
            if mission.status != 'open':
                raise serializers.ValidationError(
                    "Cette mission n'est plus ouverte aux candidatures"
                )
        
        return data
    
    def create(self, validated_data):
        """Création de la candidature"""
        validated_data['provider'] = self.context['request'].user
        validated_data['status'] = 'pending'
        
        return super().create(validated_data)


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
