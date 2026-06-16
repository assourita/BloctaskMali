"""
BlockTask Notifications Admin
Administration complète des notifications
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Notification, NotificationTemplate


# ==================== NOTIFICATION TEMPLATE ADMIN ====================

@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Administration des modèles de notification"""
    
    list_display = ['name', 'notification_type', 'channel', 'is_active', 'created_at']
    list_filter = ['notification_type', 'channel', 'is_active', 'created_at']
    search_fields = ['name', 'subject', 'content']
    ordering = ['name']
    
    fieldsets = (
        ('Informations', {
            'fields': ('name', 'notification_type', 'channel')
        }),
        ('Contenu', {
            'fields': ('subject', 'content', 'action_url')
        }),
        ('Variables', {
            'fields': ('variables',),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('is_active', 'created_at')
        }),
    )
    
    readonly_fields = ['created_at']


# ==================== NOTIFICATION ADMIN ====================

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Administration des notifications"""
    
    list_display = [
        'user', 'notification_type', 'title_short', 'priority_colored',
        'channel', 'is_read', 'read_at', 'created_at'
    ]
    list_filter = [
        'notification_type', 'priority', 'channel', 'is_read', 'created_at'
    ]
    search_fields = ['user__email', 'title', 'message']
    ordering = ['-created_at']
    
    actions = ['mark_as_read', 'mark_as_unread', 'resend_notifications']
    
    fieldsets = (
        ('Destinataire', {
            'fields': ('user',)
        }),
        ('Type', {
            'fields': ('notification_type',)
        }),
        ('Contenu', {
            'fields': ('title', 'message', 'image_url', 'action_url')
        }),
        ('Canal', {
            'fields': ('channel', 'priority')
        }),
        ('Lecture', {
            'fields': ('is_read', 'read_at')
        }),
        ('Envoi', {
            'fields': ('sent_at', 'delivered_at', 'error_message', 'retry_count')
        }),
        ('Canaux envoyés', {
            'fields': ('in_app_sent', 'push_sent', 'email_sent', 'sms_sent'),
            'classes': ('collapse',)
        }),
        ('Relations', {
            'fields': ('mission', 'dispute'),
            'classes': ('collapse',)
        }),
        ('Données', {
            'fields': ('data',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'read_at', 'sent_at', 'delivered_at', 'retry_count']
    
    def title_short(self, obj):
        """Titre tronqué"""
        return obj.title[:50] + '...' if len(obj.title) > 50 else obj.title
    title_short.short_description = 'Titre'
    
    def priority_colored(self, obj):
        """Priorité colorée"""
        colors = {
            'low': 'gray',
            'normal': 'blue',
            'high': 'orange',
            'urgent': 'red',
        }
        color = colors.get(obj.priority, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_priority_display()
        )
    priority_colored.short_description = 'Priorité'
    
    @admin.action(description='✅ Marquer comme lues')
    def mark_as_read(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f"{queryset.count()} notifications marquées comme lues.")
    
    @admin.action(description='📖 Marquer comme non lues')
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False, read_at=None)
        self.message_user(request, f"{queryset.count()} notifications marquées comme non lues.")
    
    @admin.action(description='🔄 Renvoyer notifications')
    def resend_notifications(self, request, queryset):
        queryset.update(is_sent=False, sent_at=None, error_message='')
        self.message_user(request, f"{queryset.count()} notifications programmées pour renvoi.")
