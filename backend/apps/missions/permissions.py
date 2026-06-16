from rest_framework import permissions


class IsMissionOwner(permissions.BasePermission):
    """
    Permission qui vérifie que l'utilisateur est le client (propriétaire) de la mission.
    """
    def has_object_permission(self, request, view, obj):
        # Lire est autorisé pour tout utilisateur authentifié
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Écrire est réservé au client
        return obj.client == request.user


class IsMissionProvider(permissions.BasePermission):
    """
    Permission qui vérifie que l'utilisateur est le prestataire assigné à la mission.
    """
    def has_object_permission(self, request, view, obj):
        # Le prestataire peut agir sur la mission
        return obj.provider == request.user


class CanApplyToMission(permissions.BasePermission):
    """
    Permission qui vérifie qu'un utilisateur peut postuler à une mission.
    Doit être un prestataire avec profil complet.
    """
    def has_permission(self, request, view):
        # Vérifier que l'utilisateur est authentifié
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier que c'est un prestataire
        if request.user.user_type != 'provider':
            return False
        
        # Vérifier que le profil prestataire existe et est actif
        try:
            provider_profile = request.user.provider_profile
            return provider_profile.is_available and provider_profile.verification_status == 'verified'
        except:
            return False
    
    def has_object_permission(self, request, view, obj):
        # Vérifier les permissions de base
        if not self.has_permission(request, view):
            return False
        
        # Ne pas pouvoir postuler à sa propre mission
        if obj.client == request.user:
            return False
        
        return True


class IsEnterpriseMember(permissions.BasePermission):
    """
    Permission pour les membres d'une entreprise.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Vérifier si l'utilisateur est employé d'une entreprise
        return hasattr(request.user, 'employee_profile')
    
    def has_object_permission(self, request, view, obj):
        # Vérifier que l'employé appartient à l'entreprise de la mission
        if hasattr(request.user, 'employee_profile'):
            return obj.client == request.user.employee_profile.enterprise
        return False


class IsClientOrProvider(permissions.BasePermission):
    """
    Permission qui autorise le client ou le prestataire d'une mission.
    """
    def has_object_permission(self, request, view, obj):
        return request.user in [obj.client, obj.provider]
