"""
BlockTask Users Admin
Administration complète des utilisateurs et profils
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import User, ProviderProfile, EnterpriseProfile, Employee, LoginHistory, WalletTransaction


# ==================== INLINES ====================

class ProviderProfileInline(admin.StackedInline):
    """Profil prestataire inline"""
    model = ProviderProfile
    can_delete = False
    verbose_name_plural = 'Profil Prestataire'
    fieldsets = (
        ('Niveau et Réputation', {
            'fields': ('level', 'reputation_score', 'total_missions_completed', 'total_earnings')
        }),
        ('Disponibilité', {
            'fields': ('is_available', 'working_hours_start', 'working_hours_end', 'working_days')
        }),
        ('Caution', {
            'fields': ('deposit_balance', 'deposit_locked')
        }),
        ('Véhicule', {
            'fields': ('vehicle_type', 'vehicle_plate'),
            'classes': ('collapse',)
        }),
        ('Compétences', {
            'fields': ('skills', 'categories', 'certifications'),
            'classes': ('collapse',)
        }),
        ('Position GPS', {
            'fields': ('current_latitude', 'current_longitude', 'location_updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'location_updated_at')


class EnterpriseProfileInline(admin.StackedInline):
    """Profil entreprise inline"""
    model = EnterpriseProfile
    can_delete = False
    verbose_name_plural = 'Profil Entreprise'
    fieldsets = (
        ('Informations légales', {
            'fields': ('company_name', 'rccm', 'ifu', 'trade_register')
        }),
        ('Contact', {
            'fields': ('company_email', 'company_phone', 'website')
        }),
        ('Adresse', {
            'fields': ('address', 'city')
        }),
        ('Statistiques', {
            'fields': ('total_employees', 'total_missions_posted', 'total_spent', 'reputation_score')
        }),
        ('Vérification', {
            'fields': ('is_verified', 'verified_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'verified_at')


class EmployeeInline(admin.TabularInline):
    """Employés inline pour EnterpriseProfile"""
    model = Employee
    extra = 0
    fields = ('first_name', 'last_name', 'email', 'phone', 'position', 'role', 'is_active')
    readonly_fields = ('created_at',)


class LoginHistoryInline(admin.TabularInline):
    """Historique de connexion inline"""
    model = LoginHistory
    extra = 0
    fields = ('ip_address', 'device_type', 'location', 'is_successful', 'timestamp')
    readonly_fields = ('ip_address', 'user_agent', 'device_type', 'location', 'is_successful', 'failure_reason', 'timestamp')
    can_delete = False
    max_num = 10


class WalletTransactionInline(admin.TabularInline):
    """Transactions wallet inline"""
    model = WalletTransaction
    extra = 0
    fields = ('transaction_type', 'amount', 'currency', 'status', 'blockchain_tx_hash', 'created_at')
    readonly_fields = ('transaction_type', 'amount', 'currency', 'status', 'blockchain_tx_hash', 'mobile_money_provider', 'created_at', 'completed_at')
    can_delete = False
    max_num = 20


# ==================== USER ADMIN ====================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Administration complète des utilisateurs"""
    
    # Affichage liste
    list_display = [
        'email', 'username', 'get_full_name', 'user_type', 'kyc_status',
        'is_active', 'email_verified', 'wallet_address_short', 'created_at'
    ]
    list_filter = [
        'user_type', 'is_active', 'is_suspended', 'kyc_status',
        'email_verified', 'phone_verified', 'two_factor_enabled', 'created_at'
    ]
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone_number', 'wallet_address', 'nina']
    ordering = ['-created_at']
    
    # Pagination
    list_per_page = 25
    
    # Actions
    actions = ['verify_email', 'verify_phone', 'suspend_users', 'unsuspend_users', 'force_2fa']
    
    # Fieldsets détaillés
    fieldsets = (
        ('Informations principales', {
            'fields': ('email', 'username', 'first_name', 'last_name', 'user_type')
        }),
        ('Contact', {
            'fields': ('phone_number', 'email_verified', 'phone_verified')
        }),
        ('Profil', {
            'fields': ('profile_picture', 'bio', 'address', 'city', 'country')
        }),
        ('Wallet Blockchain', {
            'fields': ('wallet_address', 'wallet_nonce'),
            'classes': ('collapse',)
        }),
        ('KYC', {
            'fields': ('kyc_status', 'nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'kyc_submitted_at', 'kyc_verified_at'),
            'classes': ('collapse',)
        }),
        ('Sécurité', {
            'fields': ('two_factor_enabled', 'last_login_ip', 'last_login'),
            'classes': ('collapse',)
        }),
        ('Suspension', {
            'fields': ('is_active', 'is_suspended', 'suspension_reason', 'suspended_at'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Dates importantes', {
            'fields': ('date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'date_joined', 'kyc_submitted_at', 'kyc_verified_at', 'suspended_at')
    
    # Inlines conditionnels selon le type d'utilisateur
    def get_inlines(self, request, obj=None):
        if obj:
            if obj.user_type == 'provider':
                return [ProviderProfileInline, LoginHistoryInline, WalletTransactionInline]
            elif obj.user_type == 'enterprise':
                return [EnterpriseProfileInline, EmployeeInline, LoginHistoryInline, WalletTransactionInline]
            else:
                return [LoginHistoryInline, WalletTransactionInline]
        return []
    
    # Méthodes personnalisées
    def wallet_address_short(self, obj):
        """Affiche l'adresse wallet tronquée"""
        if obj.wallet_address:
            return format_html('<code>{}...{}</code>', 
                             obj.wallet_address[:6], 
                             obj.wallet_address[-4:])
        return '-'
    wallet_address_short.short_description = 'Wallet'
    
    def get_full_name(self, obj):
        """Nom complet"""
        return obj.get_full_name() or '-'
    get_full_name.short_description = 'Nom complet'
    
    # Actions
    @admin.action(description='✅ Vérifier emails sélectionnés')
    def verify_email(self, request, queryset):
        queryset.update(email_verified=True)
        self.message_user(request, f"{queryset.count()} emails vérifiés.")
    
    @admin.action(description='✅ Vérifier téléphones sélectionnés')
    def verify_phone(self, request, queryset):
        queryset.update(phone_verified=True)
        self.message_user(request, f"{queryset.count()} téléphones vérifiés.")
    
    @admin.action(description='🚫 Suspendre utilisateurs sélectionnés')
    def suspend_users(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_suspended=True, suspended_at=timezone.now())
        self.message_user(request, f"{queryset.count()} utilisateurs suspendus.")
    
    @admin.action(description='✅ Réactiver utilisateurs sélectionnés')
    def unsuspend_users(self, request, queryset):
        queryset.update(is_suspended=False, suspended_at=None)
        self.message_user(request, f"{queryset.count()} utilisateurs réactivés.")
    
    @admin.action(description='🔒 Forcer 2FA pour sélectionnés')
    def force_2fa(self, request, queryset):
        queryset.update(two_factor_enabled=True)
        self.message_user(request, f"2FA activé pour {queryset.count()} utilisateurs.")


# ==================== PROVIDER PROFILE ADMIN ====================

@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    """Administration des profils prestataires"""
    
    list_display = [
        'user', 'level', 'reputation_score', 'total_missions_completed',
        'total_earnings', 'is_available', 'deposit_balance', 'deposit_locked', 'created_at'
    ]
    list_filter = ['level', 'is_available', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'vehicle_plate']
    ordering = ['-reputation_score']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Niveau et Réputation', {
            'fields': ('level', 'reputation_score', 'total_missions_completed', 'total_earnings')
        }),
        ('Disponibilité', {
            'fields': ('is_available', 'working_hours_start', 'working_hours_end', 'working_days')
        }),
        ('Caution', {
            'fields': ('deposit_balance', 'deposit_locked')
        }),
        ('Véhicule', {
            'fields': ('vehicle_type', 'vehicle_plate'),
            'classes': ('collapse',)
        }),
        ('Compétences et Certifications', {
            'fields': ('skills', 'categories', 'certifications'),
            'classes': ('collapse',)
        }),
        ('Position GPS actuelle', {
            'fields': ('current_latitude', 'current_longitude', 'location_updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'location_updated_at')


# ==================== ENTERPRISE PROFILE ADMIN ====================

@admin.register(EnterpriseProfile)
class EnterpriseProfileAdmin(admin.ModelAdmin):
    """Administration des profils entreprises"""
    
    list_display = [
        'company_name', 'user', 'rccm', 'ifu', 'total_employees',
        'total_missions_posted', 'total_spent', 'is_verified', 'created_at'
    ]
    list_filter = ['is_verified', 'city', 'created_at']
    search_fields = ['company_name', 'rccm', 'ifu', 'user__email', 'company_email']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Entreprise', {
            'fields': ('user', 'company_name')
        }),
        ('Informations légales', {
            'fields': ('rccm', 'ifu', 'trade_register')
        }),
        ('Contact', {
            'fields': ('company_email', 'company_phone', 'website')
        }),
        ('Adresse', {
            'fields': ('address', 'city')
        }),
        ('Statistiques', {
            'fields': ('total_employees', 'total_missions_posted', 'total_spent', 'reputation_score')
        }),
        ('Vérification', {
            'fields': ('is_verified', 'verified_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'verified_at', 'total_employees', 'total_missions_posted', 'total_spent', 'reputation_score')
    
    actions = ['verify_enterprises']
    
    @admin.action(description='✅ Vérifier entreprises sélectionnées')
    def verify_enterprises(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_verified=True, verified_at=timezone.now())
        self.message_user(request, f"{queryset.count()} entreprises vérifiées.")


# ==================== EMPLOYEE ADMIN ====================

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """Administration des employés"""
    
    list_display = [
        'first_name', 'last_name', 'enterprise', 'position', 'role',
        'missions_completed', 'missions_failed', 'is_active', 'hired_at'
    ]
    list_filter = ['role', 'is_active', 'hired_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'nina', 'enterprise__company_name']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'nina')
        }),
        ('Entreprise', {
            'fields': ('enterprise', 'position', 'role')
        }),
        ('Documents', {
            'fields': ('id_card', 'photo'),
            'classes': ('collapse',)
        }),
        ('Statistiques', {
            'fields': ('missions_completed', 'missions_failed')
        }),
        ('Statut', {
            'fields': ('is_active', 'hired_at', 'terminated_at')
        }),
    )
    
    readonly_fields = ('hired_at', 'created_at', 'updated_at')


# ==================== LOGIN HISTORY ADMIN ====================

@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    """Administration de l'historique des connexions"""
    
    list_display = ['user', 'ip_address', 'device_type', 'location', 'is_successful', 'timestamp']
    list_filter = ['is_successful', 'device_type', 'timestamp']
    search_fields = ['user__email', 'ip_address', 'location']
    ordering = ['-timestamp']
    readonly_fields = ['user', 'ip_address', 'user_agent', 'device_type', 'location', 'is_successful', 'failure_reason', 'timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


# ==================== WALLET TRANSACTION ADMIN ====================

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    """Administration des transactions wallet"""
    
    list_display = [
        'user', 'transaction_type', 'amount', 'currency', 'status',
        'blockchain_tx_hash_short', 'created_at'
    ]
    list_filter = ['transaction_type', 'status', 'currency', 'created_at']
    search_fields = ['user__email', 'blockchain_tx_hash', 'mobile_money_reference', 'description']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Transaction', {
            'fields': ('user', 'transaction_type', 'amount', 'currency', 'status')
        }),
        ('Blockchain', {
            'fields': ('blockchain_tx_hash', 'blockchain_confirmations'),
            'classes': ('collapse',)
        }),
        ('Mobile Money', {
            'fields': ('mobile_money_provider', 'mobile_money_reference'),
            'classes': ('collapse',)
        }),
        ('Détails', {
            'fields': ('description', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'user', 'transaction_type', 'amount', 'currency', 'status',
        'blockchain_tx_hash', 'blockchain_confirmations',
        'mobile_money_provider', 'mobile_money_reference',
        'created_at', 'completed_at'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def blockchain_tx_hash_short(self, obj):
        """Hash blockchain tronqué"""
        if obj.blockchain_tx_hash:
            return format_html('<code>{}...{}</code>',
                             obj.blockchain_tx_hash[:6],
                             obj.blockchain_tx_hash[-4:])
        return '-'
    blockchain_tx_hash_short.short_description = 'Hash Blockchain'
