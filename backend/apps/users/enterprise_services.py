"""Logique métier entreprise : employés, candidatures, assignations."""
import secrets
import string

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.missions.models import Mission, MissionApplication, MissionStatusHistory
from apps.missions.services import schedule_deposit_deadline

User = get_user_model()


def _temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_employee_account(*, enterprise, first_name, last_name, email, phone, position='', role='agent'):
    """Crée un compte provider rattaché à l'entreprise + fiche Employee.

    Si l'email appartient déjà à un prestataire, utiliser invite_provider_to_enterprise.
    """
    from .models import Employee, ProviderProfile
    from .employee_helpers import sync_managed_by_enterprise

    email = (email or '').strip().lower()
    if not email:
        raise ValueError('Email requis pour créer le compte employé')

    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        raise ValueError(
            'Un compte existe déjà avec cet email. Utilisez l\'invitation prestataire.'
        )

    username = email.split('@')[0]
    base = username
    n = 1
    while User.objects.filter(username=username).exists():
        username = f'{base}{n}'
        n += 1

    password = _temp_password()
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone or '',
        user_type=User.UserType.PROVIDER,
    )
    ProviderProfile.objects.filter(user=user).update(
        managed_by_enterprise=enterprise,
        is_available=True,
    )
    employee = Employee.objects.create(
        enterprise=enterprise,
        user=user,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone or '',
        position=position or 'Agent terrain',
        role=role,
    )
    sync_managed_by_enterprise(user)
    refresh_enterprise_employee_count(enterprise)
    return employee, password


def invite_provider_to_enterprise(
    *,
    enterprise,
    email,
    invited_by,
    role='agent',
    position='Agent terrain',
    message='',
    days_valid=14,
):
    """Invite un prestataire existant (ou email) — acceptation obligatoire."""
    from datetime import timedelta

    from .models import Employee, EnterpriseInvite

    email = (email or '').strip().lower()
    if not email:
        raise ValueError('Email requis')

    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user:
        if existing_user.user_type != User.UserType.PROVIDER and existing_user.secondary_role != 'provider':
            raise ValueError('Ce compte n\'est pas un prestataire')
        if Employee.objects.filter(enterprise=enterprise, user=existing_user, is_active=True).exists():
            raise ValueError('Ce prestataire est déjà employé de votre entreprise')
        pending = EnterpriseInvite.objects.filter(
            enterprise=enterprise,
            email=email,
            status=EnterpriseInvite.Status.PENDING,
            expires_at__gt=timezone.now(),
        ).exists()
        if pending:
            raise ValueError('Une invitation est déjà en attente pour cet email')

    invite = EnterpriseInvite.objects.create(
        enterprise=enterprise,
        email=email,
        user=existing_user,
        invited_by=invited_by,
        role=role or Employee.Role.AGENT,
        position=position or 'Agent terrain',
        token=secrets.token_urlsafe(32),
        message=(message or '')[:1000],
        expires_at=timezone.now() + timedelta(days=days_valid),
        status=EnterpriseInvite.Status.PENDING,
    )

    if existing_user:
        from apps.notifications.services import create_notification
        create_notification(
            existing_user,
            'enterprise_invite',
            f'Invitation — {enterprise.company_name}',
            (
                f'{enterprise.company_name} vous invite à rejoindre son équipe '
                f'en tant que {invite.position or "agent"}.'
            ),
            action_url='/provider/dashboard',
        )

    return invite


def accept_enterprise_invite(*, invite, user):
    """Le prestataire accepte → crée/active Employee + sync managed_by."""
    from .models import Employee, EnterpriseInvite
    from .employee_helpers import sync_managed_by_enterprise

    if invite.status != EnterpriseInvite.Status.PENDING:
        raise ValueError('Cette invitation n\'est plus valide')
    if invite.expires_at <= timezone.now():
        invite.status = EnterpriseInvite.Status.EXPIRED
        invite.save(update_fields=['status', 'updated_at'])
        raise ValueError('Cette invitation a expiré')

    email = (user.email or '').strip().lower()
    if invite.user_id and invite.user_id != user.id:
        raise ValueError('Cette invitation ne vous est pas destinée')
    if not invite.user_id and email != invite.email.lower():
        raise ValueError('Cette invitation ne correspond pas à votre email')

    if user.user_type != User.UserType.PROVIDER and user.secondary_role != 'provider':
        raise ValueError('Seuls les prestataires peuvent accepter cette invitation')

    employee = Employee.objects.filter(enterprise=invite.enterprise, user=user).first()
    if employee:
        employee.is_active = True
        employee.terminated_at = None
        employee.role = invite.role
        employee.position = invite.position or employee.position
        employee.first_name = user.first_name or employee.first_name
        employee.last_name = user.last_name or employee.last_name
        employee.email = email
        employee.phone = user.phone_number or employee.phone
        employee.save()
    else:
        employee = Employee.objects.create(
            enterprise=invite.enterprise,
            user=user,
            first_name=user.first_name or invite.email.split('@')[0],
            last_name=user.last_name or '',
            email=email,
            phone=user.phone_number or '',
            position=invite.position or 'Agent terrain',
            role=invite.role,
            is_active=True,
        )

    invite.status = EnterpriseInvite.Status.ACCEPTED
    invite.user = user
    invite.responded_at = timezone.now()
    invite.save(update_fields=['status', 'user', 'responded_at', 'updated_at'])

    sync_managed_by_enterprise(user)
    refresh_enterprise_employee_count(invite.enterprise)

    if invite.invited_by_id:
        from apps.notifications.services import create_notification
        create_notification(
            invite.invited_by,
            'enterprise_invite_accepted',
            'Invitation acceptée',
            f'{user.get_full_name() or user.email} a rejoint {invite.enterprise.company_name}.',
            action_url='/enterprise/employees',
        )

    return employee


def reject_enterprise_invite(*, invite, user):
    from .models import EnterpriseInvite

    if invite.status != EnterpriseInvite.Status.PENDING:
        raise ValueError('Cette invitation n\'est plus valide')
    if invite.user_id and invite.user_id != user.id:
        raise ValueError('Cette invitation ne vous est pas destinée')
    email = (user.email or '').strip().lower()
    if not invite.user_id and email != invite.email.lower():
        raise ValueError('Cette invitation ne correspond pas à votre email')

    invite.status = EnterpriseInvite.Status.REJECTED
    invite.responded_at = timezone.now()
    invite.save(update_fields=['status', 'responded_at', 'updated_at'])
    return invite


def cancel_enterprise_invite(*, invite, enterprise):
    from .models import EnterpriseInvite

    if invite.enterprise_id != enterprise.id:
        raise ValueError('Invitation introuvable')
    if invite.status != EnterpriseInvite.Status.PENDING:
        raise ValueError('Cette invitation n\'est plus en attente')
    invite.status = EnterpriseInvite.Status.CANCELLED
    invite.save(update_fields=['status', 'updated_at'])
    return invite


def refresh_enterprise_employee_count(enterprise) -> None:
    enterprise.total_employees = enterprise.employees.filter(is_active=True).count()
    enterprise.save(update_fields=['total_employees'])


def update_employee_record(employee, **data):
    """Met à jour la fiche employé et synchronise le compte provider lié."""
    from .employee_helpers import sync_managed_by_enterprise
    import re

    def _norm_phone(value):
        if not value:
            return ''
        return re.sub(r'[\s\-().]', '', str(value).strip())

    allowed = {'first_name', 'last_name', 'email', 'phone', 'position', 'role', 'is_active', 'nina'}
    for key, value in data.items():
        if key in allowed:
            if key == 'phone':
                value = _norm_phone(value)
            if key == 'position' and not (value or '').strip():
                value = 'Agent terrain'
            setattr(employee, key, value)

    if employee.user_id:
        user = employee.user
        if 'first_name' in data:
            user.first_name = employee.first_name
        if 'last_name' in data:
            user.last_name = employee.last_name
        if 'phone' in data:
            user.phone_number = employee.phone or ''
        if 'email' in data and employee.email:
            user.email = employee.email.strip().lower()
        if 'is_active' in data:
            user.is_active = bool(employee.is_active)
        user.save()

    if data.get('is_active') is False:
        employee.terminated_at = timezone.now()
    elif data.get('is_active') is True:
        employee.terminated_at = None

    employee.save()
    if employee.user_id:
        sync_managed_by_enterprise(employee.user)
    refresh_enterprise_employee_count(employee.enterprise)
    return employee


def deactivate_employee(employee):
    """Désactive un employé (compte conservé, non supprimé)."""
    from .employee_helpers import sync_managed_by_enterprise

    result = update_employee_record(employee, is_active=False)
    if employee.user_id:
        sync_managed_by_enterprise(employee.user)
    return result


def accept_enterprise_as_provider(mission, enterprise, changed_by, *, reason=''):
    """L'entreprise devient prestataire contractuelle ; caution sur solde entreprise."""
    from apps.missions.category_rules import calculate_category_deposit

    mission.assigned_enterprise = enterprise
    mission.provider = None
    mission.executing_employee = None
    mission.status = Mission.Status.ACCEPTED
    mission.deposit_paid = False
    mission.deposit_tx_hash = None
    required = calculate_category_deposit(mission)
    mission.required_deposit = required
    mission.deposit_amount = required
    schedule_deposit_deadline(mission)
    mission.save()

    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=Mission.Status.FUNDED,
        new_status=Mission.Status.ACCEPTED,
        changed_by=changed_by,
        reason=reason or f'Entreprise acceptée : {enterprise.company_name}',
    )

    from apps.notifications.services import notify_mission_event
    notify_mission_event(
        mission,
        'accepted',
        enterprise.user,
        'Mission acceptée — déposez la caution entreprise',
        (
            f'Votre entreprise est retenue pour « {mission.title} ». '
            f'Déposez {mission.required_deposit} {mission.currency} depuis le solde '
            f'entreprise, puis assignez un employé.'
        ),
    )


def assign_employee_to_mission(mission, employee, assigned_by):
    """Lie un employé terrain à une mission entreprise (après acceptation)."""
    from .employee_validation import EmployeeValidator

    enterprise = employee.enterprise
    if mission.assigned_enterprise_id != enterprise.id:
        raise ValueError('Cette mission n\'est pas assignée à votre entreprise')
    if not mission.deposit_paid:
        raise ValueError('Déposez la caution entreprise avant d\'assigner un employé')
    if not employee.user_id or not employee.is_active:
        raise ValueError('Employé inactif ou sans compte prestataire')

    from .employee_helpers import get_employee_for_enterprise
    link = get_employee_for_enterprise(employee.user, enterprise)
    if not link or not link.is_active or link.id != employee.id:
        raise ValueError('Le prestataire n\'a pas de lien actif avec cette entreprise')

    validator = EmployeeValidator()
    validation_result = validator.validate_employee(employee)

    if not validation_result.can_assign_mission:
        critical_issues = [issue for issue in validation_result.issues if issue.severity == 'critical']
        if critical_issues:
            error_msg = "Impossible d'assigner cet employé - problèmes critiques :\n"
            solutions = "Solutions recommandées :\n"

            for i, issue in enumerate(critical_issues, 1):
                error_msg += f"{i}. {issue.message}\n"
                solutions += f"{i}. {issue.suggested_action}"
                if issue.can_auto_fix and issue.fix_endpoint:
                    solutions += f" (Action disponible: {issue.fix_endpoint})"
                solutions += "\n"

            from apps.notifications.services import create_notification
            create_notification(
                assigned_by,
                'employee_assignment_failed',
                'Échec d\'assignation d\'employé',
                f'Impossible d\'assigner {employee.first_name} {employee.last_name} à la mission "{mission.title}". {solutions}',
                mission=mission,
                action_url=f'/enterprise/employees/{employee.id}/fix'
            )

            raise ValueError(error_msg + "\n" + solutions)

    can_assign, mission_issues = validator.check_assignment_eligibility(employee, mission)
    if not can_assign:
        warning_issues = [issue for issue in mission_issues if issue.severity == 'warning']
        if warning_issues:
            warning_msg = "Attention - problèmes détectés :\n"
            for issue in warning_issues:
                warning_msg += f"- {issue.message}\n"

            from apps.notifications.services import create_notification
            create_notification(
                assigned_by,
                'employee_assignment_warning',
                'Assignation avec avertissements',
                f'{employee.first_name} {employee.last_name} assigné à "{mission.title}" mais : {warning_msg}',
                mission=mission,
                action_url=f'/enterprise/missions/{mission.id}'
            )

    mission.executing_employee = employee
    mission.provider = employee.user
    mission.save(update_fields=['executing_employee', 'provider', 'updated_at'])

    from apps.notifications.services import create_notification
    create_notification(
        employee.user,
        'mission_assigned',
        'Nouvelle mission assignée',
        f'Votre entreprise vous a assigné la mission « {mission.title} ».',
        mission=mission,
        action_url=f'/provider/missions/{mission.id}',
    )

    if validation_result.validation_score < 100:
        create_notification(
            assigned_by,
            'employee_assigned_with_issues',
            'Employé assigné - Actions recommandées',
            f'{employee.first_name} {employee.last_name} assigné avec score {validation_result.validation_score}%. Vérifiez les problèmes restants.',
            mission=mission,
            action_url=f'/enterprise/employees/{employee.id}/profile'
        )

    return mission


def enterprise_can_apply(user, mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'user_type', '') != User.UserType.ENTERPRISE:
        return False
    if mission.status != Mission.Status.FUNDED or mission.provider_id:
        return False
    if mission.client_id == user.id:
        return False
    if mission.assigned_enterprise_id:
        return False
    if MissionApplication.objects.filter(mission=mission, provider=user).exists():
        return False
    if mission.enterprise_only:
        return True
    return True
