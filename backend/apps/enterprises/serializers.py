from rest_framework import serializers
from .models import (
    EnterpriseTeam, EnterpriseTeamMember, EmployeeAssignment,
    EnterpriseContract, EnterpriseInvoice, EmployeeAvailability,
)


class TeamMemberSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(source='employee.id', read_only=True)
    first_name = serializers.CharField(source='employee.first_name', read_only=True)
    last_name = serializers.CharField(source='employee.last_name', read_only=True)
    email = serializers.CharField(source='employee.email', read_only=True)
    position = serializers.CharField(source='employee.position', read_only=True)
    is_active = serializers.BooleanField(source='employee.is_active', read_only=True)
    is_manager = serializers.SerializerMethodField()

    class Meta:
        model = EnterpriseTeamMember
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'email',
            'position', 'category', 'is_active', 'is_lead', 'is_manager', 'joined_at',
        ]

    def get_is_manager(self, obj):
        return bool(obj.team.manager_id and obj.team.manager_id == obj.employee_id)


class EnterpriseTeamSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    # Accepté à la création / mise à jour : [{ employee_id, category? }, ...]
    members_payload = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = EnterpriseTeam
        fields = [
            'id', 'name', 'description', 'manager', 'manager_name',
            'is_active', 'members', 'members_count', 'members_payload',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_manager_name(self, obj):
        if not obj.manager_id:
            return None
        m = obj.manager
        name = f"{m.first_name or ''} {m.last_name or ''}".strip()
        if name:
            return name
        if m.user_id:
            return m.user.get_full_name() or m.user.email
        return m.email or None

    def get_members(self, obj):
        qs = obj.memberships.select_related('employee', 'employee__user', 'team')
        return TeamMemberSerializer(qs, many=True).data

    def get_members_count(self, obj):
        if hasattr(obj, 'members_count_anno'):
            return obj.members_count_anno
        return obj.memberships.count()


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    mission_title = serializers.CharField(source='mission.title', read_only=True)
    assignment_status = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeAssignment
        fields = [
            'id', 'mission', 'mission_title', 'employee', 'employee_name',
            'assignment_type', 'is_lead', 'assignment_status', 'notes',
            'assigned_at', 'accepted_at', 'rejected_at', 'rejection_reason', 'completed_at',
        ]
        read_only_fields = ['id', 'assigned_at', 'accepted_at', 'rejected_at', 'completed_at']

    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}".strip()
        return None

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

    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}".strip()
        return None


class EmployeeAssignmentCreateSerializer(serializers.Serializer):
    """Création d'affectation : employé seul, ou équipe entière."""

    mission = serializers.UUIDField()
    employee = serializers.UUIDField(required=False, allow_null=True)
    team = serializers.UUIDField(required=False, allow_null=True)
    lead_employee = serializers.UUIDField(required=False, allow_null=True)
    is_lead = serializers.BooleanField(required=False, default=False)
    assignment_type = serializers.ChoiceField(
        choices=EmployeeAssignment.AssignmentType.choices,
        required=False,
        default=EmployeeAssignment.AssignmentType.MANUAL,
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        employee = attrs.get('employee')
        team = attrs.get('team')
        if not employee and not team:
            raise serializers.ValidationError('Indiquez un employé ou une équipe')
        if employee and team:
            raise serializers.ValidationError('Choisissez soit un employé, soit une équipe')
        return attrs
