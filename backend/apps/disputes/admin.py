"""
BlockTask Disputes Admin
Administration complète des litiges et arbitres
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Dispute, Arbitrator


# ==================== DISPUTE ADMIN ====================

@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    """Administration complète des litiges"""
    
    list_display = [
        'id_short', 'mission', 'plaintiff', 'defendant', 'status_colored',
        'reason', 'decision', 'created_at'
    ]
    list_filter = [
        'status', 'reason', 'decision', 'created_at'
    ]
    search_fields = [
        'mission__title', 'plaintiff__email', 'defendant__email', 'description'
    ]
    ordering = ['-created_at']
    
    actions = ['resolve_for_client', 'resolve_for_provider', 'resolve_split']
    
    fieldsets = (
        ('Mission', {
            'fields': ('mission',)
        }),
        ('Parties', {
            'fields': ('plaintiff', 'defendant')
        }),
        ('Raison', {
            'fields': ('reason', 'description', 'requested_resolution')
        }),
        ('Statut', {
            'fields': ('status',)
        }),
        ('Décision', {
            'fields': ('decision', 'decision_reason', 'decided_by', 'decided_at'),
            'classes': ('collapse',)
        }),
        ('Financier', {
            'fields': ('client_refund_amount', 'provider_payment_amount', 'deposit_penalty'),
            'classes': ('collapse',)
        }),
        ('Blockchain', {
            'fields': ('dispute_contract_id', 'decision_tx_hash'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at', 'resolved_at', 'evidence_deadline', 'auto_resolve_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'resolved_at', 'decided_at']
    
    def id_short(self, obj):
        """ID tronqué"""
        return format_html('<code>{}</code>', str(obj.id)[:8])
    id_short.short_description = 'ID'
    
    def status_colored(self, obj):
        """Statut avec couleur"""
        colors = {
            'open': 'red',
            'under_review': 'orange',
            'pending_evidence': 'blue',
            'arbitration': 'purple',
            'resolved': 'green',
            'appealed': 'darkred',
            'closed': 'gray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'
    
    @admin.action(description='✅ Résoudre en faveur du client')
    def resolve_for_client(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='resolved',
            decision='client_wins',
            decided_by=request.user if hasattr(request.user, 'arbitrator_profile') else None,
            decided_at=timezone.now(),
            resolved_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} litiges résolus en faveur du client.")
    
    @admin.action(description='✅ Résoudre en faveur du prestataire')
    def resolve_for_provider(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='resolved',
            decision='provider_wins',
            decided_by=request.user if hasattr(request.user, 'arbitrator_profile') else None,
            decided_at=timezone.now(),
            resolved_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} litiges résolus en faveur du prestataire.")
    
    @admin.action(description='⚖️ Résoudre par partage')
    def resolve_split(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='resolved',
            decision='split',
            decided_by=request.user if hasattr(request.user, 'arbitrator_profile') else None,
            decided_at=timezone.now(),
            resolved_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} litiges résolus par partage 50/50.")


# ==================== ARBITRATOR ADMIN ====================

@admin.register(Arbitrator)
class ArbitratorAdmin(admin.ModelAdmin):
    """Administration des arbitres"""
    
    list_display = ['user', 'disputes_handled', 'disputes_resolved', 'is_active', 'created_at']
    list_filter = ['can_resolve_disputes', 'can_moderate_content', 'can_suspend_users', 'is_active', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering = ['-disputes_handled']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Permissions', {
            'fields': ('can_resolve_disputes', 'can_moderate_content', 'can_suspend_users')
        }),
        ('Statistiques', {
            'fields': ('disputes_handled', 'disputes_resolved', 'avg_resolution_time')
        }),
        ('Statut', {
            'fields': ('is_active', 'created_at')
        }),
    )
    
    readonly_fields = ['created_at', 'disputes_handled', 'disputes_resolved', 'avg_resolution_time']
