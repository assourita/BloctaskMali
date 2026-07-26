from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, Count, Prefetch

from apps.users.models import EnterpriseProfile, Employee
from apps.missions.models import Mission
from .models import (
    EnterpriseTeam, EnterpriseTeamMember, EmployeeAssignment,
    EnterpriseContract, EnterpriseInvoice, EmployeeAvailability,
    MissionEmployeeEarning, PayrollPeriod,
)
from .serializers import (
    EnterpriseTeamSerializer, EmployeeAssignmentSerializer,
    EnterpriseContractSerializer, EnterpriseInvoiceSerializer,
    EmployeeAvailabilitySerializer, EmployeeAssignmentCreateSerializer,
    EnterprisePayrollSettingsSerializer, MissionEmployeeEarningSerializer,
    PayrollPeriodSerializer,
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
        base = EnterpriseTeam.objects.select_related(
            'enterprise', 'manager', 'manager__user',
        ).prefetch_related(
            Prefetch(
                'memberships',
                queryset=EnterpriseTeamMember.objects.select_related('employee', 'employee__user', 'team'),
            ),
        ).annotate(members_count_anno=Count('memberships'))
        if not profile and not self.request.user.is_staff:
            return EnterpriseTeam.objects.none()
        if self.request.user.is_staff:
            return base
        return base.filter(enterprise=profile)

    def perform_create(self, serializer):
        profile = get_enterprise_profile(self.request.user)
        if not profile:
            raise ValidationError({'detail': 'Profil entreprise requis'})
        members_payload = serializer.validated_data.pop('members_payload', None) or []
        team = serializer.save(enterprise=profile)
        self._sync_members(team, profile, members_payload, ensure_manager=True)

    def perform_update(self, serializer):
        profile = get_enterprise_profile(self.request.user)
        members_payload = serializer.validated_data.pop('members_payload', None)
        team = serializer.save()
        if members_payload is not None and profile:
            self._sync_members(team, profile, members_payload, ensure_manager=True, replace=True)
        elif team.manager_id and profile and team.manager.enterprise_id == profile.id:
            EnterpriseTeamMember.objects.get_or_create(team=team, employee=team.manager)

    def _sync_members(self, team, profile, members_payload, *, ensure_manager=False, replace=False):
        if replace:
            keep_ids = set()
            for row in members_payload:
                eid = row.get('employee_id') or row.get('employee')
                if eid:
                    keep_ids.add(str(eid))
            if team.manager_id:
                keep_ids.add(str(team.manager_id))
            EnterpriseTeamMember.objects.filter(team=team).exclude(employee_id__in=keep_ids).delete()

        for row in members_payload:
            eid = row.get('employee_id') or row.get('employee')
            if not eid:
                continue
            employee = Employee.objects.filter(id=eid, enterprise=profile, is_active=True).first()
            if not employee:
                continue
            category = (row.get('category') or '')[:100]
            membership, created = EnterpriseTeamMember.objects.get_or_create(
                team=team, employee=employee,
                defaults={'category': category},
            )
            if not created and category:
                membership.category = category
                membership.save(update_fields=['category'])

        if ensure_manager and team.manager_id and team.manager.enterprise_id == profile.id:
            EnterpriseTeamMember.objects.get_or_create(team=team, employee=team.manager)

    @action(detail=True, methods=['post'])
    def members(self, request, pk=None):
        """POST { employee_id, category? } — ajoute un membre."""
        team = self.get_object()
        profile = get_enterprise_profile(request.user)
        if not profile or team.enterprise_id != profile.id:
            return Response({'error': 'Non autorisé'}, status=403)
        employee_id = request.data.get('employee_id') or request.data.get('employee')
        if not employee_id:
            return Response({'error': 'employee_id requis'}, status=400)
        employee = Employee.objects.filter(id=employee_id, enterprise=profile, is_active=True).first()
        if not employee:
            return Response({'error': 'Employé introuvable'}, status=404)
        category = (request.data.get('category') or '')[:100]
        membership, created = EnterpriseTeamMember.objects.get_or_create(
            team=team, employee=employee,
            defaults={'category': category},
        )
        if not created and 'category' in request.data:
            membership.category = category
            membership.save(update_fields=['category'])
        return Response(EnterpriseTeamSerializer(team).data)

    @action(detail=True, methods=['post'], url_path=r'members/(?P<employee_id>[^/.]+)/remove')
    def remove_member(self, request, pk=None, employee_id=None):
        team = self.get_object()
        profile = get_enterprise_profile(request.user)
        if not profile or team.enterprise_id != profile.id:
            return Response({'error': 'Non autorisé'}, status=403)
        deleted, _ = EnterpriseTeamMember.objects.filter(team=team, employee_id=employee_id).delete()
        if not deleted:
            return Response({'error': 'Membre introuvable'}, status=404)
        if team.manager_id and str(team.manager_id) == str(employee_id):
            team.manager = None
            team.save(update_fields=['manager'])
        return Response(EnterpriseTeamSerializer(team).data)

    @action(detail=True, methods=['post'], url_path='set-manager')
    def set_manager(self, request, pk=None):
        team = self.get_object()
        profile = get_enterprise_profile(request.user)
        if not profile or team.enterprise_id != profile.id:
            return Response({'error': 'Non autorisé'}, status=403)
        employee_id = request.data.get('employee_id') or request.data.get('employee')
        if not employee_id:
            return Response({'error': 'employee_id requis'}, status=400)
        employee = Employee.objects.filter(id=employee_id, enterprise=profile, is_active=True).first()
        if not employee:
            return Response({'error': 'Employé introuvable'}, status=404)
        EnterpriseTeamMember.objects.get_or_create(team=team, employee=employee)
        team.manager = employee
        team.save(update_fields=['manager'])
        return Response(EnterpriseTeamSerializer(team).data)


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

    def create(self, request, *args, **kwargs):
        serializer = EmployeeAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        profile = get_enterprise_profile(request.user)
        if not profile:
            return Response({'error': 'Profil entreprise requis'}, status=403)

        mission = Mission.objects.filter(id=data['mission']).first()
        if not mission:
            return Response({'error': 'Mission introuvable'}, status=404)
        if mission.assigned_enterprise_id != profile.id:
            return Response({'error': 'Mission non assignée à votre entreprise'}, status=403)

        from apps.users.enterprise_services import (
            add_employee_to_mission,
            assign_team_to_mission,
            set_mission_lead,
        )

        try:
            if data.get('team'):
                team = EnterpriseTeam.objects.filter(id=data['team'], enterprise=profile).first()
                if not team:
                    return Response({'error': 'Équipe introuvable'}, status=404)
                lead = None
                if data.get('lead_employee'):
                    lead = Employee.objects.filter(
                        id=data['lead_employee'], enterprise=profile, is_active=True,
                    ).first()
                    if not lead:
                        return Response({'error': 'Chef introuvable'}, status=404)
                assignments = assign_team_to_mission(
                    mission, team, request.user,
                    lead_employee=lead,
                    notes=data.get('notes') or '',
                )
                return Response(
                    EmployeeAssignmentSerializer(assignments, many=True).data,
                    status=201,
                )

            employee = Employee.objects.filter(
                id=data['employee'], enterprise=profile, is_active=True,
            ).first()
            if not employee:
                return Response({'error': 'Employé introuvable'}, status=404)
            is_lead = bool(data.get('is_lead')) or not mission.executing_employee_id
            assignment = add_employee_to_mission(
                mission, employee, request.user,
                is_lead=is_lead,
                notes=data.get('notes') or '',
            )
            if data.get('is_lead') and not assignment.is_lead:
                set_mission_lead(mission, employee, request.user)
                assignment.refresh_from_db()
            return Response(EmployeeAssignmentSerializer(assignment).data, status=201)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

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
        assignment.is_lead = False
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
            return EmployeeAvailability.objects.select_related(
                'employee', 'employee__user', 'current_mission',
            )
        if not profile:
            return EmployeeAvailability.objects.none()
        # Garantit une fiche disponibilité pour chaque employé actif
        from apps.users.models import Employee
        active_ids = Employee.objects.filter(
            enterprise=profile, is_active=True,
        ).values_list('id', flat=True)
        existing = set(
            EmployeeAvailability.objects.filter(employee_id__in=active_ids)
            .values_list('employee_id', flat=True)
        )
        missing = [eid for eid in active_ids if eid not in existing]
        if missing:
            EmployeeAvailability.objects.bulk_create(
                [
                    EmployeeAvailability(
                        employee_id=eid,
                        status=EmployeeAvailability.Status.OFFLINE,
                    )
                    for eid in missing
                ],
                ignore_conflicts=True,
            )
        return EmployeeAvailability.objects.filter(
            employee__enterprise=profile,
            employee__is_active=True,
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
        'total_invoiced': float(invoices_qs.aggregate(t=Sum('total_amount'))['t'] or 0),
        'pending_invoices': invoices_qs.exclude(status='paid').count(),
        'invoices': EnterpriseInvoiceSerializer(invoices_qs[:50], many=True).data,
        'contracts': EnterpriseContractSerializer(contracts_qs[:20], many=True).data,
    })


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def payroll_settings_view(request):
    """Paramètres de paie du gérant (fréquence, mode auto/manuel, pool %)."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)

    from .payroll_services import get_or_create_payroll_settings, reset_payroll_settings
    settings = get_or_create_payroll_settings(profile)

    if request.method == 'GET':
        return Response(EnterprisePayrollSettingsSerializer(settings).data)

    if request.method == 'DELETE':
        settings = reset_payroll_settings(profile)
        return Response(EnterprisePayrollSettingsSerializer(settings).data)

    ser = EnterprisePayrollSettingsSerializer(settings, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_preview_view(request):
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    from .payroll_services import payroll_preview
    return Response(payroll_preview(profile))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_dashboard_view(request):
    """Page dédiée paie : stats, employés, historique global."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    from .payroll_services import payroll_dashboard
    return Response(payroll_dashboard(profile))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_employee_detail_view(request, employee_id):
    """Détail salaire + stats travail d'un employé."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    from .payroll_services import payroll_employee_detail
    data = payroll_employee_detail(profile, employee_id)
    if not data:
        return Response({'error': 'Employé introuvable'}, status=404)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_earnings_list(request):
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    qs = MissionEmployeeEarning.objects.filter(enterprise=profile).select_related(
        'employee', 'mission',
    )[:200]
    return Response(MissionEmployeeEarningSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payroll_periods_view(request):
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)

    if request.method == 'GET':
        qs = PayrollPeriod.objects.filter(enterprise=profile).prefetch_related(
            'lines', 'lines__employee',
        )[:50]
        return Response(PayrollPeriodSerializer(qs, many=True).data)

    from .payroll_services import generate_payroll_period
    from datetime import date as date_cls

    frequency = request.data.get('frequency')
    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')
    force_mode = request.data.get('payment_mode')

    try:
        start = date_cls.fromisoformat(period_start) if period_start else None
        end = date_cls.fromisoformat(period_end) if period_end else None
        period = generate_payroll_period(
            profile,
            frequency=frequency,
            period_start=start,
            period_end=end,
            generated_by=request.user,
            force_mode=force_mode,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    except Exception as exc:
        return Response({'error': str(exc)}, status=400)

    period = PayrollPeriod.objects.prefetch_related('lines', 'lines__employee').get(pk=period.pk)
    return Response(PayrollPeriodSerializer(period).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payroll_period_approve(request, period_id):
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    period = PayrollPeriod.objects.filter(id=period_id, enterprise=profile).first()
    if not period:
        return Response({'error': 'Période introuvable'}, status=404)
    from .payroll_services import approve_payroll_period
    try:
        period = approve_payroll_period(period, approved_by=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    period = PayrollPeriod.objects.prefetch_related('lines', 'lines__employee').get(pk=period.pk)
    return Response(PayrollPeriodSerializer(period).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payroll_period_pay(request, period_id):
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    period = PayrollPeriod.objects.filter(id=period_id, enterprise=profile).first()
    if not period:
        return Response({'error': 'Période introuvable'}, status=404)
    from .payroll_services import pay_payroll_period
    try:
        period = pay_payroll_period(period, paid_by=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    period = PayrollPeriod.objects.prefetch_related('lines', 'lines__employee').get(pk=period.pk)
    return Response(PayrollPeriodSerializer(period).data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def payroll_period_detail(request, period_id):
    """Consulter, modifier ou supprimer une période de paie."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise introuvable'}, status=404)
    period = PayrollPeriod.objects.filter(id=period_id, enterprise=profile).first()
    if not period:
        return Response({'error': 'Période introuvable'}, status=404)

    if request.method == 'GET':
        period = PayrollPeriod.objects.prefetch_related('lines', 'lines__employee').get(pk=period.pk)
        return Response(PayrollPeriodSerializer(period).data)

    if request.method == 'DELETE':
        from .payroll_services import delete_payroll_period
        force = str(request.query_params.get('force', '')).lower() in ('1', 'true', 'yes')
        try:
            result = delete_payroll_period(period, force=force)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(result)

    from datetime import date as date_cls
    from .payroll_services import update_payroll_period

    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')
    try:
        period = update_payroll_period(
            period,
            period_start=date_cls.fromisoformat(period_start) if period_start else None,
            period_end=date_cls.fromisoformat(period_end) if period_end else None,
            frequency=request.data.get('frequency'),
            payment_mode=request.data.get('payment_mode'),
            notes=request.data.get('notes'),
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    period = PayrollPeriod.objects.prefetch_related('lines', 'lines__employee').get(pk=period.pk)
    return Response(PayrollPeriodSerializer(period).data)
