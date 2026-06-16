import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class EscrowTransaction(models.Model):
    """Transactions escrow sur la blockchain"""
    TRANSACTION_TYPES = [
        ('deposit', 'Dépôt'),
        ('release', 'Libération'),
        ('refund', 'Remboursement'),
        ('penalty', 'Pénalité'),
        ('bonus', 'Bonus'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='escrow_transactions'
    )
    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='client_escrow_transactions'
    )
    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='provider_escrow_transactions',
        null=True,
        blank=True
    )
    
    # Type et statut
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Montants
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='USDT')
    
    # Blockchain
    blockchain_mission_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="ID de la mission sur la blockchain"
    )
    deposit_tx_hash = models.CharField(
        max_length=100,
        blank=True,
        help_text="Hash de la transaction de dépôt"
    )
    release_tx_hash = models.CharField(
        max_length=100,
        blank=True,
        help_text="Hash de la transaction de libération"
    )
    
    # Métadonnées
    block_number = models.BigIntegerField(null=True, blank=True)
    gas_used = models.BigIntegerField(null=True, blank=True)
    confirmations = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    # Raison (pour remboursements/pénalités)
    reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mission', 'status']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['deposit_tx_hash']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Escrow {self.transaction_type} - {self.amount} {self.currency}"


class ProviderDeposit(models.Model):
    """Cautions des prestataires"""
    DEPOSIT_STATUS = [
        ('active', 'Active'),
        ('locked', 'Verrouillée'),
        ('released', 'Libérée'),
        ('forfeited', 'Confisquée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='deposits'
    )
    
    # Montant
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='USDT')
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=DEPOSIT_STATUS,
        default='active'
    )
    
    # Blockchain
    blockchain_deposit_id = models.CharField(max_length=100, blank=True)
    deposit_tx_hash = models.CharField(max_length=100, blank=True)
    
    # Utilisation
    locked_for_mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_deposits'
    )
    
    # Calcul dynamique
    is_dynamic = models.BooleanField(default=False)
    calculated_required_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Deposit {self.provider.username} - {self.amount} {self.currency}"


class PaymentLog(models.Model):
    """Journal des paiements"""
    PAYMENT_METHODS = [
        ('crypto', 'Crypto (USDT/ETH)'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Virement Bancaire'),
        ('card', 'Carte Bancaire'),
    ]
    
    PAYMENT_STATUS = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_logs'
    )
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_logs'
    )
    
    # Détails du paiement
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='USDT')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # Mobile Money (si applicable)
    mobile_provider = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('orange', 'Orange Money'),
            ('moov', 'Moov Money'),
            ('wave', 'Wave'),
            ('mtn', 'MTN Mobile Money'),
        ]
    )
    phone_number = models.CharField(max_length=20, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    
    # Références
    description = models.TextField(blank=True)
    external_reference = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.user.username} - {self.amount} {self.currency}"


class BlockchainEvent(models.Model):
    """Événements blockchain reçus"""
    EVENT_TYPES = [
        ('mission_created', 'Mission Created'),
        ('mission_accepted', 'Mission Accepted'),
        ('proof_submitted', 'Proof Submitted'),
        ('mission_validated', 'Mission Validated'),
        ('mission_cancelled', 'Mission Cancelled'),
        ('payment_released', 'Payment Released'),
        ('deposit_locked', 'Deposit Locked'),
        ('deposit_released', 'Deposit Released'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='blockchain_events',
        null=True,
        blank=True
    )
    
    # Données brutes
    contract_address = models.CharField(max_length=100)
    transaction_hash = models.CharField(max_length=100)
    block_number = models.BigIntegerField()
    log_index = models.PositiveIntegerField()
    
    # Données décodées
    event_data = models.JSONField(default=dict)
    
    # Traitement
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-block_number', '-log_index']
        unique_together = ['transaction_hash', 'log_index']
    
    def __str__(self):
        return f"{self.event_type} - Block {self.block_number}"
