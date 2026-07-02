from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum

from apps.users.models import EnterpriseProfile, Employee
from apps.missions.models import Mission
from .models import (
    EnterpriseTeam, EmployeeAssignment, EnterpriseContract,
    EnterpriseInvoice, EmployeeAvailability
)
from .serializers import (
    EnterpriseTeamSerializer, EmployeeAssignmentSerializer,
    EnterpriseContractSerializer, EnterpriseInvoiceSerializer,
    EmployeeAvailabilitySerializer, EmployeeAssignmentCreateSerializer
)


def get_enterprise_profile(user):
    try:
        return EnterpriseProfile.objects.get(user=user)
    except EnterpriseProfile.DoesNotExist:
        return None


class EnterpriseTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EnterpriseTeamSerializer

    def get_queryset(self):
        profile = get_enterprise_profile(self.request.user)
        if not profile and not self.request.user.is_staff:
            return EnterpriseTeam.objects.none()
        if self.request.user.is_staff:
            return EnterpriseTeam.objects.select_related('enterprise', 'manager')
        return EnterpriseTeam.objects.filter(enterprise=profile)

    def perform_create(self, serializer):
        profile = get_enterprise_profile(self.request.user)
        serializer.save(enterprise=profile)


class EmployeeAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeAssignmentCreateSerializer
        return EmployeeAssignmentSerializer

    def get_queryset(self):
        profile = get_enterprise_profile(self.request.user)
        if self.request.user.is_staff:
            return EmployeeAssignment.objects.select_related('mission', 'employee', 'employee__user')
        if not profile:
            return EmployeeAssignment.objects.none()
        employee_ids = Employee.objects.filter(enterprise=profile).values_list('id', flat=True)
        return EmployeeAssignment.objects.filter(employee_id__in=employee_ids).select_related(
            'mission', 'employee', 'employee__user'
        )

    def perform_create(self, serializer):
        assignment = serializer.save(assigned_by=self.request.user)
        from apps.users.enterprise_services import assign_employee_to_mission
        try:
            assign_employee_to_mission(assignment.mission, assignment.employee, self.request.user)
        except ValueError as e:
            assignment.delete()
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': str(e)})

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        assignment = self.get_object()
        assignment.accepted_at = timezone.now()
        assignment.save()
        return Response(EmployeeAssignmentSerializer(assignment).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        assignment = self.get_object()
        assignment.rejected_at = timezone.now()
        assignment.rejection_reason = request.data.get('reason', '')
        assignment.save()
        return Response(EmployeeAssignmentSerializer(assignment).data)


class EnterpriseContractViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EnterpriseContractSerializer

    def get_queryset(self):
        profile = get_enterprise_profile(self.request.user)
        if self.request.user.is_staff:
            return EnterpriseContract.objects.select_related('enterprise')
        if not profile:
            return EnterpriseContract.objects.none()
        return EnterpriseContract.objects.filter(enterprise=profile)


class EnterpriseInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EnterpriseInvoiceSerializer

    def get_queryset(self):
        profile = get_enterprise_profile(self.request.user)
        if self.request.user.is_staff:
            return EnterpriseInvoice.objects.select_related('enterprise')
        if not profile:
            return EnterpriseInvoice.objects.none()
        return EnterpriseInvoice.objects.filter(enterprise=profile)


class EmployeeAvailabilityViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeAvailabilitySerializer

    def get_queryset(self):
        profile = get_enterprise_profile(self.request.user)
        if self.request.user.is_staff:
            return EmployeeAvailability.objects.select_related('employee', 'employee__user', 'current_mission')
        if not profile:
            return EmployeeAvailability.objects.none()
        return EmployeeAvailability.objects.filter(
            employee__enterprise=profile
        ).select_related('employee', 'employee__user', 'current_mission')


MISSION_ACTIVE_STATUSES = ['funded', 'accepted', 'in_progress', 'submitted']


def _mission_invoice_status(mission_status: str) -> str:
    if mission_status == 'completed':
        return EnterpriseInvoice.Status.PAID
    if mission_status in MISSION_ACTIVE_STATUSES:
        return EnterpriseInvoice.Status.SENT
    if mission_status in ('pending', 'draft'):
        return EnterpriseInvoice.Status.DRAFT
    return EnterpriseInvoice.Status.SENT


def sync_invoices_from_missions(profile: EnterpriseProfile):
    """Cree ou met a jour les factures a partir des missions de l'entreprise."""
    contract = EnterpriseContract.objects.filter(enterprise=profile).first()
    if not contract:
        today = timezone.now().date()
        contract = EnterpriseContract.objects.create(
            enterprise=profile,
            contract_type=EnterpriseContract.ContractType.STANDARD,
            status=EnterpriseContract.Status.ACTIVE,
            monthly_fee=25000,
            commission_rate=5,
            max_employees=20,
            start_date=today,
            end_date=today.replace(year=today.year + 1),
            billing_email=profile.company_email or profile.user.email,
            billing_address=profile.address or profile.city,
        )

    missions = Mission.objects.filter(client=profile.user)
    for mission in missions:
        inv_number = f"INV-{str(mission.id).replace('-', '')[:10].upper()}"
        commission = (mission.budget * contract.commission_rate) / 100
        defaults = {
            'contract': contract,
            'status': _mission_invoice_status(mission.status),
            'period_start': mission.created_at.date(),
            'period_end': mission.deadline.date(),
            'subtotal': mission.budget,
            'commission_amount': commission,
            'tax_amount': 0,
            'total_amount': mission.budget + commission,
            'due_date': mission.deadline.date(),
            'paid_at': timezone.now() if mission.status == 'completed' else None,
        }
        EnterpriseInvoice.objects.update_or_create(
            invoice_number=inv_number,
            defaults={**defaults, 'enterprise': profile},
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enterprise_finances_summary(request):
    """Resume financier : missions + factures + contrats."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)

    sync_invoices_from_missions(profile)

    missions = Mission.objects.filter(client=request.user).order_by('-created_at')
    spent_total = missions.filter(status='completed').aggregate(t=Sum('budget'))['t'] or 0
    committed_total = missions.filter(status__in=MISSION_ACTIVE_STATUSES).aggregate(t=Sum('budget'))['t'] or 0
    pending_total = missions.filter(status__in=['pending', 'draft', 'funded']).aggregate(t=Sum('budget'))['t'] or 0

    invoices_qs = EnterpriseInvoice.objects.filter(enterprise=profile)
    contracts_qs = EnterpriseContract.objects.filter(enterprise=profile)

    mission_rows = [
        {
            'id': str(m.id),
            'title': m.title,
            'status': m.status,
            'budget': float(m.budget),
            'currency': m.currency,
            'created_at': m.created_at.isoformat(),
            'deadline': m.deadline.isoformat(),
        }
        for m in missions
    ]

    return Response({
        'mission_spent_total': float(spent_total),
        'mission_committed_total': float(committed_total),
        'mission_pending_total': float(pending_total),
        'missions_count': missions.count(),
        'missions': mission_rows,
        'invoices': EnterpriseInvoiceSerializer(invoices_qs, many=True).data,
        'contracts': EnterpriseContractSerializer(contracts_qs, many=True).data,
        'total_invoiced': float(invoices_qs.aggregate(t=Sum('total_amount'))['t'] or 0),
        'pending_invoices': invoices_qs.filter(
            status__in=[EnterpriseInvoice.Status.SENT, EnterpriseInvoice.Status.DRAFT, EnterpriseInvoice.Status.OVERDUE]
        ).count(),
    })
