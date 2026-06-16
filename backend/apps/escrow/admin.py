"""
BlockTask Escrow Admin
Administration complète des transactions blockchain
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    EscrowTransaction, ProviderDeposit,
    PaymentLog, BlockchainEvent
)


# ==================== PAYMENT LOG INLINE ====================

class PaymentLogInline(admin.TabularInline):
    """Logs de paiement inline"""
    model = PaymentLog
    extra = 0
    fields = ('amount', 'currency', 'payment_method', 'status', 'created_at')
    readonly_fields = ('amount', 'currency', 'payment_method', 'status', 'created_at')
    can_delete = False
    max_num = 5


# ==================== ESCROW TRANSACTION ADMIN ====================

@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    """Administration complète des transactions escrow"""
    
    list_display = [
        'id_short', 'mission', 'transaction_type_colored', 'status_colored',
        'amount', 'currency', 'confirmations', 'tx_hash_short', 'created_at'
    ]
    list_filter = [
        'transaction_type', 'status', 'currency', 'confirmations', 'created_at'
    ]
    search_fields = [
        'mission__title', 'client__email', 'provider__email',
        'deposit_tx_hash', 'release_tx_hash', 'blockchain_mission_id'
    ]
    ordering = ['-created_at']
    
    actions = [
        'confirm_transactions', 'mark_failed', 'mark_cancelled'
    ]
    
    fieldsets = (
        ('Mission', {
            'fields': ('mission', 'client', 'provider')
        }),
        ('Transaction', {
            'fields': ('transaction_type', 'status', 'amount', 'currency')
        }),
        ('Blockchain', {
            'fields': (
                'blockchain_mission_id', 'deposit_tx_hash', 'release_tx_hash',
                'block_number', 'gas_used', 'confirmations'
            ),
            'classes': ('collapse',)
        }),
        ('Raison', {
            'fields': ('reason',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'confirmed_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'created_at', 'confirmed_at', 'block_number', 'gas_used', 'confirmations'
    ]
    
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:8])
    id_short.short_description = 'ID'
    
    def transaction_type_colored(self, obj):
        colors = {
            'deposit': 'green',
            'release': 'blue',
            'refund': 'orange',
            'penalty': 'red',
            'bonus': 'purple',
        }
        color = colors.get(obj.transaction_type, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_transaction_type_display()
        )
    transaction_type_colored.short_description = 'Type'
    
    def status_colored(self, obj):
        colors = {
            'pending': 'orange',
            'confirmed': 'green',
            'failed': 'red',
            'cancelled': 'gray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'
    
    def tx_hash_short(self, obj):
        hash_val = obj.deposit_tx_hash or obj.release_tx_hash
        if hash_val:
            return format_html('<code>{}...{}</code>', hash_val[:6], hash_val[-4:])
        return '-'
    tx_hash_short.short_description = 'Hash Tx'
    
    @admin.action(description='✅ Confirmer transactions sélectionnées')
    def confirm_transactions(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='confirmed', confirmed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} transactions confirmées.")
    
    @admin.action(description='❌ Marquer comme échouées')
    def mark_failed(self, request, queryset):
        queryset.update(status='failed')
        self.message_user(request, f"{queryset.count()} transactions marquées comme échouées.")
    
    @admin.action(description='🚫 Annuler transactions')
    def mark_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
        self.message_user(request, f"{queryset.count()} transactions annulées.")


# ==================== PROVIDER DEPOSIT ADMIN ====================

@admin.register(ProviderDeposit)
class ProviderDepositAdmin(admin.ModelAdmin):
    """Administration des cautions prestataires"""
    
    list_display = [
        'provider', 'amount', 'currency', 'status_colored',
        'is_dynamic', 'locked_for_mission', 'created_at'
    ]
    list_filter = ['status', 'is_dynamic', 'currency', 'created_at']
    search_fields = ['provider__email', 'deposit_tx_hash', 'blockchain_deposit_id']
    ordering = ['-created_at']
    
    actions = ['release_deposits', 'forfeit_deposits']
    
    fieldsets = (
        ('Prestataire', {
            'fields': ('provider',)
        }),
        ('Dépôt', {
            'fields': ('amount', 'currency', 'status')
        }),
        ('Blockchain', {
            'fields': ('blockchain_deposit_id', 'deposit_tx_hash'),
            'classes': ('collapse',)
        }),
        ('Utilisation', {
            'fields': ('locked_for_mission', 'is_dynamic', 'calculated_required_amount')
        }),
        ('Dates', {
            'fields': ('created_at', 'locked_at', 'released_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'locked_at', 'released_at']
    
    def status_colored(self, obj):
        colors = {
            'active': 'green',
            'locked': 'orange',
            'released': 'blue',
            'forfeited': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'
    
    @admin.action(description='🔓 Libérer cautions sélectionnées')
    def release_deposits(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='released', released_at=timezone.now())
        self.message_user(request, f"{queryset.count()} cautions libérées.")
    
    @admin.action(description='💰 Confisquer cautions sélectionnées')
    def forfeit_deposits(self, request, queryset):
        queryset.update(status='forfeited')
        self.message_user(request, f"{queryset.count()} cautions confisquées.")


# ==================== PAYMENT LOG ADMIN ====================

@admin.register(PaymentLog)
class PaymentLogAdmin(admin.ModelAdmin):
    """Administration des logs de paiement"""
    
    list_display = [
        'user', 'mission', 'amount', 'currency', 'payment_method',
        'status_colored', 'mobile_provider', 'created_at'
    ]
    list_filter = ['payment_method', 'status', 'mobile_provider', 'currency', 'created_at']
    search_fields = ['user__email', 'transaction_id', 'external_reference', 'description']
    ordering = ['-created_at']
    
    readonly_fields = ['created_at', 'completed_at']
    
    def status_colored(self, obj):
        colors = {
            'pending': 'orange',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red',
            'refunded': 'purple',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Statut'


# ==================== BLOCKCHAIN EVENT ADMIN ====================

@admin.register(BlockchainEvent)
class BlockchainEventAdmin(admin.ModelAdmin):
    """Administration des événements blockchain"""
    
    list_display = [
        'event_type', 'mission', 'block_number', 'log_index',
        'processed', 'processed_at', 'created_at'
    ]
    list_filter = ['event_type', 'processed', 'created_at']
    search_fields = ['mission__title', 'transaction_hash', 'contract_address']
    ordering = ['-block_number', '-log_index']
    
    actions = ['mark_processed', 'mark_unprocessed']
    
    fieldsets = (
        ('Événement', {
            'fields': ('event_type', 'mission')
        }),
        ('Blockchain', {
            'fields': ('contract_address', 'transaction_hash', 'block_number', 'log_index')
        }),
        ('Données', {
            'fields': ('event_data',),
            'classes': ('collapse',)
        }),
        ('Traitement', {
            'fields': ('processed', 'processed_at', 'error_message')
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'processed_at']
    
    @admin.action(description='✅ Marquer comme traités')
    def mark_processed(self, request, queryset):
        from django.utils import timezone
        queryset.update(processed=True, processed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} événements marqués comme traités.")
    
    @admin.action(description='⏳ Marquer comme non traités')
    def mark_unprocessed(self, request, queryset):
        queryset.update(processed=False, processed_at=None)
        self.message_user(request, f"{queryset.count()} événements marqués comme non traités.")
