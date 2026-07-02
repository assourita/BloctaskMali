import pytest
from decimal import Decimal
from datetime import timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.users.models import User, ProviderProfile
from apps.missions.models import Mission, Category
from apps.payments.models import Payment


@pytest.fixture(scope='session')
def django_db_setup():
    from django.conf import settings
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }


@pytest.fixture
def client_user(db):
    tiny_png = SimpleUploadedFile(
        'id.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'
    )
    return User.objects.create_user(
        username='client_test',
        email='client@test.ml',
        password='testpass123',
        user_type='client',
        first_name='Client',
        last_name='Test',
        phone_number='+22370001234',
        phone_verified=True,
        nina='ML1234001234',
        city='Bamako',
        address='Rue test',
        id_card_front=tiny_png,
        id_card_back=tiny_png,
        selfie_verification=tiny_png,
        kyc_status='verified',
        email_verified=True,
    )


@pytest.fixture
def provider_user(db):
    tiny_png = SimpleUploadedFile(
        'id.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'
    )
    user = User.objects.create_user(
        username='provider_test',
        email='provider@test.ml',
        password='testpass123',
        user_type='provider',
        first_name='Provider',
        last_name='Test',
        phone_number='+22370005678',
        phone_verified=True,
        nina='ML5678005678',
        city='Bamako',
        address='Rue test',
        id_card_front=tiny_png,
        id_card_back=tiny_png,
        selfie_verification=tiny_png,
        kyc_status='verified',
        email_verified=True,
    )
    ProviderProfile.objects.filter(user=user).update(deposit_balance=Decimal('100000'))
    return user


@pytest.fixture
def enterprise_user(db):
    from apps.users.enterprise_helpers import enterprise_profile_defaults
    from apps.users.models import EnterpriseProfile

    tiny_png = SimpleUploadedFile(
        'id.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'
    )
    user = User.objects.create_user(
        username='enterprise_test',
        email='enterprise@test.ml',
        password='testpass123',
        user_type='enterprise',
        first_name='Gerant',
        last_name='Entreprise',
        phone_number='+22370007890',
        phone_verified=True,
        nina='ML9999009999',
        city='Bamako',
        address='Zone industrielle',
        id_card_front=tiny_png,
        id_card_back=tiny_png,
        selfie_verification=tiny_png,
        kyc_status='verified',
        email_verified=True,
    )
    EnterpriseProfile.objects.get_or_create(
        user=user,
        defaults=enterprise_profile_defaults(user),
    )
    return user


@pytest.fixture
def category(db):
    cat, _ = Category.objects.get_or_create(
        slug='livraison-test',
        defaults={'name': 'Livraison Test'},
    )
    return cat


@pytest.fixture
def funded_mission(db, client_user, category):
    mission = Mission.objects.create(
        client=client_user,
        category=category,
        title='Test mission',
        description='Description test',
        budget=Decimal('5000'),
        currency='XOF',
        deadline=timezone.now() + timedelta(days=1),
        status=Mission.Status.FUNDED,
    )
    Payment.objects.create(
        mission=mission,
        client=client_user,
        amount=Decimal('5000'),
        escrow_amount=Decimal('5000'),
        currency='XOF',
        status=Payment.Status.COMPLETED,
        payment_method=Payment.PaymentMethod.MOBILE_MONEY,
        operator='orange',
        phone_number='+22370000000',
    )
    return mission
