"""
BlockTask Reputation Models
Système de réputation algorithmique
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ReputationScore(models.Model):
    """Score de réputation calculé pour chaque utilisateur"""
    
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='reputation'
    )
    
    # Score global (0-100)
    overall_score = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Composantes du score
    success_rate_score = models.FloatField(default=40.0)  # 40% du total
    rating_score = models.FloatField(default=22.5)  # 30% du total (normalisé 0-30)
    dispute_score = models.FloatField(default=20.0)  # 20% du total
    volume_score = models.FloatField(default=0.0)  # 10% du total
    
    # Statistiques brutes
    total_missions = models.PositiveIntegerField(default=0)
    successful_missions = models.PositiveIntegerField(default=0)
    failed_missions = models.PositiveIntegerField(default=0)
    cancelled_missions = models.PositiveIntegerField(default=0)
    
    # Évaluations
    total_rating_sum = models.PositiveIntegerField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    average_rating = models.FloatField(default=0)
    
    # Litiges
    dispute_count = models.PositiveIntegerField(default=0)
    dispute_won = models.PositiveIntegerField(default=0)
    dispute_lost = models.PositiveIntegerField(default=0)
    
    # Délai
    on_time_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    on_time_rate = models.FloatField(default=100.0)
    
    # Niveau
    level = models.CharField(max_length=20, default='bronze')
    
    # Historique
    last_calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reputation_scores'
        ordering = ['-overall_score']
    
    def __str__(self):
        return f"{self.user}: {self.overall_score}/100"
    
    @property
    def success_rate(self):
        if self.total_missions == 0:
            return 100.0
        return (self.successful_missions / self.total_missions) * 100
    
    @property
    def dispute_rate(self):
        if self.total_missions == 0:
            return 0.0
        return (self.dispute_count / self.total_missions) * 100


class ReputationHistory(models.Model):
    """Historique des changements de réputation"""
    
    class EventType(models.TextChoices):
        MISSION_COMPLETED = 'mission_completed', 'Mission terminée'
        MISSION_FAILED = 'mission_failed', 'Mission échouée'
        RATING_RECEIVED = 'rating_received', 'Évaluation reçue'
        DISPUTE_OPENED = 'dispute_opened', 'Litige ouvert'
        DISPUTE_RESOLVED = 'dispute_resolved', 'Litige résolu'
        LEVEL_UP = 'level_up', 'Niveau supérieur'
        PENALTY = 'penalty', 'Pénalité'
        BONUS = 'bonus', 'Bonus'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='reputation_history'
    )
    
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Changement
    old_score = models.FloatField()
    new_score = models.FloatField()
    change_amount = models.FloatField()
    
    # Détails
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reputation_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Reputation Histories'
    
    def __str__(self):
        return f"{self.user}: {self.change_amount:+.1f} ({self.event_type})"


class ReputationLevel(models.Model):
    """Configuration des niveaux de réputation"""
    
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)
    
    # Seuils
    min_score = models.FloatField()
    max_score = models.FloatField()
    min_missions = models.PositiveIntegerField(default=0)
    
    # Avantages
    deposit_discount_percent = models.PositiveSmallIntegerField(default=0)
    priority_access = models.BooleanField(default=False)
    can_accept_urgent = models.BooleanField(default=False)
    
    # Visuel
    color = models.CharField(max_length=7, default='#CD7F32')  # Couleur hex
    icon = models.CharField(max_length=50, blank=True)
    badge_url = models.URLField(blank=True)
    
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'reputation_levels'
        ordering = ['min_score']
    
    def __str__(self):
        return f"{self.name} ({self.min_score}-{self.max_score})"


class ReputationPenalty(models.Model):
    """Pénalités de réputation"""
    
    class PenaltyType(models.TextChoices):
        LATE_DELIVERY = 'late_delivery', 'Livraison en retard'
        NO_SHOW = 'no_show', 'Absence'
        FAKE_PROOF = 'fake_proof', 'Fausse preuve'
        RUDE_BEHAVIOR = 'rude_behavior', 'Comportement inapproprié'
        CANCELLATION = 'cancellation', 'Annulation'
        SPAM = 'spam', 'Spam'
        FRAUD = 'fraud', 'Fraude'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='penalties'
    )
    
    penalty_type = models.CharField(max_length=30, choices=PenaltyType.choices)
    points_deducted = models.FloatField()
    
    # Contexte
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    description = models.TextField()
    
    # Appliqué par
    applied_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='penalties_applied'
    )
    
    # Durée
    is_temporary = models.BooleanField(default=False)
    expires_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reputation_penalties'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user}: -{self.points_deducted} ({self.penalty_type})"


class ReputationBonus(models.Model):
    """Bonus de réputation"""
    
    class BonusType(models.TextChoices):
        STREAK = 'streak', 'Série de missions'
        PERFECT_RATING = 'perfect_rating', 'Évaluation parfaite'
        EARLY_DELIVERY = 'early_delivery', 'Livraison anticipée'
        REFERRAL = 'referral', 'Parrainage'
        SPECIAL_EVENT = 'special_event', 'Événement spécial'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='bonuses'
    )
    
    bonus_type = models.CharField(max_length=30, choices=BonusType.choices)
    points_added = models.FloatField()
    description = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reputation_bonuses'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user}: +{self.points_added} ({self.bonus_type})"


class TrustFactor(models.Model):
    """Facteurs de confiance additionnels"""
    
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='trust_factor'
    )
    
    # Vérifications
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    identity_verified = models.BooleanField(default=False)
    address_verified = models.BooleanField(default=False)
    
    # Ancienneté
    account_age_days = models.PositiveIntegerField(default=0)
    
    # Activité
    login_frequency = models.FloatField(default=0)  # Connexions par semaine
    response_time_avg = models.FloatField(default=0)  # Minutes
    
    # Score composite
    trust_score = models.FloatField(default=50.0)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trust_factors'
    
    def __str__(self):
        return f"{self.user}: Trust {self.trust_score}"
