import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.users.models import User
from apps.users.kyc_access import (
    KYC_ACCESS_APPROVED,
    KYC_ACCESS_PENDING,
    KYC_ACCESS_REJECTED,
    can_access_platform,
    get_kyc_access_status,
)
from apps.users.profile_completion import get_profile_missing_fields, is_profile_complete


@pytest.fixture
def kyc_complete_user(db):
    tiny_png = SimpleUploadedFile(
        'id.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'
    )
    return User.objects.create_user(
        username='kyc_user',
        email='kyc@test.ml',
        password='testpass123',
        user_type='client',
        first_name='KYC',
        last_name='User',
        phone_number='+22370123456',
        phone_verified=True,
        nina='ML1234567890',
        city='Bamako',
        address='Rue test',
        id_card_front=tiny_png,
        id_card_back=tiny_png,
        selfie_verification=tiny_png,
        kyc_status='pending',
    )


@pytest.fixture
def incomplete_client_user(db):
    return User.objects.create_user(
        username='incomplete_client',
        email='incomplete@test.ml',
        password='testpass123',
        user_type='client',
        first_name='Incomplete',
        last_name='Client',
        phone_number='+22370009999',
        city='Bamako',
        address='Rue test',
    )


@pytest.mark.django_db
def test_profile_incomplete_without_kyc(incomplete_client_user):
    missing = get_profile_missing_fields(incomplete_client_user)
    assert 'nina' in missing
    assert 'phone_verified' in missing
    assert 'id_card_front' in missing
    assert not is_profile_complete(incomplete_client_user)


@pytest.mark.django_db
def test_profile_complete_with_kyc(kyc_complete_user):
    missing = get_profile_missing_fields(kyc_complete_user)
    assert 'nina' not in missing
    assert 'phone_verified' not in missing
    assert is_profile_complete(kyc_complete_user)


@pytest.mark.django_db
def test_platform_blocked_while_kyc_pending(kyc_complete_user):
    assert get_kyc_access_status(kyc_complete_user) == KYC_ACCESS_PENDING
    assert not can_access_platform(kyc_complete_user)


@pytest.mark.django_db
def test_platform_open_when_kyc_verified(kyc_complete_user):
    kyc_complete_user.kyc_status = User.KYCStatus.VERIFIED
    kyc_complete_user.save()
    assert get_kyc_access_status(kyc_complete_user) == KYC_ACCESS_APPROVED
    assert can_access_platform(kyc_complete_user)


@pytest.mark.django_db
def test_platform_blocked_when_kyc_rejected(kyc_complete_user):
    kyc_complete_user.kyc_status = User.KYCStatus.REJECTED
    kyc_complete_user.save()
    assert get_kyc_access_status(kyc_complete_user) == KYC_ACCESS_REJECTED
    assert not can_access_platform(kyc_complete_user)
