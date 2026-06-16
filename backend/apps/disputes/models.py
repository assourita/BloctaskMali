"""
BlockTask Dispute Models
Gestion des litiges et arbitrage
"""

from django.db import models
import uuid


class Dispute(models.Model):
    """Litige ouvert pour une mission"""
    
    class Status(models.TextChoices):
        OPEN = 'open', 'Ouvert'
        UNDER_REVIEW = 'under_review', 'En cours d\'examen'
        PENDING_EVIDENCE = 'pending_evidence', 'Preuves en attente'
        ARBITRATION = 'arbitration', 'Arbitrage'
        RESOLVED = 'resolved', 'Résolu'
        APPEALED = 'appealed', 'En appel'
        CLOSED = 'closed', 'Fermé'
    
    class Reason(models.TextChoices):
        NON_DELIVERY = 'non_delivery', 'Non livraison'
        LATE_DELIVERY = 'late_delivery', 'Livraison en retard'
        DAMAGED_ITEM = 'damaged_item', 'Article endommagé'
        WRONG_ITEM = 'wrong_item', 'Mauvais article'
        POOR_QUALITY = 'poor_quality', 'Mauvaise qualité'
        INCOMPLETE_WORK = 'incomplete_work', 'Travail incomplet'
        FAKE_PROOF = 'fake_proof', 'Fausse preuve'
        PAYMENT_ISSUE = 'payment_issue', 'Problème de paiement'
        BEHAVIOR = 'behavior', 'Comportement inapproprié'
        OTHER = 'other', 'Autre'
    
    class Decision(models.TextChoices):
        PENDING = 'pending', 'En attente'
        CLIENT_WINS = 'client_wins', 'Client gagne'
        PROVIDER_WINS = 'provider_wins', 'Prestataire gagne'
        SPLIT = 'split', 'Partage 50/50'
        PARTIAL_CLIENT = 'partial_client', 'Remboursement partiel client'
        PARTIAL_PROVIDER = 'partial_provider', 'Paiement partiel prestataire'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispute_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)
    
    # Mission concernée
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='disputes'
    )
    
    # Parties
    plaintiff = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='disputes_filed'
    )
    defendant = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='disputes_received'
    )
    
    # Informations
    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.TextField()
    requested_resolution = models.TextField()
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN
    )
    
    # Décision
    decision = models.CharField(
        max_length=20,
        choices=Decision.choices,
        default=Decision.PENDING
    )
    decision_reason = models.TextField(blank=True)
    decided_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disputes_decided'
    )
    decided_at = models.DateTimeField(blank=True, null=True)
    
    # Financier
    client_refund_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )
    provider_payment_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )
    deposit_penalty = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )
    
    # Blockchain
    dispute_contract_id = models.PositiveIntegerField(blank=True, null=True)
    decision_tx_hash = models.CharField(max_length=66, blank=True, null=True)
    
    # Timing
    evidence_deadline = models.DateTimeField(blank=True, null=True)
    auto_resolve_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'disputes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Litige #{str(self.id)[:8]} - {self.mission}"


class DisputeEvidence(models.Model):
    """Preuves soumises pour un litige"""
    
    class EvidenceType(models.TextChoices):
        PHOTO = 'photo', 'Photo'
        VIDEO = 'video', 'Vidéo'
        DOCUMENT = 'document', 'Document'
        AUDIO = 'audio', 'Audio'
        SCREENSHOT = 'screenshot', 'Capture d\'écran'
        CHAT_LOG = 'chat_log', 'Historique de conversation'
        GPS_DATA = 'gps_data', 'Données GPS'
        SIGNATURE = 'signature', 'Signature'
        RECEIPT = 'receipt', 'Reçu'
        WITNESS = 'witness', 'Témoignage'
        EXPERT = 'expert', 'Rapport d\'expert'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name='evidence'
    )
    submitted_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='submitted_evidence'
    )
    
    evidence_type = models.CharField(max_length=20, choices=EvidenceType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Fichier ou données
    file = models.FileField(upload_to='disputes/evidence/', blank=True, null=True)
    file_hash = models.CharField(max_length=64, blank=True)
    blockchain_proof_hash = models.CharField(max_length=66, blank=True, null=True)
    
    # Métadonnées
    metadata = models.JSONField(default=dict, blank=True)
    is_accepted = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dispute_evidence'
        ordering = ['-created_at']
        verbose_name_plural = 'Dispute Evidence'
    
    def __str__(self):
        return f"{self.evidence_type} - {self.dispute}"


class DisputeMessage(models.Model):
    """Messages échangés pendant un litige"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='dispute_messages'
    )
    
    message = models.TextField()
    is_internal = models.BooleanField(default=False)  # Message interne entre arbitres
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dispute_messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender}: {self.message[:50]}..."


class Arbitrator(models.Model):
    """Arbitres du système"""
    
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='arbitrator_profile'
    )
    
    # Permissions
    can_resolve_disputes = models.BooleanField(default=True)
    can_moderate_content = models.BooleanField(default=False)
    can_suspend_users = models.BooleanField(default=False)
    
    # Statistiques
    disputes_handled = models.PositiveIntegerField(default=0)
    disputes_resolved = models.PositiveIntegerField(default=0)
    avg_resolution_time = models.FloatField(default=0)  # Heures
    
    # Disponibilité
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'arbitrators'
    
    def __str__(self):
        return f"Arbitre: {self.user.get_full_name()}"


class DisputeCategoryRule(models.Model):
    """Règles de résolution par catégorie de litige"""
    
    category = models.CharField(max_length=30, unique=True)
    
    # Délai de résolution
    resolution_deadline_hours = models.PositiveIntegerField(default=72)
    
    # Règles financières
    max_refund_percent = models.PositiveSmallIntegerField(default=100)
    min_penalty_percent = models.PositiveSmallIntegerField(default=0)
    
    # Processus
    requires_expert = models.BooleanField(default=False)
    requires_site_visit = models.BooleanField(default=False)
    
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'dispute_category_rules'
    
    def __str__(self):
        return f"Règles: {self.category}"


class DisputeAppeal(models.Model):
    """Appel d'une décision de litige"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        UNDER_REVIEW = 'under_review', 'En cours d\'examen'
        ACCEPTED = 'accepted', 'Accepté'
        REJECTED = 'rejected', 'Rejeté'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_dispute = models.OneToOneField(
        Dispute,
        on_delete=models.CASCADE,
        related_name='appeal'
    )
    
    appellant = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='appeals_filed'
    )
    
    reason = models.TextField()
    new_evidence = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    reviewed_by = models.ForeignKey(
        Arbitrator,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    review_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'dispute_appeals'
    
    def __str__(self):
        return f"Appel - {self.original_dispute}"
