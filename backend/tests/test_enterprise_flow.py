"""Tests du flux entreprise : candidature, caution collective, assignation employé."""
import pytest
from decimal import Decimal
from datetime import timedelta

from django.utils import timezone

from apps.missions.models import Mission, MissionApplication
from apps.users.enterprise_services import (
    accept_enterprise_as_provider,
    assign_employee_to_mission,
    create_employee_account,
)
from apps.escrow.services import escrow_service


@pytest.mark.django_db
def test_enterprise_apply_accept_and_deposit(funded_mission, enterprise_user, client_user):
    application = MissionApplication.objects.create(
        mission=funded_mission,
        provider=enterprise_user,
        proposed_price=Decimal('5000'),
        status=MissionApplication.Status.PENDING,
    )

    accept_enterprise_as_provider(
        funded_mission,
        enterprise_user.enterprise_profile,
        client_user,
        reason='Test acceptation entreprise',
    )

    funded_mission.refresh_from_db()
    assert funded_mission.status == Mission.Status.ACCEPTED
    assert funded_mission.assigned_enterprise_id == enterprise_user.enterprise_profile.id
    assert funded_mission.provider_id is None
    assert funded_mission.deposit_paid is False
    assert funded_mission.required_deposit is not None

    enterprise = enterprise_user.enterprise_profile
    enterprise.deposit_balance = funded_mission.required_deposit
    enterprise.save(update_fields=['deposit_balance'])

    deposit = escrow_service.lock_enterprise_deposit(funded_mission, enterprise)
    assert deposit is not None

    funded_mission.refresh_from_db()
    enterprise.refresh_from_db()
    assert funded_mission.deposit_paid is True
    assert enterprise.deposit_locked > 0


@pytest.mark.django_db
def test_enterprise_assign_employee_after_deposit(funded_mission, enterprise_user, client_user):
    accept_enterprise_as_provider(
        funded_mission,
        enterprise_user.enterprise_profile,
        client_user,
    )
    enterprise = enterprise_user.enterprise_profile
    enterprise.deposit_balance = funded_mission.required_deposit
    enterprise.save(update_fields=['deposit_balance'])
    escrow_service.lock_enterprise_deposit(funded_mission, enterprise)

    employee, _password = create_employee_account(
        enterprise=enterprise,
        first_name='Agent',
        last_name='Terrain',
        email='agent.ent@test.ml',
        phone='+22370009999',
    )

    assign_employee_to_mission(funded_mission, employee, enterprise_user)

    funded_mission.refresh_from_db()
    assert funded_mission.executing_employee_id == employee.id
    assert funded_mission.provider_id == employee.user_id


@pytest.mark.django_db
def test_enterprise_can_order_mission(enterprise_user, category):
    mission = Mission.objects.create(
        client=enterprise_user,
        category=category,
        title='Mission commandée par entreprise',
        description='Test donneur d\'ordre',
        budget=Decimal('8000'),
        currency='XOF',
        deadline=timezone.now() + timedelta(days=2),
        status=Mission.Status.DRAFT,
    )
    assert mission.client_id == enterprise_user.id
    assert enterprise_user.user_type == 'enterprise'
