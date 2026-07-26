from django.contrib import admin
from .models import (
    EnterpriseTeam, EnterpriseTeamMember, EmployeeAssignment,
    EnterprisePayrollSettings, MissionEmployeeEarning, PayrollPeriod, PayrollLine,
)


class EnterpriseTeamMemberInline(admin.TabularInline):
    model = EnterpriseTeamMember
    extra = 0
    fields = ('employee', 'category', 'is_lead', 'joined_at')
    readonly_fields = ('joined_at',)


@admin.register(EnterpriseTeam)
class EnterpriseTeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'enterprise', 'manager', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'enterprise__company_name', 'manager__first_name', 'manager__last_name']
    ordering = ['name']
    inlines = [EnterpriseTeamMemberInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(EnterpriseTeamMember)
class EnterpriseTeamMemberAdmin(admin.ModelAdmin):
    list_display = ['team', 'employee', 'category', 'is_lead', 'joined_at']
    search_fields = ['team__name', 'employee__first_name', 'employee__last_name', 'employee__email', 'category']


@admin.register(EmployeeAssignment)
class EmployeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'mission', 'enterprise', 'is_lead', 'assignment_type', 'assigned_at', 'completed_at']
    list_filter = ['assignment_type', 'is_lead', 'assigned_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'mission__title']
    ordering = ['-assigned_at']
    readonly_fields = ['assigned_at', 'accepted_at', 'rejected_at', 'completed_at']

    def enterprise(self, obj):
        if obj.employee and obj.employee.enterprise:
            return obj.employee.enterprise.company_name
        return '-'
    enterprise.short_description = 'Entreprise'


@admin.register(EnterprisePayrollSettings)
class EnterprisePayrollSettingsAdmin(admin.ModelAdmin):
    list_display = ['enterprise', 'is_enabled', 'frequency', 'payment_mode', 'employee_pool_percent']


class PayrollLineInline(admin.TabularInline):
    model = PayrollLine
    extra = 0
    readonly_fields = [
        'employee', 'missions_count', 'solo_missions', 'team_missions',
        'gross_amount', 'net_amount', 'status', 'paid_at',
    ]


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = [
        'enterprise', 'period_start', 'period_end', 'frequency',
        'status', 'total_amount', 'employees_count',
    ]
    list_filter = ['status', 'frequency', 'payment_mode']
    inlines = [PayrollLineInline]


@admin.register(MissionEmployeeEarning)
class MissionEmployeeEarningAdmin(admin.ModelAdmin):
    list_display = ['employee', 'mission', 'amount', 'is_team', 'is_lead', 'status', 'accrued_at']
    list_filter = ['status', 'is_team', 'is_lead']
    search_fields = ['employee__first_name', 'employee__last_name', 'mission__title']
