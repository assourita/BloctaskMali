from rest_framework import serializers
from .models import (
    EnterpriseTeam, EmployeeAssignment, EnterpriseContract,
    EnterpriseInvoice, EmployeeAvailability
)


class EnterpriseTeamSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = EnterpriseTeam
        fields = ['id', 'name', 'description', 'manager', 'manager_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.user.get_full_name()
        return None


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    mission_title = serializers.CharField(source='mission.title', read_only=True)

    class Meta:
        model = EmployeeAssignment
        fields = [
            'id', 'mission', 'mission_title', 'employee', 'employee_name',
            'assignment_type', 'assignment_status', 'notes', 'assigned_at', 'accepted_at',
            'rejected_at', 'rejection_reason', 'completed_at'
        ]
        read_only_fields = ['id', 'assigned_at', 'accepted_at', 'rejected_at', 'completed_at']

    assignment_status = serializers.SerializerMethodField()

    def get_assignment_status(self, obj):
        if obj.completed_at:
            return 'completed'
        if obj.rejected_at:
            return 'rejected'
        if obj.accepted_at:
            return 'accepted'
        return 'pending'


class EnterpriseContractSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='enterprise.company_name', read_only=True)

    class Meta:
        model = EnterpriseContract
        fields = [
            'id', 'enterprise', 'company_name', 'contract_type', 'status',
            'monthly_fee', 'commission_rate', 'max_employees',
            'start_date', 'end_date', 'billing_email', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EnterpriseInvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='enterprise.company_name', read_only=True)

    class Meta:
        model = EnterpriseInvoice
        fields = [
            'id', 'enterprise', 'company_name', 'invoice_number', 'status',
            'period_start', 'period_end', 'subtotal', 'commission_amount',
            'tax_amount', 'total_amount', 'paid_at', 'due_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EmployeeAvailabilitySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    mission_title = serializers.CharField(source='current_mission.title', read_only=True, allow_null=True)

    class Meta:
        model = EmployeeAvailability
        fields = [
            'employee', 'employee_name', 'status',
            'current_latitude', 'current_longitude', 'location_updated_at',
            'current_mission', 'mission_title', 'available_from', 'updated_at'
        ]


class EmployeeAssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeAssignment
        fields = ['mission', 'employee', 'assignment_type', 'notes']
