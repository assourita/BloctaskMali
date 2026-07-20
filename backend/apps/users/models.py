"""
BlockTask User Models
Modèles pour les utilisateurs (Client, Prestataire, Entreprise, Admin)
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
import uuid


class User(AbstractUser):
    """Utilisateur principal de BlockTask"""
    
    class UserType(models.TextChoices):
        CLIENT = 'client', 'Client'
        PROVIDER = 'provider', 'Prestataire'
        ENTERPRISE = 'enterprise', 'Entreprise'
        ADMIN = 'admin', 'Administrateur'
    
    class KYCStatus(models.TextChoices):
        PENDING = 'pending', 'En attente'
        VERIFIED = 'verified', 'Vérifié'
        REJECTED = 'rejected', 'Rejeté'
        NOT_REQUIRED = 'not_required', 'Non requis'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Le numéro de téléphone doit être au format: '+999999999'."
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=17,
        blank=True,
        null=True
    )
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.CLIENT
    )
    # Rôle secondaire (client peut activer provider, provider a client automatiquement)
    secondary_role = models.CharField(
        max_length=20,
        choices=UserType.choices,
        blank=True,
        null=True
    )
    # Espace actif pour la session (rôle primaire par défaut)
    active_role = models.CharField(
        max_length=20,
        choices=UserType.choices,
        blank=True,
        null=True
    )

    # Profil
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Mali')
    
    # Wallet Blockchain
    wallet_address = models.CharField(max_length=42, blank=True, null=True, unique=True)
    wallet_nonce = models.CharField(max_length=255, blank=True, null=True)
    
    # KYC
    kyc_status = models.CharField(
        max_length=20,
        choices=KYCStatus.choices,
        default=KYCStatus.NOT_REQUIRED
    )
    nina = models.CharField(max_length=20, blank=True, null=True)  # NINA / numéro d'identification nationale (Mali, Niger, Guinée…)
    id_card_front = models.ImageField(upload_to='kyc/id/', blank=True, null=True)
    id_card_back = models.ImageField(upload_to='kyc/id/', blank=True, null=True)
    selfie_verification = models.ImageField(upload_to='kyc/selfies/', blank=True, null=True)
    kyc_submitted_at = models.DateTimeField(blank=True, null=True)
    kyc_verified_at = models.DateTimeField(blank=True, null=True)
    kyc_rejection_reason = models.TextField(blank=True, default='')
    
    # AI KYC Analysis
    kyc_ai_decision = models.CharField(
        max_length=20,
        choices=[('approved', 'Approuvé'), ('rejected', 'Rejeté'), ('manual_review', 'Revue manuelle')],
        blank=True,
        null=True
    )
    kyc_ai_confidence = models.FloatField(blank=True, null=True)
    kyc_ai_analysis = models.JSONField(blank=True, null=True)  # Stocke le résultat complet de l'analyse IA
    kyc_ai_analyzed_at = models.DateTimeField(blank=True, null=True)
    
    # Admin Override
    kyc_admin_override = models.BooleanField(default=False)
    kyc_admin_override_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='kyc_overrides'
    )
    kyc_admin_override_at = models.DateTimeField(blank=True, null=True)
    kyc_admin_override_reason = models.TextField(blank=True)
    
    # Sécurité
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, blank=True, null=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    
    # GPS / Localisation
    gps_tracking_enabled = models.BooleanField(default=True)

    # Statut
    is_active = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True)
    suspended_at = models.DateTimeField(blank=True, null=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def save(self, *args, **kwargs):
        if self.user_type == self.UserType.ADMIN:
            self.is_staff = True
            self.is_superuser = True
            self.gps_tracking_enabled = False
        # Provider → secondary_role client assigné automatiquement
        if self.user_type == self.UserType.PROVIDER and not self.secondary_role:
            self.secondary_role = self.UserType.CLIENT
        # active_role = user_type (rôle primaire) si pas défini
        if not self.active_role:
            self.active_role = self.user_type
        super().save(*args, **kwargs)

    def get_available_roles(self):
        from .roles import get_available_roles
        return get_available_roles(self)

    def get_effective_role(self):
        from .roles import get_effective_role
        return get_effective_role(self)

    def has_role(self, role: str) -> bool:
        from .roles import has_role
        return has_role(self, role)

    def is_acting_as(self, role: str) -> bool:
        from .roles import is_acting_as
        return is_acting_as(self, role)

    @property
    def is_client(self):
        return self.is_acting_as(self.UserType.CLIENT)

    @property
    def is_provider(self):
        return self.is_acting_as(self.UserType.PROVIDER)
    
    @property
    def is_enterprise(self):
        return self.user_type == self.UserType.ENTERPRISE
    
    @property
    def is_admin_user(self):
        return self.user_type == self.UserType.ADMIN


class ProviderProfile(models.Model):
    """Profil spécifique des prestataires"""
    
    class ProviderLevel(models.TextChoices):
        BRONZE = 'bronze', 'Bronze'
        SILVER = 'silver', 'Argent'
        GOLD = 'gold', 'Or'
        PLATINUM = 'platinum', 'Platine'
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='provider_profile'
    )
    
    # Compétences
    skills = models.JSONField(default=list, blank=True)
    categories = models.JSONField(default=list, blank=True)  # ['delivery', 'repair', 'assembly']
    
    # Niveau et réputation
    level = models.CharField(
        max_length=20,
        choices=ProviderLevel.choices,
        default=ProviderLevel.BRONZE
    )
    reputation_score = models.FloatField(default=50.0)
    total_missions_completed = models.PositiveIntegerField(default=0)
    total_earnings = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Disponibilité
    is_available = models.BooleanField(default=True)
    working_hours_start = models.TimeField(default='08:00')
    working_hours_end = models.TimeField(default='18:00')
    working_days = models.JSONField(default=list)  # [1, 2, 3, 4, 5] pour lundi-vendredi
    
    # Caution
    deposit_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_locked = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Agent terrain rattaché à une entreprise (pas prestataire indépendant)
    managed_by_enterprise = models.ForeignKey(
        'users.EnterpriseProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='field_agents',
    )
    
    # Véhicule (pour livraisons)
    vehicle_type = models.CharField(max_length=50, blank=True)
    vehicle_plate = models.CharField(max_length=20, blank=True)
    
    # Certifications
    certifications = models.JSONField(default=list, blank=True)
    
    # Position GPS actuelle
    current_latitude = models.FloatField(blank=True, null=True)
    current_longitude = models.FloatField(blank=True, null=True)
    location_updated_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provider_profiles'
    
    def __str__(self):
        return f"Prestataire: {self.user.get_full_name()}"


class EnterpriseProfile(models.Model):
    """Profil spécifique des entreprises"""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='enterprise_profile'
    )
    
    # Informations légales
    company_name = models.CharField(max_length=255)
    rccm = models.CharField(max_length=50, blank=True, null=True)  # Registre du Commerce
    ifu = models.CharField(max_length=50, blank=True, null=True)  # Identifiant Fiscal Unique
    trade_register = models.FileField(upload_to='enterprise/docs/', blank=True, null=True)
    
    # Contact
    company_email = models.EmailField(blank=True)
    company_phone = models.CharField(max_length=17, blank=True)
    website = models.URLField(blank=True)
    
    # Adresse
    address = models.TextField()
    city = models.CharField(max_length=100)
    
    # Statistiques
    total_employees = models.PositiveIntegerField(default=0)
    total_missions_posted = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Réputation entreprise
    reputation_score = models.FloatField(default=50.0)

    # Caution collective (gérée par le gérant)
    deposit_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_locked = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Vérification
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'enterprise_profiles'
    
    def __str__(self):
        return f"Entreprise: {self.company_name}"


class Employee(models.Model):
    """Employé rattaché à une entreprise"""
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrateur'
        MANAGER = 'manager', 'Manager'
        ACCOUNTANT = 'accountant', 'Comptable'
        HR = 'hr', 'Ressources Humaines'
        AGENT = 'agent', 'Agent'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        EnterpriseProfile,
        on_delete=models.CASCADE,
        related_name='employees'
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='employee_profile',
        blank=True,
        null=True
    )
    
    # Informations
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=17)
    position = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENT)
    
    # Documents
    nina = models.CharField(max_length=20, blank=True)
    id_card = models.ImageField(upload_to='employees/id/', blank=True, null=True)
    photo = models.ImageField(upload_to='employees/photos/', blank=True, null=True)
    
    # Statistiques
    missions_completed = models.PositiveIntegerField(default=0)
    missions_failed = models.PositiveIntegerField(default=0)
    
    # Statut
    is_active = models.BooleanField(default=True)
    hired_at = models.DateTimeField(auto_now_add=True)
    terminated_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employees'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.enterprise.company_name}"


class LoginHistory(models.Model):
    """Historique des connexions"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_successful = models.BooleanField(default=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'login_history'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.email} - {self.timestamp}"


class WalletTransaction(models.Model):
    """Transactions de portefeuille"""
    
    class TransactionType(models.TextChoices):
        DEPOSIT = 'deposit', 'Dépôt'
        WITHDRAWAL = 'withdrawal', 'Retrait'
        MISSION_PAYMENT = 'mission_payment', 'Paiement Mission'
        REFUND = 'refund', 'Remboursement'
        COMMISSION = 'commission', 'Commission'
        DEPOSIT_LOCK = 'deposit_lock', 'Blocage Caution'
        DEPOSIT_RELEASE = 'deposit_release', 'Libération Caution'
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        COMPLETED = 'completed', 'Complété'
        FAILED = 'failed', 'Échoué'
        CANCELLED = 'cancelled', 'Annulé'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='XOF')
    
    # Blockchain
    blockchain_tx_hash = models.CharField(max_length=66, blank=True, null=True)
    blockchain_confirmations = models.PositiveIntegerField(default=0)
    
    # Mobile Money
    mobile_money_provider = models.CharField(max_length=20, blank=True)  # orange, moov, wave
    mobile_money_reference = models.CharField(max_length=100, blank=True)
    
    # Métadonnées
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'wallet_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} {self.currency}"
