"""
Paie interne des employés d'entreprise.

Flux :
1. Mission entreprise validée → accrual MissionEmployeeEarning (solo / équipe)
2. Gérant génère une période (hebdo / mensuelle)
3. Mode manuel → approbation puis paiement
   Mode automatique → paiement immédiat à la génération
"""
from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.users.models import Employee, WalletTransaction

from .models import (
    EmployeeAssignment,
    EnterprisePayrollSettings,
    MissionEmployeeEarning,
    PayrollLine,
    PayrollPeriod,
)

TWOPLACES = Decimal('0.01')
ZERO = Decimal('0.00')


def _q(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def get_or_create_payroll_settings(enterprise) -> EnterprisePayrollSettings:
    settings, _ = EnterprisePayrollSettings.objects.get_or_create(enterprise=enterprise)
    return settings


def reset_payroll_settings(enterprise) -> EnterprisePayrollSettings:
    """Remet les règles de paie aux valeurs par défaut."""
    settings = get_or_create_payroll_settings(enterprise)
    settings.is_enabled = True
    settings.frequency = EnterprisePayrollSettings.Frequency.WEEKLY
    settings.payment_mode = EnterprisePayrollSettings.PaymentMode.MANUAL
    settings.employee_pool_percent = Decimal('70')
    settings.lead_weight_multiplier = Decimal('1.5')
    settings.notes = ''
    settings.save()
    return settings


@transaction.atomic
def update_payroll_period(
    period: PayrollPeriod,
    *,
    period_start: date | None = None,
    period_end: date | None = None,
    frequency: str | None = None,
    payment_mode: str | None = None,
    notes: str | None = None,
) -> PayrollPeriod:
    """Modifie une période non encore payée."""
    if period.status == PayrollPeriod.Status.PAID:
        raise ValueError('Impossible de modifier une période déjà payée')
    if period.status == PayrollPeriod.Status.CANCELLED:
        raise ValueError('Impossible de modifier une période annulée')

    if period_start is not None:
        period.period_start = period_start
    if period_end is not None:
        period.period_end = period_end
    if period.period_end < period.period_start:
        raise ValueError('period_end doit être >= period_start')
    if frequency is not None:
        period.frequency = frequency
    if payment_mode is not None:
        period.payment_mode = payment_mode
    if notes is not None:
        period.notes = notes

    period.save()
    return period


@transaction.atomic
def delete_payroll_period(period: PayrollPeriod, *, force: bool = False) -> dict:
    """
    Supprime / annule une période.
    - Non payée : libère les gains (retour en accrued) puis supprime.
    - Payée : annulation soft uniquement (force=True), sans reversal wallet.
    """
    if period.status == PayrollPeriod.Status.PAID and not force:
        raise ValueError(
            'Cette période est déjà payée. Passez force=true pour l’annuler '
            '(sans rembourser les wallets).'
        )

    if period.status == PayrollPeriod.Status.PAID:
        period.status = PayrollPeriod.Status.CANCELLED
        period.notes = (period.notes or '') + '\n[Annulée après paiement]'
        period.save(update_fields=['status', 'notes', 'updated_at'])
        return {'deleted': False, 'cancelled': True, 'id': str(period.id)}

    # Remettre les gains inclus dans le pool « à verser »
    MissionEmployeeEarning.objects.filter(
        payroll_line__period=period,
        status=MissionEmployeeEarning.Status.INCLUDED,
    ).update(
        status=MissionEmployeeEarning.Status.ACCRUED,
        payroll_line=None,
    )
    period_id = str(period.id)
    period.delete()
    return {'deleted': True, 'cancelled': False, 'id': period_id}


def _mission_assignees(mission):
    """Retourne les employés à rémunérer pour une mission entreprise."""
    assignments = list(
        EmployeeAssignment.objects.filter(mission=mission, rejected_at__isnull=True)
        .select_related('employee')
    )
    if assignments:
        return assignments

    lead = getattr(mission, 'executing_employee', None)
    if lead:
        return [EmployeeAssignment(
            mission=mission,
            employee=lead,
            is_lead=True,
        )]
    return []


def accrue_employee_earnings_for_mission(mission) -> list[MissionEmployeeEarning]:
    """
    Crée les accruals employés après validation d'une mission entreprise.
    Idempotent (unique mission+employee).
    """
    enterprise = getattr(mission, 'assigned_enterprise', None)
    if not enterprise:
        return []

    settings = get_or_create_payroll_settings(enterprise)
    if not settings.is_enabled:
        return []

    assignees = _mission_assignees(mission)
    if not assignees:
        return []

    mission_price = _q(mission.final_price or mission.budget or 0)
    payment = getattr(mission, 'payment', None)
    if payment and getattr(payment, 'provider_amount', None) is not None:
        mission_net = _q(payment.provider_amount)
    else:
        mission_net = _q(mission_price * Decimal('0.95'))

    pool_percent = _q(settings.employee_pool_percent)
    pool_amount = _q(mission_net * pool_percent / Decimal('100'))
    if pool_amount <= 0:
        return []

    is_team = len(assignees) > 1
    lead_mult = _q(settings.lead_weight_multiplier) or Decimal('1')

    weighted = []
    total_weight = ZERO
    for row in assignees:
        emp = row.employee
        if not emp or not emp.is_active:
            continue
        weight = _q(getattr(emp, 'pay_weight', 1) or 1)
        is_lead = bool(getattr(row, 'is_lead', False))
        if is_lead and is_team:
            weight = _q(weight * lead_mult)
        weighted.append((emp, weight, is_lead))
        total_weight += weight

    if total_weight <= 0 or not weighted:
        return []

    created = []
    allocated = ZERO
    for idx, (emp, weight, is_lead) in enumerate(weighted):
        ratio = (weight / total_weight) if total_weight else ZERO
        if idx == len(weighted) - 1:
            amount = _q(pool_amount - allocated)
        else:
            amount = _q(pool_amount * ratio)
            allocated += amount

        earning, was_created = MissionEmployeeEarning.objects.get_or_create(
            mission=mission,
            employee=emp,
            defaults={
                'enterprise': enterprise,
                'mission_price': mission_price,
                'mission_net': mission_net,
                'pool_amount': pool_amount,
                'amount': amount,
                'is_team': is_team,
                'is_lead': is_lead,
                'team_size': len(weighted),
                'share_weight': weight,
                'share_ratio': ratio.quantize(Decimal('0.000001')),
                'status': MissionEmployeeEarning.Status.ACCRUED,
            },
        )
        if was_created:
            created.append(earning)
            Employee.objects.filter(pk=emp.pk).update(
                missions_completed=emp.missions_completed + 1,
            )

    # Marquer les affectations comme terminées
    EmployeeAssignment.objects.filter(
        mission=mission,
        completed_at__isnull=True,
        rejected_at__isnull=True,
    ).update(completed_at=timezone.now())

    return created


def default_period_bounds(frequency: str, *, ref: date | None = None) -> tuple[date, date]:
    """Bornes de la période courante (semaine ISO lun–dim, ou mois civil)."""
    ref = ref or timezone.localdate()
    if frequency == EnterprisePayrollSettings.Frequency.MONTHLY:
        start = ref.replace(day=1)
        end = ref.replace(day=monthrange(ref.year, ref.month)[1])
        return start, end

    # weekly : lundi → dimanche
    start = ref - timedelta(days=ref.weekday())
    end = start + timedelta(days=6)
    return start, end


@transaction.atomic
def generate_payroll_period(
    enterprise,
    *,
    frequency: str | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    generated_by=None,
    force_mode: str | None = None,
) -> PayrollPeriod:
    """Agrège les gains accrûs non inclus dans une période."""
    settings = get_or_create_payroll_settings(enterprise)
    if not settings.is_enabled:
        raise ValueError('La paie employés est désactivée pour cette entreprise')

    freq = frequency or settings.frequency
    mode = force_mode or settings.payment_mode
    if not period_start or not period_end:
        period_start, period_end = default_period_bounds(freq)

    if period_end < period_start:
        raise ValueError('period_end doit être >= period_start')

    existing = PayrollPeriod.objects.filter(
        enterprise=enterprise,
        period_start=period_start,
        period_end=period_end,
        frequency=freq,
    ).exclude(status=PayrollPeriod.Status.CANCELLED).first()
    if existing:
        return existing

    start_dt = timezone.make_aware(datetime.combine(period_start, time.min))
    end_dt = timezone.make_aware(datetime.combine(period_end, time(23, 59, 59)))

    earnings = list(
        MissionEmployeeEarning.objects.filter(
            enterprise=enterprise,
            status=MissionEmployeeEarning.Status.ACCRUED,
            accrued_at__gte=start_dt,
            accrued_at__lte=end_dt,
            payroll_line__isnull=True,
        ).select_related('employee', 'mission')
    )

    period = PayrollPeriod.objects.create(
        enterprise=enterprise,
        frequency=freq,
        payment_mode=mode,
        period_start=period_start,
        period_end=period_end,
        status=PayrollPeriod.Status.DRAFT,
        generated_by=generated_by,
    )

    by_employee: dict = {}
    for e in earnings:
        by_employee.setdefault(e.employee_id, []).append(e)

    total = ZERO
    mission_ids = set()
    for emp_id, rows in by_employee.items():
        emp = rows[0].employee
        gross = _q(sum((r.amount for r in rows), ZERO))
        solo = sum(1 for r in rows if not r.is_team)
        team = sum(1 for r in rows if r.is_team)
        lead = sum(1 for r in rows if r.is_lead)
        for r in rows:
            mission_ids.add(r.mission_id)

        line = PayrollLine.objects.create(
            period=period,
            employee=emp,
            missions_count=len(rows),
            solo_missions=solo,
            team_missions=team,
            lead_missions=lead,
            gross_amount=gross,
            adjustment=ZERO,
            net_amount=gross,
            status=PayrollLine.Status.PENDING,
        )
        MissionEmployeeEarning.objects.filter(id__in=[r.id for r in rows]).update(
            payroll_line=line,
            status=MissionEmployeeEarning.Status.INCLUDED,
        )
        total += gross

    period.employees_count = len(by_employee)
    period.missions_count = len(mission_ids)
    period.total_amount = total

    if mode == EnterprisePayrollSettings.PaymentMode.AUTOMATIC:
        period.status = PayrollPeriod.Status.APPROVED
        period.approved_by = generated_by
        period.approved_at = timezone.now()
        period.save()
        pay_payroll_period(period, paid_by=generated_by, automatic=True)
        period.refresh_from_db()
    else:
        period.status = PayrollPeriod.Status.PENDING_APPROVAL
        period.save(update_fields=[
            'employees_count', 'missions_count', 'total_amount', 'status', 'updated_at',
        ])

    return period


@transaction.atomic
def approve_payroll_period(period: PayrollPeriod, *, approved_by=None) -> PayrollPeriod:
    if period.status not in (
        PayrollPeriod.Status.DRAFT,
        PayrollPeriod.Status.PENDING_APPROVAL,
    ):
        raise ValueError('Seule une période brouillon / en attente peut être approuvée')
    period.status = PayrollPeriod.Status.APPROVED
    period.approved_by = approved_by
    period.approved_at = timezone.now()
    period.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
    return period


@transaction.atomic
def pay_payroll_period(
    period: PayrollPeriod,
    *,
    paid_by=None,
    automatic: bool = False,
) -> PayrollPeriod:
    """Marque la période comme payée et crédite le wallet des employés liés."""
    if period.status == PayrollPeriod.Status.PAID:
        return period
    if period.status not in (
        PayrollPeriod.Status.APPROVED,
        PayrollPeriod.Status.PENDING_APPROVAL,
    ) and not automatic:
        # En manuel : exiger approbation sauf si déjà approved
        if period.status != PayrollPeriod.Status.APPROVED:
            raise ValueError('Approuvez la période avant de payer')

    if period.status == PayrollPeriod.Status.PENDING_APPROVAL:
        approve_payroll_period(period, approved_by=paid_by)

    lines = list(period.lines.select_related('employee', 'employee__user'))
    now = timezone.now()

    for line in lines:
        if line.status == PayrollLine.Status.PAID:
            continue
        if line.net_amount <= 0:
            line.status = PayrollLine.Status.SKIPPED
            line.save(update_fields=['status'])
            continue

        emp = line.employee
        user = emp.user
        if user:
            # Débit logique entreprise (gérant) + crédit employé
            enterprise_user = period.enterprise.user
            WalletTransaction.objects.create(
                user=enterprise_user,
                transaction_type=WalletTransaction.TransactionType.EMPLOYEE_PAYROLL,
                amount=-_q(line.net_amount),
                currency='XOF',
                status=WalletTransaction.Status.COMPLETED,
                description=(
                    f'Paie employé {emp.first_name} {emp.last_name} '
                    f'({period.period_start} → {period.period_end})'
                ),
                mobile_money_reference=f'PAYROLL-{period.id}-{line.id}',
                completed_at=now,
            )
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.EMPLOYEE_PAYROLL,
                amount=_q(line.net_amount),
                currency='XOF',
                status=WalletTransaction.Status.COMPLETED,
                description=(
                    f'Rémunération {period.enterprise.company_name} '
                    f'({period.period_start} → {period.period_end})'
                ),
                mobile_money_reference=f'PAYROLL-{period.id}-{line.id}',
                completed_at=now,
            )

        line.status = PayrollLine.Status.PAID
        line.paid_at = now
        line.payment_reference = f'PAYROLL-{period.id}-{line.id}'
        line.save(update_fields=['status', 'paid_at', 'payment_reference'])

        MissionEmployeeEarning.objects.filter(payroll_line=line).update(
            status=MissionEmployeeEarning.Status.PAID,
            paid_at=now,
        )

    period.status = PayrollPeriod.Status.PAID
    period.paid_by = paid_by
    period.paid_at = now
    period.save(update_fields=['status', 'paid_by', 'paid_at', 'updated_at'])
    return period


def payroll_preview(enterprise) -> dict:
    """Aperçu des gains non encore inclus dans une période."""
    settings = get_or_create_payroll_settings(enterprise)
    accrued = MissionEmployeeEarning.objects.filter(
        enterprise=enterprise,
        status=MissionEmployeeEarning.Status.ACCRUED,
    )
    rows = []
    for emp_id in accrued.values_list('employee_id', flat=True).distinct():
        qs = accrued.filter(employee_id=emp_id)
        first = qs.select_related('employee').first()
        if not first:
            continue
        emp = first.employee
        rows.append({
            'employee_id': str(emp.id),
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'missions_count': qs.count(),
            'solo_missions': qs.filter(is_team=False).count(),
            'team_missions': qs.filter(is_team=True).count(),
            'total_amount': str(_q(qs.aggregate(t=Sum('amount'))['t'] or 0)),
        })

    period_start, period_end = default_period_bounds(settings.frequency)
    return {
        'settings': {
            'is_enabled': settings.is_enabled,
            'frequency': settings.frequency,
            'payment_mode': settings.payment_mode,
            'employee_pool_percent': str(settings.employee_pool_percent),
            'lead_weight_multiplier': str(settings.lead_weight_multiplier),
        },
        'suggested_period': {
            'start': period_start.isoformat(),
            'end': period_end.isoformat(),
            'frequency': settings.frequency,
        },
        'pending_earnings_count': accrued.count(),
        'pending_total': str(_q(accrued.aggregate(t=Sum('amount'))['t'] or 0)),
        'by_employee': rows,
    }


def _employee_payroll_stats(enterprise, employee: Employee) -> dict:
    earnings = MissionEmployeeEarning.objects.filter(
        enterprise=enterprise,
        employee=employee,
    )
    paid = earnings.filter(status=MissionEmployeeEarning.Status.PAID)
    pending = earnings.filter(status__in=[
        MissionEmployeeEarning.Status.ACCRUED,
        MissionEmployeeEarning.Status.INCLUDED,
    ])
    assignments = EmployeeAssignment.objects.filter(
        employee=employee,
        rejected_at__isnull=True,
    )
    completed_assignments = assignments.filter(completed_at__isnull=False)

    last_earning = earnings.order_by('-accrued_at').values_list('accrued_at', flat=True).first()
    last_paid = paid.order_by('-paid_at').values_list('paid_at', flat=True).first()

    return {
        'employee_id': str(employee.id),
        'first_name': employee.first_name,
        'last_name': employee.last_name,
        'email': employee.email or '',
        'phone': employee.phone or '',
        'position': employee.position or '',
        'role': employee.role,
        'is_active': employee.is_active,
        'pay_weight': str(_q(getattr(employee, 'pay_weight', 1) or 1)),
        'pay_phone': getattr(employee, 'pay_phone', '') or '',
        'missions_completed_profile': employee.missions_completed,
        'missions_assigned': assignments.count(),
        'missions_completed_assignments': completed_assignments.count(),
        'earnings_total': str(_q(earnings.aggregate(t=Sum('amount'))['t'] or 0)),
        'earnings_paid': str(_q(paid.aggregate(t=Sum('amount'))['t'] or 0)),
        'earnings_pending': str(_q(pending.aggregate(t=Sum('amount'))['t'] or 0)),
        'earnings_count': earnings.count(),
        'solo_missions': earnings.filter(is_team=False).count(),
        'team_missions': earnings.filter(is_team=True).count(),
        'lead_missions': earnings.filter(is_lead=True).count(),
        'last_earning_at': last_earning.isoformat() if last_earning else None,
        'last_paid_at': last_paid.isoformat() if last_paid else None,
    }


def payroll_dashboard(enterprise) -> dict:
    """Tableau de bord paie : stats globales, employés, historique paiements."""
    settings = get_or_create_payroll_settings(enterprise)
    preview = payroll_preview(enterprise)

    employees = Employee.objects.filter(enterprise=enterprise).order_by('last_name', 'first_name')
    employee_rows = [_employee_payroll_stats(enterprise, emp) for emp in employees]

    all_earnings = MissionEmployeeEarning.objects.filter(enterprise=enterprise)
    paid_lines = PayrollLine.objects.filter(
        period__enterprise=enterprise,
        status=PayrollLine.Status.PAID,
    ).select_related('employee', 'period').order_by('-paid_at')[:100]

    payment_history = [
        {
            'id': str(line.id),
            'employee_id': str(line.employee_id),
            'employee_name': f'{line.employee.first_name} {line.employee.last_name}'.strip(),
            'period_id': str(line.period_id),
            'period_start': line.period.period_start.isoformat(),
            'period_end': line.period.period_end.isoformat(),
            'frequency': line.period.frequency,
            'missions_count': line.missions_count,
            'solo_missions': line.solo_missions,
            'team_missions': line.team_missions,
            'net_amount': str(_q(line.net_amount)),
            'paid_at': line.paid_at.isoformat() if line.paid_at else None,
            'payment_reference': line.payment_reference or '',
            'status': line.status,
        }
        for line in paid_lines
    ]

    periods = PayrollPeriod.objects.filter(enterprise=enterprise).order_by('-period_start')[:20]
    period_rows = [
        {
            'id': str(p.id),
            'period_start': p.period_start.isoformat(),
            'period_end': p.period_end.isoformat(),
            'frequency': p.frequency,
            'payment_mode': p.payment_mode,
            'status': p.status,
            'employees_count': p.employees_count,
            'missions_count': p.missions_count,
            'total_amount': str(_q(p.total_amount)),
            'paid_at': p.paid_at.isoformat() if p.paid_at else None,
        }
        for p in periods
    ]

    return {
        'settings': preview['settings'],
        'suggested_period': preview['suggested_period'],
        'summary': {
            'employees_count': employees.count(),
            'active_employees': employees.filter(is_active=True).count(),
            'pending_total': preview['pending_total'],
            'pending_earnings_count': preview['pending_earnings_count'],
            'paid_total': str(_q(
                all_earnings.filter(status=MissionEmployeeEarning.Status.PAID)
                .aggregate(t=Sum('amount'))['t'] or 0
            )),
            'lifetime_total': str(_q(all_earnings.aggregate(t=Sum('amount'))['t'] or 0)),
            'periods_count': PayrollPeriod.objects.filter(enterprise=enterprise).count(),
        },
        'employees': employee_rows,
        'payment_history': payment_history,
        'periods': period_rows,
        'pending_by_employee': preview['by_employee'],
    }


def payroll_employee_detail(enterprise, employee_id) -> dict | None:
    """Détail salaire + stats travail + historique d'un employé."""
    employee = Employee.objects.filter(id=employee_id, enterprise=enterprise).first()
    if not employee:
        return None

    stats = _employee_payroll_stats(enterprise, employee)

    earnings = (
        MissionEmployeeEarning.objects.filter(enterprise=enterprise, employee=employee)
        .select_related('mission')
        .order_by('-accrued_at')[:100]
    )
    earning_rows = [
        {
            'id': str(e.id),
            'mission_id': str(e.mission_id),
            'mission_title': e.mission.title if e.mission_id else '',
            'mission_price': str(_q(e.mission_price)),
            'amount': str(_q(e.amount)),
            'is_team': e.is_team,
            'is_lead': e.is_lead,
            'team_size': e.team_size,
            'share_ratio': str(e.share_ratio),
            'status': e.status,
            'accrued_at': e.accrued_at.isoformat() if e.accrued_at else None,
            'paid_at': e.paid_at.isoformat() if e.paid_at else None,
        }
        for e in earnings
    ]

    lines = (
        PayrollLine.objects.filter(period__enterprise=enterprise, employee=employee)
        .select_related('period')
        .order_by('-period__period_start')[:50]
    )
    payment_rows = [
        {
            'id': str(line.id),
            'period_id': str(line.period_id),
            'period_start': line.period.period_start.isoformat(),
            'period_end': line.period.period_end.isoformat(),
            'frequency': line.period.frequency,
            'missions_count': line.missions_count,
            'solo_missions': line.solo_missions,
            'team_missions': line.team_missions,
            'lead_missions': line.lead_missions,
            'gross_amount': str(_q(line.gross_amount)),
            'net_amount': str(_q(line.net_amount)),
            'status': line.status,
            'paid_at': line.paid_at.isoformat() if line.paid_at else None,
            'payment_reference': line.payment_reference or '',
        }
        for line in lines
    ]

    recent_assignments = (
        EmployeeAssignment.objects.filter(employee=employee)
        .select_related('mission')
        .order_by('-assigned_at')[:30]
    )
    assignment_rows = [
        {
            'id': str(a.id),
            'mission_id': str(a.mission_id),
            'mission_title': a.mission.title if a.mission_id else '',
            'mission_status': a.mission.status if a.mission_id else '',
            'is_lead': a.is_lead,
            'assigned_at': a.assigned_at.isoformat() if a.assigned_at else None,
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
            'rejected_at': a.rejected_at.isoformat() if a.rejected_at else None,
        }
        for a in recent_assignments
    ]

    return {
        'employee': stats,
        'earnings': earning_rows,
        'payments': payment_rows,
        'assignments': assignment_rows,
    }
