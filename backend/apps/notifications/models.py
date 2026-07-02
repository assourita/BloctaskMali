"""
BlockTask Notification Models
Système de notifications multi-canaux
"""

from django.db import models
import uuid


class Notification(models.Model):
    """Notification utilisateur"""
    
    class Type(models.TextChoices):
        MISSION_CREATED = 'mission_created', 'Mission créée'
        MISSION_ACCEPTED = 'mission_accepted', 'Mission acceptée'
        MISSION_STARTED = 'mission_started', 'Mission démarrée'
        MISSION_SUBMITTED = 'mission_submitted', 'Preuves soumises'
        MISSION_COMPLETED = 'mission_completed', 'Mission terminée'
        MISSION_CANCELLED = 'mission_cancelled', 'Mission annulée'
        MISSION_EXPIRED = 'mission_expired', 'Mission expirée'
        
        PAYMENT_RECEIVED = 'payment_received', 'Paiement reçu'
        PAYMENT_SENT = 'payment_sent', 'Paiement envoyé'
        DEPOSIT_LOCKED = 'deposit_locked', 'Caution bloquée'
        DEPOSIT_RELEASED = 'deposit_released', 'Caution libérée'
        REFUND_PROCESSED = 'refund_processed', 'Remboursement effectué'
        
        DISPUTE_OPENED = 'dispute_opened', 'Litige ouvert'
        DISPUTE_UPDATED = 'dispute_updated', 'Litige mis à jour'
        DISPUTE_RESOLVED = 'dispute_resolved', 'Litige résolu'
        
        REPUTATION_UPDATED = 'reputation_updated', 'Réputation mise à jour'
        LEVEL_UP = 'level_up', 'Niveau supérieur'
        
        KYC_VERIFIED = 'kyc_verified', 'KYC vérifié'
        KYC_REJECTED = 'kyc_rejected', 'KYC rejeté'
        
        MESSAGE_RECEIVED = 'message_received', 'Message reçu'
        SYSTEM_ANNOUNCEMENT = 'system_announcement', 'Annonce système'
        PROMOTION = 'promotion', 'Promotion'
        
        GPS_LOCATION = 'gps_location', 'Mise à jour GPS'
        MISSION_REMINDER = 'mission_reminder', 'Rappel mission'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        NORMAL = 'normal', 'Normale'
        HIGH = 'high', 'Haute'
        URGENT = 'urgent', 'Urgente'
    
    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'In-App'
        PUSH = 'push', 'Push'
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        ALL = 'all', 'Tous'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Priorité et canal
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    channel = models.CharField(
        max_length=10,
        choices=Channel.choices,
        default=Channel.ALL
    )
    
    # Contenu enrichi
    image_url = models.URLField(blank=True)
    action_url = models.CharField(max_length=500, blank=True)  # Deep link
    data = models.JSONField(default=dict, blank=True)  # Payload additionnel
    
    # Relations
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    dispute = models.ForeignKey(
        'disputes.Dispute',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Statut
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    
    # Envoi
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    
    # Canaux spécifiques
    in_app_sent = models.BooleanField(default=False)
    push_sent = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    
    push_token = models.CharField(max_length=255, blank=True)
    email_recipient = models.EmailField(blank=True)
    sms_recipient = models.CharField(max_length=17, blank=True)
    
    # Erreurs
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} - {self.user.email}"


class NotificationPreference(models.Model):
    """Préférences de notification par utilisateur"""
    
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Email
    email_enabled = models.BooleanField(default=True)
    email_mission_updates = models.BooleanField(default=True)
    email_payments = models.BooleanField(default=True)
    email_disputes = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=False)
    email_digest = models.BooleanField(default=True)  # Résumé quotidien
    
    # Push
    push_enabled = models.BooleanField(default=True)
    push_mission_updates = models.BooleanField(default=True)
    push_payments = models.BooleanField(default=True)
    push_messages = models.BooleanField(default=True)
    push_gps = models.BooleanField(default=False)
    
    # SMS
    sms_enabled = models.BooleanField(default=True)
    sms_urgent_only = models.BooleanField(default=True)
    sms_security = models.BooleanField(default=True)  # 2FA, etc.
    
    # In-App
    in_app_enabled = models.BooleanField(default=True)
    in_app_sound = models.BooleanField(default=True)
    in_app_vibration = models.BooleanField(default=True)
    
    # Horaires
    quiet_hours_start = models.TimeField(blank=True, null=True)
    quiet_hours_end = models.TimeField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default='Africa/Bamako')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
    
    def __str__(self):
        return f"Préférences - {self.user.email}"


class PushSubscription(models.Model):
    """Souscriptions push Firebase/Web"""
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='push_subscriptions'
    )
    
    # Token FCM (Firebase Cloud Messaging)
    fcm_token = models.CharField(max_length=255, unique=True)
    
    # Device info
    device_id = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=20)  # ios, android, web
    device_model = models.CharField(max_length=100, blank=True)
    os_version = models.CharField(max_length=50, blank=True)
    app_version = models.CharField(max_length=20, blank=True)
    
    # Statut
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'push_subscriptions'
        ordering = ['-last_used_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.device_type}"


class NotificationTemplate(models.Model):
    """Templates de notifications"""
    
    class Channel(models.TextChoices):
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        PUSH = 'push', 'Push'
    
    name = models.CharField(max_length=100, unique=True)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    notification_type = models.CharField(max_length=30)
    
    # Contenu
    subject = models.CharField(max_length=255, blank=True)  # Pour email
    title_template = models.CharField(max_length=255)
    message_template = models.TextField()
    
    # Variables disponibles: {{user_name}}, {{mission_title}}, {{amount}}, etc.
    
    # Options
    is_active = models.BooleanField(default=True)
    language = models.CharField(max_length=10, default='fr')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
        unique_together = ['notification_type', 'channel', 'language']
    
    def __str__(self):
        return f"{self.name} ({self.channel})"


class ScheduledNotification(models.Model):
    """Notifications planifiées"""
    
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Planifiée'
        SENT = 'sent', 'Envoyée'
        CANCELLED = 'cancelled', 'Annulée'
        FAILED = 'failed', 'Échouée'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    notification_type = models.CharField(max_length=30)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='scheduled_notifications'
    )
    
    # Contenu
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    
    # Planification
    scheduled_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    
    # Envoi
    sent_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scheduled_notifications'
        ordering = ['scheduled_at']
    
    def __str__(self):
        return f"{self.notification_type} - {self.user.email} @ {self.scheduled_at}"
