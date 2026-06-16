"""
BlockTask Missions Admin
Administration complète des missions et catégories
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import Category, Mission, MissionApplication, MissionStatusHistory, MissionBookmark, MissionReview


# ==================== INLINES ====================

class MissionStatusHistoryInline(admin.TabularInline):
    """Historique des statuts inline"""
    model = MissionStatusHistory
    extra = 0
    fields = ('old_status', 'new_status', 'changed_by', 'reason', 'created_at')
    readonly_fields = ('old_status', 'new_status', 'changed_by', 'reason', 'created_at')
    can_delete = False
    max_num = 20


class MissionApplicationInline(admin.TabularInline):
    """Candidatures inline"""
    model = MissionApplication
    extra = 0
    fields = ('provider', 'proposed_price', 'estimated_duration', 'status', 'created_at')
    readonly_fields = ('provider', 'proposed_price', 'estimated_duration', 'status', 'created_at')
    can_delete = False


class MissionReviewInline(admin.StackedInline):
    """Avis inline"""
    model = MissionReview
    extra = 0
    fields = (
        'client_rating', 'client_comment', 'client_reviewed_at',
        'provider_rating', 'provider_comment', 'provider_reviewed_at',
        'client_reported_issue', 'provider_reported_issue'
    )
    readonly_fields = ('created_at', 'updated_at')


# ==================== CATEGORY ADMIN ====================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Administration des catégories"""
    
    list_display = ['name', 'slug', 'is_active', 'get_icon_preview', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    
    fieldsets = (
        ('Informations', {
            'fields': ('name', 'slug', 'description', 'icon')
        }),
        ('Configuration', {
            'fields': ('is_active',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at']
    
    def get_icon_preview(self, obj):
        """Affiche l'icône"""
        if obj.icon:
            return format_html('<i class="{}"></i> {}', obj.icon, obj.icon)
        return '-'
    get_icon_preview.short_description = 'Icône'


# ==================== MISSION ADMIN ====================

@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    """Administration complète des missions"""
    
    list_display = [
        'id_short', 'title_short', 'client', 'provider', 'category',
        'status_colored', 'budget', 'priority', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'category', 'requires_verified_provider',
        'enterprise_only', 'requires_gps_tracking', 'created_at'
    ]
    search_fields = [
        'title', 'description', 'mission_hash', 'client__email',
        'provider__email', 'pickup_address', 'delivery_address'
    ]
    ordering = ['-created_at']
    
    list_per_page = 25
    
    actions = ['mark_funded', 'mark_in_progress', 'mark_completed', 'cancel_missions']
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('title', 'description', 'requirements', 'category', 'client')
        }),
        ('Prestataire', {
            'fields': ('provider',),
        }),
        ('Localisation', {
            'fields': (
                'pickup_address', 'pickup_latitude', 'pickup_longitude',
                'delivery_address', 'delivery_latitude', 'delivery_longitude'
            ),
            'classes': ('collapse',)
        }),
        ('Financier', {
            'fields': ('budget', 'final_price', 'currency')
        }),
        ('Caution', {
            'fields': ('required_deposit', 'deposit_amount', 'deposit_paid', 'deposit_tx_hash'),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': ('deadline', 'expected_duration', 'started_at', 'completed_at'),
        }),
        ('Statut', {
            'fields': ('status', 'priority')
        }),
        ('Options avancées', {
            'fields': (
                'requires_verified_provider', 'min_reputation_score',
                'enterprise_only', 'requires_gps_tracking', 'requires_qr_validation'
            ),
            'classes': ('collapse',)
        }),
        ('Validation automatique', {
            'fields': ('auto_validation_delay', 'auto_validation_scheduled_at'),
            'classes': ('collapse',)
        }),
        ('Blockchain', {
            'fields': ('escrow_tx_hash', 'mission_contract_id', 'blockchain_status'),
            'classes': ('collapse',)
        }),
        ('Statistiques', {
            'fields': ('views_count', 'applications_count'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'created_at', 'updated_at', 'started_at', 'completed_at',
        'views_count', 'applications_count', 'mission_hash',
        'auto_validation_scheduled_at'
    ]
    
    inlines = [MissionApplicationInline, MissionStatusHistoryInline, MissionReviewInline]
    
    def id_short(self, obj):
        """ID tronqué"""
        return format_html('<code>{}</code>', str(obj.id)[:8])
    id_short.short_description = 'ID'
    
    def title_short(self, obj):
        """Titre tronqué"""
        return obj.title[:50] + '...' if len(obj.title) > 50 else obj.title
    title_short.short_description = 'Titre'
    
    def status_colored(self, obj):
        """Statut avec couleur"""
        colors = {
            'draft': 'gray',
            'pending': 'orange',
            'funded': 'blue',
            'accepted': 'purple',
            'in_progress': 'green',
            'submitted': 'teal',
            'completed': 'darkgreen',
            'cancelled': 'red',
            'disputed': 'darkred',
            'expired': 'lightgray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'
    
    def accepted_provider(self, obj):
        """Affiche le prestataire accepté"""
        application = obj.applications.filter(status='accepted').first()
        if application:
            return application.provider
        return '-'
    accepted_provider.short_description = 'Prestataire accepté'
    
    # Actions
    @admin.action(description='💰 Marquer comme financées')
    def mark_funded(self, request, queryset):
        queryset.update(status='funded')
        self.message_user(request, f"{queryset.count()} missions marquées comme financées.")
    
    @admin.action(description='🚀 Marquer en cours')
    def mark_in_progress(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='in_progress', started_at=timezone.now())
        self.message_user(request, f"{queryset.count()} missions marquées en cours.")
    
    @admin.action(description='✅ Marquer comme terminées')
    def mark_completed(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='completed', completed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} missions terminées.")
    
    @admin.action(description='❌ Annuler missions')
    def cancel_missions(self, request, queryset):
        queryset.update(status='cancelled')
        self.message_user(request, f"{queryset.count()} missions annulées.")


# ==================== MISSION APPLICATION ADMIN ====================

@admin.register(MissionApplication)
class MissionApplicationAdmin(admin.ModelAdmin):
    """Administration des candidatures"""
    
    list_display = ['mission', 'provider', 'proposed_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['mission__title', 'provider__email', 'message']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Mission', {
            'fields': ('mission', 'provider')
        }),
        ('Proposition', {
            'fields': ('proposed_price', 'estimated_duration', 'message')
        }),
        ('Statut', {
            'fields': ('status', 'responded_at')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'responded_at']


# ==================== MISSION STATUS HISTORY ADMIN ====================

@admin.register(MissionStatusHistory)
class MissionStatusHistoryAdmin(admin.ModelAdmin):
    """Administration de l'historique des statuts"""
    
    list_display = ['mission', 'old_status', 'new_status', 'changed_by', 'created_at']
    list_filter = ['old_status', 'new_status', 'created_at']
    search_fields = ['mission__title', 'reason']
    ordering = ['-created_at']
    readonly_fields = ['mission', 'old_status', 'new_status', 'changed_by', 'reason', 'metadata', 'created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


# ==================== MISSION BOOKMARK ADMIN ====================

@admin.register(MissionBookmark)
class MissionBookmarkAdmin(admin.ModelAdmin):
    """Administration des favoris"""
    
    list_display = ['provider', 'mission', 'created_at']
    list_filter = ['created_at']
    search_fields = ['provider__email', 'mission__title']
    ordering = ['-created_at']


# ==================== MISSION REVIEW ADMIN ====================

@admin.register(MissionReview)
class MissionReviewAdmin(admin.ModelAdmin):
    """Administration des avis"""
    
    list_display = ['mission', 'client_rating', 'provider_rating', 'has_client_review', 'has_provider_review', 'created_at']
    list_filter = ['created_at']
    search_fields = ['mission__title', 'client_comment', 'provider_comment']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Mission', {
            'fields': ('mission',)
        }),
        ('Évaluation Client → Prestataire', {
            'fields': ('client_rating', 'client_comment', 'client_reviewed_at')
        }),
        ('Évaluation Prestataire → Client', {
            'fields': ('provider_rating', 'provider_comment', 'provider_reviewed_at')
        }),
        ('Problèmes signalés', {
            'fields': ('client_reported_issue', 'provider_reported_issue'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'client_reviewed_at', 'provider_reviewed_at']
    
    def has_client_review(self, obj):
        return bool(obj.client_rating)
    has_client_review.boolean = True
    has_client_review.short_description = 'Avis client'
    
    def has_provider_review(self, obj):
        return bool(obj.provider_rating)
    has_provider_review.boolean = True
    has_provider_review.short_description = 'Avis prestataire'
