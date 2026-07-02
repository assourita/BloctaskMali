from rest_framework import permissions

from .kyc_access import can_access_platform, get_kyc_block_message


class HasKycPlatformAccess(permissions.BasePermission):
    """Accès complet uniquement si KYC approuvé par l'admin."""

    message = 'Vérification d\'identité requise.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.user_type == 'admin':
            return True
        if can_access_platform(request.user):
            return True
        self.message = get_kyc_block_message(request.user)
        return False
