"""
BlockTask Reputation Admin
Administration complète du système de réputation
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ReputationScore, ReputationHistory, ReputationLevel,
    ReputationPenalty, ReputationBonus, TrustFactor
)


# ==================== REPUTATION SCORE ADMIN ====================

@admin.register(ReputationScore)
class ReputationScoreAdmin(admin.ModelAdmin):
    """Administration des scores de réputation"""
    
    list_display = [
        'user', 'overall_score', 'level', 'total_missions',
        'success_rate_display', 'average_rating', 'last_calculated_at'
    ]
    list_filter = ['level', 'last_calculated_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering = ['-overall_score']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Score global', {
            'fields': ('overall_score', 'level')
        }),
        ('Composantes', {
            'fields': ('success_rate_score', 'rating_score', 'dispute_score', 'volume_score')
        }),
        ('Statistiques missions', {
            'fields': ('total_missions', 'successful_missions', 'failed_missions', 'cancelled_missions')
        }),
        ('Évaluations', {
            'fields': ('total_rating_sum', 'rating_count', 'average_rating')
        }),
        ('Litiges', {
            'fields': ('dispute_count', 'dispute_won', 'dispute_lost')
        }),
        ('Délai', {
            'fields': ('on_time_count', 'late_count', 'on_time_rate')
        }),
    )
    
    readonly_fields = [
        'success_rate_score', 'rating_score', 'dispute_score', 'volume_score',
        'total_missions', 'successful_missions', 'failed_missions', 'cancelled_missions',
        'total_rating_sum', 'rating_count', 'average_rating',
        'dispute_count', 'dispute_won', 'dispute_lost',
        'on_time_count', 'late_count', 'on_time_rate',
        'last_calculated_at', 'created_at'
    ]
    
    def success_rate_display(self, obj):
        """Taux de succès coloré"""
        rate = obj.success_rate
        color = 'green' if rate >= 90 else 'orange' if rate >= 70 else 'red'
        return format_html('<span style="color: {}; font-weight: bold;">{:.1f}%</span>', color, rate)
    success_rate_display.short_description = 'Taux de succès'


# ==================== REPUTATION HISTORY ADMIN ====================

@admin.register(ReputationHistory)
class ReputationHistoryAdmin(admin.ModelAdmin):
    """Administration de l'historique de réputation"""
    
    list_display = ['user', 'event_type', 'change_amount_colored', 'old_score', 'new_score', 'created_at']
    list_filter = ['event_type', 'created_at']
    search_fields = ['user__email', 'description']
    ordering = ['-created_at']
    
    readonly_fields = ['created_at']
    
    def change_amount_colored(self, obj):
        """Changement coloré"""
        color = 'green' if obj.change_amount > 0 else 'red' if obj.change_amount < 0 else 'gray'
        return format_html('<span style="color: {}; font-weight: bold;">{:+.1f}</span>', color, obj.change_amount)
    change_amount_colored.short_description = 'Changement'


# ==================== REPUTATION LEVEL ADMIN ====================

@admin.register(ReputationLevel)
class ReputationLevelAdmin(admin.ModelAdmin):
    """Administration des niveaux de réputation"""
    
    list_display = ['name', 'slug', 'min_score', 'max_score', 'min_missions', 'deposit_discount_percent', 'priority_access']
    list_filter = ['priority_access', 'can_accept_urgent']
    search_fields = ['name', 'slug']
    ordering = ['min_score']
    
    fieldsets = (
        ('Niveau', {
            'fields': ('name', 'slug')
        }),
        ('Seuils', {
            'fields': ('min_score', 'max_score', 'min_missions')
        }),
        ('Avantages', {
            'fields': ('deposit_discount_percent', 'priority_access', 'can_accept_urgent')
        }),
        ('Visuel', {
            'fields': ('color', 'icon', 'badge_url'),
            'classes': ('collapse',)
        }),
        ('Description', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
    )


# ==================== REPUTATION PENALTY ADMIN ====================

@admin.register(ReputationPenalty)
class ReputationPenaltyAdmin(admin.ModelAdmin):
    """Administration des pénalités"""
    
    list_display = ['user', 'penalty_type', 'points_deducted', 'is_temporary', 'expires_at', 'created_at']
    list_filter = ['penalty_type', 'is_temporary', 'created_at']
    search_fields = ['user__email', 'description']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user', 'mission')
        }),
        ('Pénalité', {
            'fields': ('penalty_type', 'points_deducted', 'description')
        }),
        ('Application', {
            'fields': ('applied_by',)
        }),
        ('Durée', {
            'fields': ('is_temporary', 'expires_at')
        }),
    )
    
    readonly_fields = ['created_at']


# ==================== REPUTATION BONUS ADMIN ====================

@admin.register(ReputationBonus)
class ReputationBonusAdmin(admin.ModelAdmin):
    """Administration des bonus"""
    
    list_display = ['user', 'bonus_type', 'points_added', 'created_at']
    list_filter = ['bonus_type', 'created_at']
    search_fields = ['user__email', 'description']
    ordering = ['-created_at']
    
    readonly_fields = ['created_at']


# ==================== TRUST FACTOR ADMIN ====================

@admin.register(TrustFactor)
class TrustFactorAdmin(admin.ModelAdmin):
    """Administration des facteurs de confiance"""
    
    list_display = [
        'user', 'trust_score', 'email_verified', 'phone_verified',
        'identity_verified', 'account_age_days', 'updated_at'
    ]
    list_filter = ['email_verified', 'phone_verified', 'identity_verified', 'address_verified']
    search_fields = ['user__email']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Vérifications', {
            'fields': ('email_verified', 'phone_verified', 'identity_verified', 'address_verified')
        }),
        ('Ancienneté', {
            'fields': ('account_age_days',)
        }),
        ('Activité', {
            'fields': ('login_frequency', 'response_time_avg')
        }),
        ('Score', {
            'fields': ('trust_score',)
        }),
    )
    
    readonly_fields = ['updated_at']
