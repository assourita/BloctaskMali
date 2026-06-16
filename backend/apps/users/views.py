"""
BlockTask Users Views
"""

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import ProviderProfile, EnterpriseProfile, Employee, WalletTransaction
from apps.missions.models import Mission
from apps.disputes.models import Dispute
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileSerializer,
    ProviderProfileSerializer, EnterpriseProfileSerializer, EmployeeSerializer,
    WalletTransactionSerializer, KYCSerializer, WalletConnectSerializer,
    ChangePasswordSerializer, UserListSerializer, AdminUserSerializer
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Inscription utilisateur"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Créer le profil spécifique selon le type (si pas déjà créé par le signal)
        if user.user_type == User.UserType.PROVIDER:
            ProviderProfile.objects.get_or_create(user=user, defaults={})
        elif user.user_type == User.UserType.ENTERPRISE:
            EnterpriseProfile.objects.get_or_create(
                user=user, 
                defaults={'company_name': user.first_name or user.username}
            )
        
        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Profil utilisateur connecté"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'un utilisateur (admin)"""
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'options']


class UserListView(generics.ListAPIView):
    """Liste des utilisateurs (admin)"""
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        # Filtres
        user_type = self.request.query_params.get('user_type')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        kyc_status = self.request.query_params.get('kyc_status')
        if kyc_status:
            queryset = queryset.filter(kyc_status=kyc_status)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related('provider_profile', 'enterprise_profile')


class ProviderProfileView(generics.RetrieveUpdateAPIView):
    """Profil prestataire"""
    serializer_class = ProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        user = self.request.user
        if user.user_type != User.UserType.PROVIDER:
            raise permissions.PermissionDenied("Vous n'êtes pas un prestataire.")
        
        profile, created = ProviderProfile.objects.get_or_create(user=user)
        return profile


class EnterpriseProfileView(generics.RetrieveUpdateAPIView):
    """Profil entreprise"""
    serializer_class = EnterpriseProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        user = self.request.user
        if user.user_type != User.UserType.ENTERPRISE:
            raise permissions.PermissionDenied("Vous n'êtes pas une entreprise.")
        
        profile, created = EnterpriseProfile.objects.get_or_create(
            user=user,
            defaults={'company_name': user.first_name or user.email}
        )
        return profile


class EmployeeListCreateView(generics.ListCreateAPIView):
    """Liste et création d'employés"""
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == User.UserType.ENTERPRISE:
            return Employee.objects.filter(enterprise=user.enterprise_profile)
        return Employee.objects.none()
    
    def perform_create(self, serializer):
        user = self.request.user
        enterprise = user.enterprise_profile
        serializer.save(enterprise=enterprise)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, mise à jour et suppression d'un employé"""
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == User.UserType.ENTERPRISE:
            return Employee.objects.filter(enterprise=user.enterprise_profile)
        return Employee.objects.none()


class WalletTransactionListView(generics.ListAPIView):
    """Historique des transactions wallet"""
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return WalletTransaction.objects.filter(user=self.request.user)


class KYCSubmissionView(generics.UpdateAPIView):
    """Soumission KYC"""
    serializer_class = KYCSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        serializer.save(kyc_status=User.KYCStatus.PENDING, kyc_submitted_at=timezone.now())


class WalletConnectView(APIView):
    """Connexion wallet blockchain"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = WalletConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Vérifier la signature (à implémenter avec Web3)
        wallet_address = serializer.validated_data['wallet_address']
        
        # Mettre à jour l'adresse wallet
        user = request.user
        user.wallet_address = wallet_address
        user.save()
        
        return Response({
            'message': 'Wallet connecté avec succès.',
            'wallet_address': wallet_address
        })


class ChangePasswordView(APIView):
    """Changement de mot de passe"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Vérifier l'ancien mot de passe
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Ancien mot de passe incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Changer le mot de passe
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Mot de passe changé avec succès.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_stats(request):
    """Statistiques utilisateur pour le dashboard"""
    user = request.user
    
    stats = {
        'user_type': user.user_type,
        'total_missions': 0,
        'active_missions': 0,
        'completed_missions': 0,
        'total_spent': 0,
        'total_earned': 0,
        'wallet_balance': 0,
        'reputation_score': 50.0,
    }
    
    if user.user_type == User.UserType.CLIENT:
        missions = user.client_missions.all()
        stats['total_missions'] = missions.count()
        stats['active_missions'] = missions.filter(
            status__in=['funded', 'accepted', 'in_progress', 'submitted']
        ).count()
        stats['completed_missions'] = missions.filter(status='completed').count()
        # Calculer le total dépensé
        
    elif user.user_type == User.UserType.PROVIDER:
        if hasattr(user, 'provider_profile'):
            profile = user.provider_profile
            stats['total_missions'] = profile.total_missions_completed
            stats['active_missions'] = user.provider_missions.filter(
                status__in=['accepted', 'in_progress', 'submitted']
            ).count()
            stats['total_earned'] = float(profile.total_earnings)
            stats['reputation_score'] = profile.reputation_score
            stats['level'] = profile.level
            stats['deposit_balance'] = float(profile.deposit_balance)
            stats['deposit_locked'] = float(profile.deposit_locked)
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_availability(request):
    """Changer la disponibilité du prestataire"""
    user = request.user
    
    if user.user_type != User.UserType.PROVIDER:
        return Response(
            {'error': 'Seuls les prestataires peuvent changer leur disponibilité.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not hasattr(user, 'provider_profile'):
        return Response(
            {'error': 'Profil prestataire non trouvé.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    profile = user.provider_profile
    profile.is_available = not profile.is_available
    profile.save()
    
    return Response({
        'is_available': profile.is_available,
        'message': f"Disponibilité mise à jour: {'Disponible' if profile.is_available else 'Indisponible'}"
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_stats(request):
    """Statistiques pour le dashboard admin"""
    if not request.user.is_staff:
        return Response({'error': 'Accès réservé aux administrateurs.'}, status=403)
    
    stats = {
        'total_users': User.objects.count(),
        'total_clients': User.objects.filter(user_type='client').count(),
        'total_providers': User.objects.filter(user_type='provider').count(),
        'total_enterprises': User.objects.filter(user_type='enterprise').count(),
        'total_missions': Mission.objects.count(),
        'pending_kyc': User.objects.filter(kyc_status='pending').count(),
        'pending_disputes': Dispute.objects.filter(status='open').count(),
        'active_missions': Mission.objects.filter(status__in=['assigned', 'in_progress']).count(),
        'completed_missions': Mission.objects.filter(status='completed').count(),
    }
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_gps_tracking(request):
    """Active ou désactive le suivi GPS de l'utilisateur"""
    user = request.user
    if user.user_type == User.UserType.ADMIN:
        return Response({'error': 'Le suivi GPS n\'est pas disponible pour les administrateurs.'}, status=status.HTTP_400_BAD_REQUEST)
    enabled = request.data.get('enabled')
    if enabled is None:
        user.gps_tracking_enabled = not user.gps_tracking_enabled
    else:
        user.gps_tracking_enabled = bool(enabled)
    user.save(update_fields=['gps_tracking_enabled'])
    return Response({
        'gps_tracking_enabled': user.gps_tracking_enabled,
        'message': f"Suivi GPS {'activé' if user.gps_tracking_enabled else 'désactivé'} avec succès."
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def activate_provider_role(request):
    """Active le rôle secondaire prestataire pour un client"""
    user = request.user
    if user.user_type != User.UserType.CLIENT:
        return Response({'error': 'Seuls les clients peuvent activer un profil prestataire.'}, status=status.HTTP_400_BAD_REQUEST)
    if user.secondary_role == User.UserType.PROVIDER:
        return Response({'message': 'Profil prestataire déjà activé.', 'secondary_role': user.secondary_role})
    with transaction.atomic():
        user.secondary_role = User.UserType.PROVIDER
        user.save(update_fields=['secondary_role'])
        ProviderProfile.objects.get_or_create(user=user)
    return Response({
        'message': 'Profil prestataire activé avec succès.',
        'secondary_role': user.secondary_role,
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def switch_active_role(request):
    """Switche l'espace actif entre rôle primaire et secondaire"""
    user = request.user
    target_role = request.data.get('role')
    allowed = [r for r in [user.user_type, user.secondary_role] if r]
    if target_role not in allowed:
        return Response({'error': f'Rôle "{target_role}" non disponible pour cet utilisateur.'}, status=status.HTTP_400_BAD_REQUEST)
    user.active_role = target_role
    user.save(update_fields=['active_role'])
    return Response({
        'active_role': user.active_role,
        'user': UserSerializer(user).data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_recent_activity(request):
    """Activité récente pour le dashboard admin"""
    if not request.user.is_staff:
        return Response({'error': 'Accès réservé aux administrateurs.'}, status=403)
    
    # Récupérer les utilisateurs récents
    recent_users = User.objects.order_by('-created_at')[:5]
    recent_missions = Mission.objects.order_by('-created_at')[:5]
    recent_disputes = Dispute.objects.order_by('-created_at')[:3]
    
    activity = []
    
    for user in recent_users:
        full_name = user.get_full_name()
        activity.append({
            'type': 'user',
            'icon': 'person_add',
            'text': f"Nouvel utilisateur: {full_name or user.email}",
            'time': user.created_at.isoformat(),
            'time_display': f"Il y a {int((timezone.now() - user.created_at).total_seconds() // 60)} min"
        })
    
    for mission in recent_missions:
        activity.append({
            'type': 'mission',
            'icon': 'assignment',
            'text': f"Mission #{mission.id}: {mission.title[:30]}...",
            'time': mission.created_at.isoformat(),
            'time_display': f"Il y a {int((timezone.now() - mission.created_at).total_seconds() // 60)} min"
        })
    
    # Trier par date décroissante
    activity.sort(key=lambda x: x['time'], reverse=True)
    
    return Response(activity[:10])
