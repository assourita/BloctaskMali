"""
BlockTask Mission Models
Modèles pour la gestion des missions et tâches
"""

from django.db import models
from django.core.validators import MinValueValidator
import uuid


class Category(models.Model):
    """Catégories de missions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Nom d'icône
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categories'
        ordering = ['order', 'name']
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name


class Mission(models.Model):
    """Mission principale créée par un client"""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PENDING = 'pending', 'En attente'
        FUNDED = 'funded', 'Financée'  # Fonds bloqués en escrow
        ACCEPTED = 'accepted', 'Acceptée'  # Par un prestataire
        IN_PROGRESS = 'in_progress', 'En cours'
        SUBMITTED = 'submitted', 'Preuves soumises'
        COMPLETED = 'completed', 'Terminée'
        CANCELLED = 'cancelled', 'Annulée'
        DISPUTED = 'disputed', 'En litige'
        EXPIRED = 'expired', 'Expirée'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        NORMAL = 'normal', 'Normale'
        HIGH = 'high', 'Haute'
        URGENT = 'urgent', 'Urgente'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)
    
    # Relations
    client = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='client_missions'
    )
    provider = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        related_name='provider_missions',
        blank=True,
        null=True
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='missions'
    )
    
    # Informations de base
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    
    # Localisation
    pickup_address = models.TextField(blank=True)
    pickup_latitude = models.FloatField(blank=True, null=True)
    pickup_longitude = models.FloatField(blank=True, null=True)
    # pickup_point - removed GIS dependency
    
    delivery_address = models.TextField(blank=True)
    delivery_latitude = models.FloatField(blank=True, null=True)
    delivery_longitude = models.FloatField(blank=True, null=True)
    # delivery_point - removed GIS dependency
    
    # Financier
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    final_price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, default='XOF')
    
    # Caution
    required_deposit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_paid = models.BooleanField(default=False)
    deposit_tx_hash = models.CharField(max_length=66, blank=True, null=True)
    
    # Timing
    deadline = models.DateTimeField()
    expected_duration = models.PositiveIntegerField(help_text="Durée estimée en minutes", default=60)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    
    # Options avancées
    requires_verified_provider = models.BooleanField(default=False)
    min_reputation_score = models.FloatField(default=0)
    enterprise_only = models.BooleanField(default=False)
    requires_gps_tracking = models.BooleanField(default=True)
    requires_qr_validation = models.BooleanField(default=False)
    
    # Validation automatique
    auto_validation_delay = models.PositiveIntegerField(
        help_text="Heures avant validation auto",
        default=24
    )
    auto_validation_scheduled_at = models.DateTimeField(blank=True, null=True)
    
    # Blockchain
    escrow_tx_hash = models.CharField(max_length=66, blank=True, null=True)
    mission_contract_id = models.PositiveIntegerField(blank=True, null=True)
    blockchain_status = models.CharField(max_length=20, default='pending')
    
    # Métadonnées
    views_count = models.PositiveIntegerField(default=0)
    applications_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'missions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['category', 'status']),
        ]
    
    def __str__(self):
        return f"#{str(self.id)[:8]} - {self.title[:50]}"
    
    @property
    def is_active(self):
        return self.status in [
            self.Status.FUNDED,
            self.Status.ACCEPTED,
            self.Status.IN_PROGRESS,
            self.Status.SUBMITTED
        ]
    
    @property
    def can_be_cancelled(self):
        return self.status in [self.Status.PENDING, self.Status.FUNDED]


class MissionApplication(models.Model):
    """Candidature d'un prestataire à une mission"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        ACCEPTED = 'accepted', 'Acceptée'
        REJECTED = 'rejected', 'Rejetée'
        WITHDRAWN = 'withdrawn', 'Retirée'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        Mission,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    provider = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='applications'
    )
    
    # Proposition
    proposed_price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    message = models.TextField(blank=True)
    estimated_duration = models.PositiveIntegerField(help_text="Minutes", blank=True, null=True)
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'mission_applications'
        unique_together = ['mission', 'provider']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.provider} → {self.mission}"


class MissionStatusHistory(models.Model):
    """Historique des changements de statut"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        Mission,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mission_status_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Mission Status Histories'
    
    def __str__(self):
        return f"{self.mission}: {self.old_status} → {self.new_status}"


class MissionBookmark(models.Model):
    """Missions sauvegardées par les prestataires"""
    
    provider = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='bookmarked_missions'
    )
    mission = models.ForeignKey(
        Mission,
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mission_bookmarks'
        unique_together = ['provider', 'mission']
    
    def __str__(self):
        return f"{self.provider} bookmarked {self.mission}"


class MissionReview(models.Model):
    """Évaluation après mission"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.OneToOneField(
        Mission,
        on_delete=models.CASCADE,
        related_name='review'
    )
    
    # Évaluation client → prestataire
    client_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)], blank=True, null=True)
    client_comment = models.TextField(blank=True)
    client_reviewed_at = models.DateTimeField(blank=True, null=True)
    
    # Évaluation prestataire → client
    provider_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)], blank=True, null=True)
    provider_comment = models.TextField(blank=True)
    provider_reviewed_at = models.DateTimeField(blank=True, null=True)
    
    # Signalement
    client_reported_issue = models.TextField(blank=True)
    provider_reported_issue = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mission_reviews'
    
    def __str__(self):
        return f"Review for {self.mission}"


class MissionCategoryPrice(models.Model):
    """Prix suggérés par catégorie et zone"""
    
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    city = models.CharField(max_length=100)
    min_price = models.DecimalField(max_digits=15, decimal_places=2)
    max_price = models.DecimalField(max_digits=15, decimal_places=2)
    average_price = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='XOF')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mission_category_prices'
        unique_together = ['category', 'city']
    
    def __str__(self):
        return f"{self.category} - {self.city}: {self.average_price}"
