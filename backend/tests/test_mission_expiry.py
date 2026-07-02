"""Tests expiration de mission et remboursements."""
import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from apps.missions.models import Mission
from apps.missions.services import (
    cancel_mission_with_refunds,
    process_expired_missions,
    continue_expired_mission,
    CLIENT_DECISION_HOURS,
)
from apps.escrow.models import EscrowTransaction
from apps.escrow.services import escrow_service


@pytest.mark.django_db
def test_auto_expire_no_provider_refunds_client(funded_mission, client_user):
    funded_mission.deadline = timezone.now() - timedelta(hours=1)
    funded_mission.save(update_fields=['deadline'])

    escrow_service.confirm_escrow_deposit(funded_mission, tx_hash='TEST-TX-001')

    stats = process_expired_missions()
    assert stats['auto_expired'] == 1

    funded_mission.refresh_from_db()
    assert funded_mission.status == Mission.Status.EXPIRED
    assert funded_mission.provider is None
    assert EscrowTransaction.objects.filter(
        mission=funded_mission,
        transaction_type='refund',
        status='confirmed',
    ).exists()

    payment = funded_mission.payment
    payment.refresh_from_db()
    assert payment.status == 'refunded'


@pytest.mark.django_db
def test_expired_with_provider_sets_decision_pending(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.ACCEPTED
    funded_mission.deadline = timezone.now() - timedelta(hours=1)
    funded_mission.save()

    stats = process_expired_missions()
    assert stats['decision_notified'] == 1

    funded_mission.refresh_from_db()
    assert funded_mission.expiry_decision_pending is True
    assert funded_mission.expiry_decision_due_at is not None
    assert funded_mission.status == Mission.Status.ACCEPTED


@pytest.mark.django_db
def test_expire_decision_continue_extends_deadline(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.ACCEPTED
    funded_mission.deadline = timezone.now() - timedelta(hours=1)
    funded_mission.expiry_decision_pending = True
    funded_mission.expiry_decision_due_at = timezone.now() + timedelta(hours=CLIENT_DECISION_HOURS)
    funded_mission.save()

    new_deadline = timezone.now() + timedelta(days=3)
    result = continue_expired_mission(
        funded_mission,
        new_deadline=new_deadline,
        changed_by=client_user,
    )
    assert result['ok'] is True

    funded_mission.refresh_from_db()
    assert funded_mission.expiry_decision_pending is False
    assert funded_mission.deadline == new_deadline


@pytest.mark.django_db
def test_cancel_with_deposit_refunds_both(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.ACCEPTED
    funded_mission.deadline = timezone.now() + timedelta(days=1)
    funded_mission.save()

    escrow_service.confirm_escrow_deposit(funded_mission, tx_hash='TEST-TX-002')

    profile = provider_user.provider_profile
    profile.deposit_balance = Decimal('5000')
    profile.save()
    escrow_service.lock_provider_deposit(funded_mission, provider_user)
    funded_mission.refresh_from_db()
    assert funded_mission.deposit_paid is True

    result = cancel_mission_with_refunds(
        funded_mission,
        changed_by=client_user,
        reason='Annulation test',
    )
    assert result['ok'] is True
    assert result['client_refund'] is not None
    assert result['deposit_refunded'] is True

    funded_mission.refresh_from_db()
    assert funded_mission.status == Mission.Status.CANCELLED
    assert funded_mission.deposit_paid is False

    profile.refresh_from_db()
    assert profile.deposit_balance == Decimal('5000')


@pytest.mark.django_db
def test_cancel_in_progress_requires_dispute(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.IN_PROGRESS
    funded_mission.save()

    result = cancel_mission_with_refunds(
        funded_mission,
        changed_by=client_user,
        reason='Tentative annulation',
    )
    assert result['ok'] is False
    assert result['dispute_required'] is True

    funded_mission.refresh_from_db()
    assert funded_mission.status == Mission.Status.IN_PROGRESS
