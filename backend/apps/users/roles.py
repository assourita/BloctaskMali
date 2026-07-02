"""Helpers pour la gestion des rôles primaire / secondaire / actif."""


def get_available_roles(user) -> list:
    """Rôles accessibles (primaire + secondaire)."""
    roles = []
    if user.user_type:
        roles.append(user.user_type)
    if user.secondary_role and user.secondary_role not in roles:
        roles.append(user.secondary_role)
    return roles


def get_effective_role(user) -> str:
    """Rôle actif dans l'interface (espace courant)."""
    active = getattr(user, 'active_role', None) or user.user_type
    if active in get_available_roles(user):
        return active
    return user.user_type


def has_role(user, role: str) -> bool:
    if role == 'enterprise':
        return getattr(user, 'user_type', '') == 'enterprise'
    return role in get_available_roles(user)


def is_acting_as(user, role: str) -> bool:
    return get_effective_role(user) == role


def can_act_as_provider(user) -> bool:
    return has_role(user, 'provider')


def can_act_as_client(user) -> bool:
    return has_role(user, 'client')


def resolve_request_role(user, role_override: str | None = None) -> str:
    """Rôle pour les requêtes API : override explicite (espace UI) ou rôle actif."""
    if role_override in ('client', 'provider', 'enterprise') and has_role(user, role_override):
        return role_override
    return get_effective_role(user)


def is_enterprise_manager(user) -> bool:
    return getattr(user, 'user_type', '') == 'enterprise'


def is_enterprise_field_agent(user) -> bool:
    return hasattr(user, 'employee_profile') and user.employee_profile.is_active
