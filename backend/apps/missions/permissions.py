from rest_framework import permissions

from apps.users.roles import can_act_as_provider, get_effective_role
from apps.users.employee_helpers import primary_employee, user_has_active_employee_link
from apps.users.kyc_access import can_access_platform, get_kyc_block_message
from apps.users.models import User
from .requirements import mission_requires_id_verification


class IsMissionOwner(permissions.BasePermission):
    """Permission qui vérifie que l'utilisateur est le client (propriétaire) de la mission."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.client == request.user


class IsMissionProvider(permissions.BasePermission):
    """Permission qui vérifie que l'utilisateur est le prestataire assigné à la mission."""

    def has_object_permission(self, request, view, obj):
        return obj.provider == request.user


class CanApplyToMission(permissions.BasePermission):
    """
    Permission pour postuler à une mission.
    Autorise tout utilisateur ayant le rôle prestataire (primaire ou secondaire activé).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not can_act_as_provider(request.user):
            return False

        if get_effective_role(request.user) != 'provider':
            return False

        if not can_access_platform(request.user):
            return False

        try:
            provider_profile = request.user.provider_profile
            return provider_profile.is_available
        except Exception:
            return False

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        if obj.client == request.user:
            return False
        if obj.requires_verified_provider and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return False
        if mission_requires_id_verification(obj) and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return False
        return True


class IsEnterpriseMember(permissions.BasePermission):
    """Permission pour les membres d'une entreprise."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return user_has_active_employee_link(request.user)

    def has_object_permission(self, request, view, obj):
        employee = primary_employee(request.user)
        if employee:
            return obj.client == employee.enterprise
        return False


class IsClientOrProvider(permissions.BasePermission):
    """Permission qui autorise le client ou le prestataire d'une mission."""

    def has_object_permission(self, request, view, obj):
        return request.user in [obj.client, obj.provider]
