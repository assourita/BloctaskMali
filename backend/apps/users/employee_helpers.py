"""Helpers multi-entreprises pour les liens Employee (FK user)."""
from __future__ import annotations


def employee_links_qs(user, *, active_only: bool = True):
    """QuerySet des fiches Employee liées à un user."""
    if not user or not getattr(user, 'is_authenticated', False):
        from apps.users.models import Employee
        return Employee.objects.none()
    qs = user.employee_links.select_related('enterprise', 'enterprise__user')
    if active_only:
        qs = qs.filter(is_active=True)
    return qs


def primary_employee(user):
    """Première fiche employee active (compat ancien OneToOne employee_profile)."""
    return employee_links_qs(user).order_by('-hired_at').first()


def get_employee_for_enterprise(user, enterprise):
    if not user or not enterprise:
        return None
    return employee_links_qs(user).filter(enterprise=enterprise).first()


def user_has_active_employee_link(user) -> bool:
    return employee_links_qs(user).exists()


def sync_managed_by_enterprise(user) -> None:
    """Met à jour ProviderProfile.managed_by_enterprise (dérivé, 1ère entreprise active)."""
    from apps.users.models import ProviderProfile

    link = primary_employee(user)
    enterprise = link.enterprise if link else None
    ProviderProfile.objects.filter(user=user).update(managed_by_enterprise=enterprise)
