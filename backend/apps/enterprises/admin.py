"""
BlockTask Enterprises Admin
Administration complète des équipes et assignations
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import EnterpriseTeam, EmployeeAssignment


# ==================== EMPLOYEE ASSIGNMENT INLINE ====================

class EmployeeAssignmentInline(admin.TabularInline):
    """Assignations inline"""
    model = EmployeeAssignment
    extra = 0
    fields = ('employee', 'mission', 'status', 'assigned_at', 'completed_at')
    readonly_fields = ('assigned_at', 'completed_at')


# ==================== ENTERPRISE TEAM ADMIN ====================

@admin.register(EnterpriseTeam)
class EnterpriseTeamAdmin(admin.ModelAdmin):
    """Administration des équipes entreprise"""
    
    list_display = ['name', 'enterprise', 'manager', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'enterprise__company_name', 'manager__first_name', 'manager__last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations', {
            'fields': ('enterprise', 'name', 'description')
        }),
        ('Manager', {
            'fields': ('manager',)
        }),
        ('Statut', {
            'fields': ('is_active', 'created_at')
        }),
    )
    
    readonly_fields = ['created_at']


# ==================== EMPLOYEE ASSIGNMENT ADMIN ====================

@admin.register(EmployeeAssignment)
class EmployeeAssignmentAdmin(admin.ModelAdmin):
    """Administration des assignations employés"""
    
    list_display = ['employee', 'mission', 'enterprise', 'assignment_type', 'assigned_at', 'completed_at']
    list_filter = ['assignment_type', 'assigned_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'mission__title']
    ordering = ['-assigned_at']
    
    fieldsets = (
        ('Employé', {
            'fields': ('employee',)
        }),
        ('Mission', {
            'fields': ('mission',)
        }),
        ('Assignation', {
            'fields': ('assigned_by', 'assignment_type', 'notes')
        }),
        ('Dates', {
            'fields': ('assigned_at', 'accepted_at', 'rejected_at', 'completed_at')
        }),
    )
    
    readonly_fields = ['assigned_at', 'accepted_at', 'rejected_at', 'completed_at']
    
    def enterprise(self, obj):
        """Entreprise de l'employé"""
        if obj.employee and obj.employee.enterprise:
            return obj.employee.enterprise.company_name
        return '-'
    enterprise.short_description = 'Entreprise'
