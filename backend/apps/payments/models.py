"""
BlockTask Payment Models
Modèles pour la gestion des paiements et escrow
"""

from django.db import models
from django.core.validators import MinValueValidator
import uuid


class Payment(models.Model):
    """Paiement pour une mission (escrow client)"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PROCESSING = 'processing', 'En traitement'
        COMPLETED = 'completed', 'Complété'
        FAILED = 'failed', 'Échoué'
        REFUNDED = 'refunded', 'Remboursé'
        CANCELLED = 'cancelled', 'Annulé'
    
    class PaymentMethod(models.TextChoices):
        MOBILE_MONEY = 'mobile_money', 'Mobile Money'
        CARD = 'card', 'Carte bancaire'
        CRYPTO = 'crypto', 'Cryptomonnaie'
        BANK_TRANSFER = 'bank_transfer', 'Virement bancaire'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    mission = models.OneToOneField(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='payment'
    )
    client = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='payments_made'
    )
    
    # Montants
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Montant total de la mission"
    )
    platform_fee = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Frais de plateforme (5%)"
    )
    escrow_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Montant bloqué en escrow (100% du budget)"
    )
    provider_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Montant à payer au prestataire"
    )
    currency = models.CharField(max_length=3, default='XOF')
    
    # Méthode de paiement
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.MOBILE_MONEY
    )
    
    # Mobile Money details
    country_code = models.CharField(max_length=5, default='+223', blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    operator = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('orange', 'Orange Money'),
            ('wave', 'Wave'),
            ('mtn', 'MTN Mobile Money'),
            ('moov', 'Moov Money'),
        ]
    )
    
    # Transaction externe
    external_transaction_id = models.CharField(max_length=100, blank=True)
    external_reference = models.CharField(max_length=100, blank=True)
    
    # Blockchain / Escrow
    escrow_contract_address = models.CharField(max_length=42, blank=True)
    escrow_tx_hash = models.CharField(max_length=66, blank=True)
    blockchain_network = models.CharField(max_length=20, default='sepolia')
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    refunded_at = models.DateTimeField(blank=True, null=True)
    
    # Métadonnées
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency} ({self.status})"
    
    def calculate_fees(self):
        """Calcule les frais et montants"""
        self.platform_fee = self.amount * 0.05  # 5% frais plateforme
        self.escrow_amount = self.amount
        self.provider_amount = self.amount * 0.95  # 95% pour le prestataire
    
    def is_escrow_funded(self):
        """Vérifie si l'escrow est financé"""
        return self.status == self.Status.COMPLETED and self.escrow_tx_hash


class PaymentRefund(models.Model):
    """Remboursement de paiement"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PROCESSING = 'processing', 'En traitement'
        COMPLETED = 'completed', 'Complété'
        FAILED = 'failed', 'Échoué'
    
    class Reason(models.TextChoices):
        MISSION_CANCELLED = 'mission_cancelled', 'Mission annulée'
        NO_PROVIDER = 'no_provider', 'Aucun prestataire'
        DISPUTE_RESOLVED = 'dispute_resolved', 'Litige résolu'
        OTHER = 'other', 'Autre'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    reason = models.CharField(max_length=20, choices=Reason.choices)
    reason_details = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    transaction_id = models.CharField(max_length=100, blank=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_refunds'
    
    def __str__(self):
        return f"Refund {self.id} - {self.amount} ({self.status})"


class UserPaymentMethod(models.Model):
    """Méthodes de paiement sauvegardées par l'utilisateur"""
    
    class Type(models.TextChoices):
        MOBILE_MONEY = 'mobile_money', 'Mobile Money'
        CARD = 'card', 'Carte bancaire'
        BANK_ACCOUNT = 'bank_account', 'Compte bancaire'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    type = models.CharField(max_length=20, choices=Type.choices)
    is_default = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    
    # Mobile Money
    phone_number = models.CharField(max_length=20, blank=True)
    operator = models.CharField(max_length=20, blank=True)
    
    # Card (tokenized - ne stocker que les 4 derniers chiffres)
    card_last_four = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_expiry_month = models.PositiveSmallIntegerField(blank=True, null=True)
    card_expiry_year = models.PositiveSmallIntegerField(blank=True, null=True)
    
    # Bank
    account_number = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_holder_name = models.CharField(max_length=100, blank=True)
    
    # External token (from payment provider)
    external_token = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_payment_methods'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        if self.type == self.Type.MOBILE_MONEY:
            return f"{self.operator} - {self.phone_number}"
        elif self.type == self.Type.CARD:
            return f"{self.card_brand} ****{self.card_last_four}"
        return f"{self.bank_name} - {self.account_number[-4:]}"
