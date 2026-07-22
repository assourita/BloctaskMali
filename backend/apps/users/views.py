"""
BlockTask Users Views
"""

from rest_framework import generics, status, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .enterprise_helpers import enterprise_profile_defaults
from .models import ProviderProfile, EnterpriseProfile, Employee, WalletTransaction
from apps.missions.models import Mission, MissionReview
from apps.disputes.models import Dispute
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileSerializer,
    ProviderProfileSerializer, EnterpriseProfileSerializer, EmployeeSerializer,
    WalletTransactionSerializer, KYCSerializer, WalletConnectSerializer,
    ChangePasswordSerializer, UserListSerializer, AdminUserSerializer,
    AdminKycListSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PhoneVerificationRequestSerializer, PhoneVerificationConfirmSerializer,
    EmailVerificationConfirmSerializer, EmailResendSerializer,
)
from .kyc_verification import request_phone_verification, confirm_phone_verification
from .password_reset import get_user_from_uid, send_password_reset_email
from .email_verification import send_verification_email, verify_email, email_verification_required
from django.contrib.auth.tokens import default_token_generator
from .roles import get_effective_role, can_act_as_provider

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Inscription utilisateur"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        from apps.common.models import PlatformSettings
        platform = PlatformSettings.get_solo()
        if platform.maintenance_mode:
            return Response(
                {'error': 'La plateforme est en maintenance. Réessayez plus tard.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not platform.registration_open:
            return Response(
                {'error': 'Les inscriptions sont temporairement fermées.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Créer le profil spécifique selon le type (si pas déjà créé par le signal)
        if user.user_type == User.UserType.PROVIDER:
            ProviderProfile.objects.get_or_create(user=user, defaults={})
        elif user.user_type == User.UserType.ENTERPRISE:
            EnterpriseProfile.objects.get_or_create(
                user=user,
                defaults=enterprise_profile_defaults(user),
            )

        try:
            send_verification_email(user)
            email_sent = True
        except Exception:
            email_sent = False
        
        return Response({
            'message': (
                'Compte créé. Consultez votre boîte email pour activer votre compte.'
                if email_sent else
                'Compte créé. L\'envoi de l\'email de vérification a échoué — utilisez « Renvoyer l\'email ».'
            ),
            'email_verification_required': email_verification_required(user),
            'email_sent': email_sent,
            'email': user.email,
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class EmailVerifyView(APIView):
    """Confirme l'adresse email via uid + token."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ok, message, user = verify_email(
            serializer.validated_data['uid'],
            serializer.validated_data['token'],
        )
        if not ok:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'message': message,
            'email_verified': True,
            'user': UserSerializer(user).data if user else None,
        })


class EmailResendVerificationView(APIView):
    """Renvoie l'email de vérification."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user and not user.email_verified:
            try:
                send_verification_email(user)
            except Exception:
                return Response(
                    {'error': 'Impossible d\'envoyer l\'email. Réessayez plus tard.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        return Response({
            'message': (
                'Si un compte non vérifié existe avec cette adresse, '
                'un email de confirmation a été envoyé.'
            ),
        })


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Profil utilisateur connecté"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'un utilisateur (admin)"""
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'options']


class UserListPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class UserListView(generics.ListAPIView):
    """Liste des utilisateurs (admin)"""
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UserListPagination

    def get_serializer_class(self):
        if (
            self.request.user.is_staff
            and self.request.query_params.get('kyc_status')
        ):
            return AdminKycListSerializer
        return UserListSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        # Filtres
        user_type = self.request.query_params.get('user_type')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        kyc_status = self.request.query_params.get('kyc_status')
        if kyc_status:
            queryset = queryset.filter(kyc_status=kyc_status)
            queryset = queryset.order_by('-kyc_submitted_at', '-created_at')
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone_number__icontains=search)
            )
        
        if not kyc_status:
            queryset = queryset.order_by('-created_at')
        
        return queryset.select_related('provider_profile', 'enterprise_profile')


class ProviderProfileView(generics.RetrieveUpdateAPIView):
    """Profil prestataire"""
    serializer_class = ProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        user = self.request.user
        if not can_act_as_provider(user):
            raise PermissionDenied("Vous n'êtes pas un prestataire.")
        
        profile, created = ProviderProfile.objects.get_or_create(user=user)
        return profile


class EnterpriseProfileView(generics.RetrieveUpdateAPIView):
    """Profil entreprise"""
    serializer_class = EnterpriseProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        user = self.request.user
        if user.user_type != User.UserType.ENTERPRISE:
            raise PermissionDenied("Vous n'êtes pas une entreprise.")
        
        profile, created = EnterpriseProfile.objects.get_or_create(
            user=user,
            defaults=enterprise_profile_defaults(user),
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
        data = serializer.validated_data
        from .enterprise_services import create_employee_account
        try:
            employee, temp_password = create_employee_account(
                enterprise=enterprise,
                first_name=data['first_name'],
                last_name=data['last_name'],
                email=data.get('email') or '',
                phone=data.get('phone') or '',
                position=data.get('position') or '',
                role=data.get('role') or 'agent',
            )
        except ValueError as e:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': str(e)})
        serializer.instance = employee
        self._temp_password = temp_password

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if hasattr(self, '_temp_password'):
            data = response.data if isinstance(response.data, dict) else {}
            data['temporary_password'] = self._temp_password
            data['message'] = (
                'Compte employé créé. Communiquez le mot de passe temporaire '
                'à l\'agent pour sa première connexion.'
            )
            response.data = data
        return response


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

    def perform_update(self, serializer):
        from .enterprise_services import update_employee_record
        employee = update_employee_record(serializer.instance, **serializer.validated_data)
        serializer.instance = employee

    def perform_destroy(self, instance):
        from .enterprise_services import deactivate_employee
        deactivate_employee(instance)


class WalletTransactionListView(generics.ListAPIView):
    """Historique des transactions wallet"""
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return WalletTransaction.objects.filter(user=self.request.user)


class KYCSubmissionView(generics.UpdateAPIView):
    """Soumission KYC avec analyse IA automatique"""
    serializer_class = KYCSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        from django.conf import settings
        
        user = serializer.save(
            kyc_status=User.KYCStatus.PENDING,
            kyc_submitted_at=timezone.now(),
            kyc_rejection_reason='',
            kyc_ai_decision=None,
            kyc_ai_confidence=None,
            kyc_ai_analysis=None,
            kyc_ai_analyzed_at=None,
            kyc_admin_override=False,
            kyc_admin_override_by=None,
            kyc_admin_override_at=None,
            kyc_admin_override_reason='',
        )
        
        # Déclencher l'analyse IA en arrière-plan seulement si activé
        if not getattr(settings, 'AI_KYC_ENABLED', False):
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"AI KYC analysis disabled for user {user.id}, skipping automatic analysis")
            return
        
        from .ai_kyc_service import analyze_kyc_submission
        from django.core.files.storage import default_storage
        
        try:
            if user.id_card_front and user.id_card_back and user.selfie_verification:
                id_card_front_url = default_storage.url(user.id_card_front.name)
                id_card_back_url = default_storage.url(user.id_card_back.name)
                selfie_url = default_storage.url(user.selfie_verification.name)
                
                user_data = {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'nina': user.nina or '',
                }
                
                analysis = analyze_kyc_submission(
                    id_card_front_url,
                    id_card_back_url,
                    selfie_url,
                    user_data
                )
                
                # Mettre à jour l'utilisateur avec les résultats IA
                user.kyc_ai_decision = analysis.get('final_decision')
                user.kyc_ai_confidence = analysis.get('final_confidence')
                user.kyc_ai_analysis = analysis
                user.kyc_ai_analyzed_at = timezone.now()
                
                # Appliquer la décision IA si confiance élevée
                if analysis.get('final_decision') == 'approved' and analysis.get('final_confidence', 0) >= 0.8:
                    user.kyc_status = User.KYCStatus.VERIFIED
                    user.kyc_verified_at = timezone.now()
                elif analysis.get('final_decision') == 'rejected' and analysis.get('final_confidence', 0) >= 0.7:
                    user.kyc_status = User.KYCStatus.REJECTED
                    reasons = []
                    for doc_result in analysis.values():
                        if isinstance(doc_result, dict) and 'reasons' in doc_result:
                            reasons.extend(doc_result['reasons'])
                    user.kyc_rejection_reason = '; '.join(reasons) if reasons else 'Rejeté par analyse IA'
                
                user.save(update_fields=[
                    'kyc_ai_decision', 'kyc_ai_confidence', 'kyc_ai_analysis',
                    'kyc_ai_analyzed_at', 'kyc_status', 'kyc_verified_at',
                    'kyc_rejection_reason'
                ])
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"AI KYC analysis failed for user {user.id}: {e}")
            # En cas d'erreur, laisser en PENDING pour revue manuelle


class PhoneVerificationRequestView(APIView):
    """Demande de vérification téléphone liée au NINA (simulation SMS)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PhoneVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = request_phone_verification(
            request.user,
            serializer.validated_data['nina'],
            serializer.validated_data['phone_number'],
        )
        if not result.get('ok'):
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class PhoneVerificationConfirmView(APIView):
    """Confirmation du code OTP (simulation)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PhoneVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = confirm_phone_verification(request.user, serializer.validated_data['otp'])
        if not result.get('ok'):
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


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


class PasswordResetRequestView(APIView):
    """Demande de réinitialisation du mot de passe (email)."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            try:
                send_password_reset_email(user)
            except Exception:
                return Response(
                    {'error': 'Impossible d\'envoyer l\'email. Réessayez plus tard.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        return Response({
            'message': (
                'Si un compte existe avec cette adresse email, '
                'un lien de réinitialisation a été envoyé.'
            ),
        })


class PasswordResetValidateView(APIView):
    """Vérifie la validité d'un lien de réinitialisation."""
    permission_classes = [AllowAny]

    def get(self, request):
        uid = request.query_params.get('uid', '')
        token = request.query_params.get('token', '')
        user = get_user_from_uid(uid)
        if not user or not default_token_generator.check_token(user, token):
            return Response({'valid': False, 'error': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'valid': True, 'email': user.email})


class PasswordResetConfirmView(APIView):
    """Confirme la réinitialisation avec uid + token."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_user_from_uid(serializer.validated_data['uid'])
        token = serializer.validated_data['token']
        if not user or not default_token_generator.check_token(user, token):
            return Response({'error': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'message': 'Mot de passe réinitialisé avec succès.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_stats(request):
    """Statistiques utilisateur pour le dashboard"""
    user = request.user
    role = get_effective_role(user)

    stats = {
        'user_type': user.user_type,
        'active_role': role,
        'total_missions': 0,
        'active_missions': 0,
        'completed_missions': 0,
        'total_spent': 0,
        'total_earned': 0,
        'wallet_balance': 0,
        'reputation_score': 50.0,
    }

    if role == User.UserType.CLIENT:
        missions = user.client_missions.all()
        stats['total_missions'] = missions.count()
        stats['active_missions'] = missions.filter(
            status__in=['funded', 'accepted', 'in_progress', 'submitted']
        ).count()
        stats['completed_missions'] = missions.filter(status='completed').count()

    elif role == User.UserType.PROVIDER:
        from django.db.models import Sum, F, Value, DecimalField, Q
        from django.db.models.functions import Coalesce
        from apps.missions.models import Mission

        provider_missions = Mission.objects.filter(provider=user)
        completed = provider_missions.filter(status=Mission.Status.COMPLETED)
        earnings_expr = Coalesce(
            F('final_price'),
            F('budget'),
            Value(0),
            output_field=DecimalField(max_digits=15, decimal_places=2),
        )
        total_earned = completed.aggregate(t=Sum(earnings_expr))['t'] or 0

        if hasattr(user, 'provider_profile'):
            profile = user.provider_profile
            # Garde le profil synchronisé avec les missions réelles
            profile.total_earnings = total_earned
            profile.total_missions_completed = completed.count()
            profile.save(update_fields=['total_earnings', 'total_missions_completed'])
            stats['reputation_score'] = profile.reputation_score
            stats['level'] = profile.level
            stats['deposit_balance'] = float(profile.deposit_balance)
            stats['deposit_locked'] = float(profile.deposit_locked)

        stats['total_missions'] = provider_missions.count()
        stats['active_missions'] = provider_missions.filter(
            status__in=['accepted', 'in_progress', 'submitted']
        ).count()
        stats['completed_missions'] = completed.count()
        stats['total_earned'] = float(total_earned)
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_availability(request):
    """Changer la disponibilité du prestataire"""
    user = request.user

    if not can_act_as_provider(user):
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
        'verified_kyc': User.objects.filter(kyc_status='verified').count(),
        'rejected_kyc': User.objects.filter(kyc_status='rejected').count(),
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
        'effective_role': get_effective_role(user),
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


@api_view(['GET'])
@permission_classes([AllowAny])
def provider_public_profile(request, id):
    """Profil public d'un prestataire (page vitrine, sans données sensibles)."""
    user = get_object_or_404(
        User.objects.select_related('provider_profile'),
        id=id,
        provider_profile__isnull=False,
        is_active=True,
    )
    profile = user.provider_profile
    review_stats = MissionReview.objects.filter(
        mission__provider=user,
        client_rating__isnull=False,
    ).aggregate(
        count=Count('id'),
        avg=Avg('client_rating'),
    )

    return Response({
        'id': str(user.id),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'city': user.city,
        'country': user.country,
        'bio': user.bio,
        'profile_picture': (
            request.build_absolute_uri(user.profile_picture.url)
            if user.profile_picture else None
        ),
        'skills': profile.skills or [],
        'categories': profile.categories or [],
        'level': profile.level,
        'reputation_score': profile.reputation_score,
        'completed_missions': profile.total_missions_completed,
        'review_count': review_stats['count'] or 0,
        'avg_rating': round(float(review_stats['avg']), 1) if review_stats['avg'] else None,
        'identity_verified': user.kyc_status == User.KYCStatus.VERIFIED,
        'is_available': profile.is_available,
        'member_since': user.date_joined.isoformat(),
        'vehicle_type': profile.vehicle_type or '',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def client_public_profile(request, id):
    """Profil public d'un donneur d'ordre (client ou entreprise) — visible avant candidature."""
    user = get_object_or_404(
        User.objects.select_related('enterprise_profile'),
        id=id,
        user_type__in=[User.UserType.CLIENT, User.UserType.ENTERPRISE],
        is_active=True,
    )
    from apps.missions.models import Mission

    missions_posted = Mission.objects.filter(client=user).exclude(
        status=Mission.Status.DRAFT,
    ).count()
    missions_completed = Mission.objects.filter(client=user, status=Mission.Status.COMPLETED).count()

    enterprise_name = None
    if user.user_type == User.UserType.ENTERPRISE:
        ep = getattr(user, 'enterprise_profile', None)
        if ep:
            enterprise_name = ep.company_name

    return Response({
        'id': str(user.id),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'user_type': user.user_type,
        'enterprise_name': enterprise_name,
        'city': user.city,
        'country': user.country,
        'bio': user.bio,
        'profile_picture': (
            request.build_absolute_uri(user.profile_picture.url)
            if user.profile_picture else None
        ),
        'identity_verified': user.kyc_status == User.KYCStatus.VERIFIED,
        'member_since': user.date_joined.isoformat(),
        'missions_posted': missions_posted,
        'missions_completed': missions_completed,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def enterprise_public_profile(request, id):
    """Profil public d'une entreprise (page vitrine landing)."""
    profile = get_object_or_404(
        EnterpriseProfile.objects.select_related('user'),
        user_id=id,
        user__is_active=True,
    )
    user = profile.user
    defaults = enterprise_profile_defaults(user)
    company_name = (profile.company_name or defaults['company_name'] or user.get_full_name() or user.username).strip()
    city = (profile.city or defaults['city'] or user.city or '').strip()
    employee_count = Employee.objects.filter(enterprise=profile, is_active=True).count()
    missions_count = profile.total_missions_posted or Mission.objects.filter(
        client=user,
    ).exclude(status=Mission.Status.DRAFT).count()

    return Response({
        'id': str(user.id),
        'company_name': company_name,
        'city': city,
        'country': user.country or 'Mali',
        'address': profile.address or '',
        'website': profile.website or '',
        'description': user.bio or '',
        'logo': (
            request.build_absolute_uri(user.profile_picture.url)
            if user.profile_picture else None
        ),
        'total_employees': employee_count or profile.total_employees or 0,
        'total_missions_posted': missions_count,
        'reputation_score': profile.reputation_score,
        'is_verified': profile.is_verified,
        'member_since': profile.created_at.isoformat(),
        'company_email': profile.company_email or '',
        'company_phone': profile.company_phone or user.phone_number or '',
    })


def _admin_only(user):
    return user.is_staff or getattr(user, 'user_type', '') == 'admin'


class TwoFactorSetupView(APIView):
    """Génère un secret TOTP et QR code (étape 1)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .two_factor import generate_secret, provisioning_uri, qr_code_data_url
        user = request.user
        secret = generate_secret()
        user.two_factor_secret = secret
        user.two_factor_enabled = False
        user.save(update_fields=['two_factor_secret', 'two_factor_enabled'])
        uri = provisioning_uri(user, secret)
        return Response({
            'secret': secret,
            'provisioning_uri': uri,
            'qr_code': qr_code_data_url(uri),
        })


class TwoFactorConfirmView(APIView):
    """Active la 2FA après vérification du code (étape 2)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .two_factor import verify_totp
        code = (request.data.get('code') or '').strip()
        user = request.user
        if not user.two_factor_secret:
            return Response({'error': 'Lancez d\'abord la configuration 2FA.'}, status=400)
        if not verify_totp(user.two_factor_secret, code):
            return Response({'error': 'Code invalide.'}, status=400)
        user.two_factor_enabled = True
        user.save(update_fields=['two_factor_enabled'])
        return Response({'enabled': True, 'message': 'Authentification à deux facteurs activée.'})


class TwoFactorDisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .two_factor import verify_totp
        user = request.user
        code = (request.data.get('code') or '').strip()
        if user.two_factor_enabled:
            if not verify_totp(user.two_factor_secret or '', code):
                return Response({'error': 'Code 2FA requis pour désactiver.'}, status=400)
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret'])
        return Response({'enabled': False})


class TwoFactorStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'enabled': bool(request.user.two_factor_enabled)})


class AdminResetPasswordView(APIView):
    """Réinitialise le mot de passe d'un utilisateur (admin)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        if not _admin_only(request.user):
            return Response({'error': 'Accès réservé aux administrateurs.'}, status=403)
        user = get_object_or_404(User, id=id)
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        user.set_password(temp_password)
        user.save(update_fields=['password'])
        return Response({
            'message': f'Mot de passe réinitialisé pour {user.email}.',
            'temporary_password': temp_password,
            'user_id': str(user.id),
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_enterprises_list(request):
    """Liste des entreprises pour l'admin Angular."""
    if not _admin_only(request.user):
        return Response({'error': 'Accès réservé aux administrateurs.'}, status=403)

    qs = EnterpriseProfile.objects.select_related('user').order_by('-created_at')
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(
            Q(company_name__icontains=search)
            | Q(city__icontains=search)
            | Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
        )
    verified = request.query_params.get('verified')
    if verified in ('true', '1'):
        qs = qs.filter(is_verified=True)
    elif verified in ('false', '0'):
        qs = qs.filter(is_verified=False)

    results = []
    for profile in qs[:200]:
        user = profile.user
        defaults = enterprise_profile_defaults(user)
        employees = Employee.objects.filter(enterprise=profile, is_active=True).count()
        results.append({
            'id': str(profile.id),
            'user_id': str(user.id),
            'company_name': (profile.company_name or defaults.get('company_name') or user.get_full_name() or '').strip(),
            'email': user.email,
            'phone': profile.company_phone or user.phone_number or '',
            'city': (profile.city or defaults.get('city') or user.city or '').strip(),
            'is_verified': bool(profile.is_verified),
            'is_active': bool(user.is_active),
            'total_employees': employees,
            'total_missions_posted': profile.total_missions_posted or 0,
            'created_at': profile.created_at.isoformat() if profile.created_at else None,
        })
    return Response({'results': results, 'count': len(results)})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_enterprise_verify(request, id):
    """Vérifie / retire la vérification d'une entreprise."""
    if not _admin_only(request.user):
        return Response({'error': 'Accès réservé aux administrateurs.'}, status=403)

    profile = get_object_or_404(EnterpriseProfile, id=id)
    verify = request.data.get('is_verified')
    if verify is None:
        verify = True
    profile.is_verified = bool(verify)
    profile.save(update_fields=['is_verified', 'updated_at'])
    return Response({
        'id': str(profile.id),
        'is_verified': profile.is_verified,
        'message': 'Entreprise vérifiée' if profile.is_verified else 'Vérification retirée',
    })
