"""
BlockTask Payment Serializers
"""

from rest_framework import serializers
from .models import Payment, PaymentRefund, UserPaymentMethod


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    
    class Meta:
        model = Payment
        fields = [
            'id', 'mission', 'client', 'amount', 'platform_fee',
            'escrow_amount', 'provider_amount', 'currency',
            'payment_method', 'status', 'operator', 'phone_number',
            'escrow_tx_hash', 'blockchain_network',
            'created_at', 'processed_at', 'completed_at',
            'is_escrow_funded'
        ]
        read_only_fields = [
            'id', 'client', 'platform_fee', 'escrow_amount',
            'provider_amount', 'escrow_tx_hash', 'status',
            'created_at', 'processed_at', 'completed_at'
        ]


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un paiement avec mission"""
    
    # Informations de paiement
    payment_method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices,
        default=Payment.PaymentMethod.MOBILE_MONEY
    )
    phone_number = serializers.CharField(required=False, allow_blank=True)
    operator = serializers.ChoiceField(
        choices=[
            ('orange', 'Orange Money'),
            ('wave', 'Wave'),
            ('mtn', 'MTN Mobile Money'),
            ('moov', 'Moov Money'),
        ],
        required=False,
        allow_blank=True
    )
    
    class Meta:
        model = Payment
        fields = [
            'payment_method', 'phone_number', 'operator'
        ]
    
    def validate(self, data):
        """Valide les données de paiement"""
        if data.get('payment_method') == Payment.PaymentMethod.MOBILE_MONEY:
            if not data.get('phone_number'):
                raise serializers.ValidationError(
                    "Le numéro de téléphone est requis pour le paiement Mobile Money."
                )
            if not data.get('operator'):
                raise serializers.ValidationError(
                    "L'opérateur est requis pour le paiement Mobile Money."
                )
        return data


class PaymentRefundSerializer(serializers.ModelSerializer):
    """Serializer pour les remboursements"""
    
    class Meta:
        model = PaymentRefund
        fields = [
            'id', 'payment', 'amount', 'reason', 'reason_details',
            'status', 'processed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'processed_at', 'created_at'
        ]


class UserPaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer pour les méthodes de paiement de l'utilisateur"""
    
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPaymentMethod
        fields = [
            'id', 'type', 'is_default', 'is_verified',
            'phone_number', 'operator',
            'card_last_four', 'card_brand', 'card_expiry_month', 'card_expiry_year',
            'account_number', 'bank_name', 'account_holder_name',
            'is_active', 'created_at', 'display_name'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']
        extra_kwargs = {
            'external_token': {'write_only': True}
        }
    
    def get_display_name(self, obj):
        """Retourne un nom affichable"""
        return str(obj)
    
    def validate(self, data):
        """Valide selon le type de paiement"""
        payment_type = data.get('type')
        
        if payment_type == UserPaymentMethod.Type.MOBILE_MONEY:
            if not data.get('phone_number'):
                raise serializers.ValidationError(
                    "Le numéro de téléphone est requis."
                )
            if not data.get('operator'):
                raise serializers.ValidationError(
                    "L'opérateur est requis."
                )
        
        elif payment_type == UserPaymentMethod.Type.CARD:
            if not data.get('card_last_four') or not data.get('card_brand'):
                raise serializers.ValidationError(
                    "Les informations de carte sont incomplètes."
                )
        
        elif payment_type == UserPaymentMethod.Type.BANK_ACCOUNT:
            if not data.get('account_number') or not data.get('bank_name'):
                raise serializers.ValidationError(
                    "Les informations bancaires sont incomplètes."
                )
        
        return data
