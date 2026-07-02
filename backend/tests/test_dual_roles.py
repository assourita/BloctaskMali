import pytest


@pytest.mark.django_db
def test_provider_has_client_secondary_role(provider_user):
    provider_user.refresh_from_db()
    assert provider_user.secondary_role == 'client'
    assert provider_user.get_effective_role() == 'provider'


@pytest.mark.django_db
def test_switch_to_client_space(provider_user):
    from apps.users.roles import get_effective_role

    provider_user.active_role = 'client'
    provider_user.save(update_fields=['active_role'])
    provider_user.refresh_from_db()

    assert get_effective_role(provider_user) == 'client'


@pytest.mark.django_db
def test_client_activate_provider_role(client_user):
    from apps.users.views import activate_provider_role
    from rest_framework.test import APIRequestFactory, force_authenticate

    factory = APIRequestFactory()
    request = factory.post('/api/users/activate-provider-role/')
    force_authenticate(request, user=client_user)

    response = activate_provider_role(request)
    client_user.refresh_from_db()

    assert response.status_code == 200
    assert client_user.secondary_role == 'provider'
