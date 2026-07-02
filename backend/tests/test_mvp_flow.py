"""Tests du flux MVP BlockTask."""
import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from apps.missions.models import Mission, MissionApplication
from apps.reputation.models import ReputationScore


@pytest.mark.django_db
def test_mission_application_flow(funded_mission, provider_user, client_user):
    application = MissionApplication.objects.create(
        mission=funded_mission,
        provider=provider_user,
        proposed_price=Decimal('5000'),
        status=MissionApplication.Status.PENDING,
    )
    assert application.status == 'pending'

    from apps.missions.views import _accept_application
    _accept_application(funded_mission, application, client_user)

    funded_mission.refresh_from_db()
    assert funded_mission.status == Mission.Status.ACCEPTED
    assert funded_mission.provider == provider_user
    assert funded_mission.deposit_paid is False
    assert funded_mission.deposit_deadline is not None

    profile = provider_user.provider_profile
    profile.deposit_balance = funded_mission.required_deposit
    profile.save(update_fields=['deposit_balance'])

    from apps.escrow.services import escrow_service
    deposit = escrow_service.lock_provider_deposit(funded_mission, provider_user)
    assert deposit is not None
    profile.refresh_from_db()
    assert profile.deposit_locked > 0


@pytest.mark.django_db
def test_mission_complete_updates_reputation(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.COMPLETED
    funded_mission.completed_at = timezone.now()
    funded_mission.save()

    from apps.reputation.services import recalculate_reputation
    score = recalculate_reputation(provider_user, event_type='mission_completed', mission=funded_mission)

    assert score.successful_missions >= 1
    assert ReputationScore.objects.filter(user=provider_user).exists()


@pytest.mark.django_db
def test_dispute_creation(funded_mission, provider_user, client_user):
    funded_mission.provider = provider_user
    funded_mission.status = Mission.Status.IN_PROGRESS
    funded_mission.save()

    from apps.disputes.models import Dispute
    dispute = Dispute.objects.create(
        mission=funded_mission,
        plaintiff=client_user,
        defendant=provider_user,
        reason='non_delivery',
        description='Colis non reçu',
        requested_resolution='Remboursement',
    )
    assert dispute.status == 'open'
    assert dispute.plaintiff == client_user
