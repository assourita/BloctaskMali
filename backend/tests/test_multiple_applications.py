"""Tests candidatures multiples sur une mission financée."""
import pytest
from decimal import Decimal

from apps.missions.models import MissionApplication
from apps.missions.eligibility import (
    mission_is_open_for_applications,
    provider_can_apply_to_mission,
    get_apply_block_reason,
)
from apps.users.models import User, ProviderProfile
from django.core.files.uploadedfile import SimpleUploadedFile


def _make_provider(username: str, email: str):
    tiny_png = SimpleUploadedFile('id.png', b'\x89PNG\r\n\x1a\n', content_type='image/png')
    user = User.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        user_type='provider',
        first_name='Provider',
        last_name=username,
        phone_number='+22370009999',
        phone_verified=True,
        nina='ML1111001111',
        city='Bamako',
        address='Rue test',
        id_card_front=tiny_png,
        id_card_back=tiny_png,
        selfie_verification=tiny_png,
        kyc_status='verified',
        email_verified=True,
    )
    ProviderProfile.objects.filter(user=user).update(is_available=True, deposit_balance=Decimal('50000'))
    return user


@pytest.mark.django_db
def test_multiple_providers_can_apply_while_unassigned(funded_mission, provider_user):
    provider_b = _make_provider('provider_b', 'providerb@test.ml')

    assert mission_is_open_for_applications(funded_mission)
    assert provider_can_apply_to_mission(provider_user, funded_mission)
    assert provider_can_apply_to_mission(provider_b, funded_mission)

    MissionApplication.objects.create(
        mission=funded_mission,
        provider=provider_user,
        proposed_price=Decimal('5000'),
        status=MissionApplication.Status.PENDING,
    )

    funded_mission.refresh_from_db()
    assert mission_is_open_for_applications(funded_mission)
    assert provider_can_apply_to_mission(provider_b, funded_mission) is True
    assert provider_can_apply_to_mission(provider_user, funded_mission) is False
    assert get_apply_block_reason(provider_user, funded_mission) == 'already_applied'


@pytest.mark.django_db
def test_applications_closed_after_provider_assigned(funded_mission, provider_user):
    provider_b = _make_provider('provider_c', 'providerc@test.ml')

    funded_mission.provider = provider_user
    funded_mission.save(update_fields=['provider'])

    assert mission_is_open_for_applications(funded_mission) is False
    assert provider_can_apply_to_mission(provider_b, funded_mission) is False
    assert get_apply_block_reason(provider_b, funded_mission) == 'assigned'
