"""Logique métier entreprise : employés, candidatures, assignations."""
import secrets
import string
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.missions.models import Mission, MissionApplication, MissionStatusHistory
from apps.missions.services import schedule_deposit_deadline

User = get_user_model()


def _temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_employee_account(*, enterprise, first_name, last_name, email, phone, position='', role='agent'):
    """Crée un compte provider rattaché à l'entreprise + fiche Employee."""
    from .models import Employee, ProviderProfile

    email = (email or '').strip().lower()
    if not email:
        raise ValueError('Email requis pour créer le compte employé')

    if User.objects.filter(email=email).exists():
        raise ValueError('Un compte existe déjà avec cet email')

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
    enterprise.total_employees = enterprise.employees.filter(is_active=True).count()
    enterprise.save(update_fields=['total_employees'])
    return employee, password


def refresh_enterprise_employee_count(enterprise) -> None:
    enterprise.total_employees = enterprise.employees.filter(is_active=True).count()
    enterprise.save(update_fields=['total_employees'])


def update_employee_record(employee, **data):
    """Met à jour la fiche employé et synchronise le compte provider lié."""
    from .models import ProviderProfile

    allowed = {'first_name', 'last_name', 'email', 'phone', 'position', 'role', 'is_active', 'nina'}
    for key, value in data.items():
        if key in allowed:
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
        ProviderProfile.objects.filter(user=employee.user).update(
            managed_by_enterprise=employee.enterprise,
        )
    refresh_enterprise_employee_count(employee.enterprise)
    return employee


def deactivate_employee(employee):
    """Désactive un employé (compte conservé, non supprimé)."""
    return update_employee_record(employee, is_active=False)


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
    enterprise = employee.enterprise
    if mission.assigned_enterprise_id != enterprise.id:
        raise ValueError('Cette mission n\'est pas assignée à votre entreprise')
    if not mission.deposit_paid:
        raise ValueError('Déposez la caution entreprise avant d\'assigner un employé')
    if not employee.user_id:
        raise ValueError('Cet employé n\'a pas de compte — recréez-le avec un email valide')
    if not employee.is_active:
        raise ValueError('Employé inactif')

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
