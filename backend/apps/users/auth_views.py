"""Authentification JWT et Google OAuth."""
import logging

from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .email_verification import email_verification_required
from .google_auth import authenticate_or_register_google_user, verify_google_id_token
from .models import LoginHistory
from .serializers import UserSerializer

logger = logging.getLogger(__name__)


def _client_ip(request) -> str:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    return forwarded or request.META.get('REMOTE_ADDR') or '0.0.0.0'


def record_successful_login(user, request=None) -> None:
    """Met à jour last_login + historique (JWT / Google n'appellent pas django.contrib.auth.login)."""
    now = timezone.now()
    user.last_login = now
    update_fields = ['last_login']
    ip = None
    ua = ''
    if request is not None:
        ip = _client_ip(request)
        ua = (request.META.get('HTTP_USER_AGENT') or '')[:500]
        if hasattr(user, 'last_login_ip'):
            user.last_login_ip = ip
            update_fields.append('last_login_ip')
    user.save(update_fields=update_fields)
    try:
        LoginHistory.objects.create(
            user=user,
            ip_address=ip or '0.0.0.0',
            user_agent=ua,
            device_type='',
            is_successful=True,
        )
    except Exception as exc:
        logger.warning('LoginHistory create failed: %s', exc)


class GoogleAuthView(APIView):
    """Connexion / inscription via Google (id_token)."""
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = (request.data.get('id_token') or '').strip()
        user_type = (request.data.get('user_type') or 'client').strip()

        if not id_token:
            return Response({'error': 'id_token requis'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = verify_google_id_token(id_token)
            user, created = authenticate_or_register_google_user(payload, user_type=user_type)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.warning('Google auth failed: %s', exc)
            return Response({'error': 'Authentification Google impossible.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not user.is_active:
            return Response({'error': 'Compte désactivé.'}, status=status.HTTP_403_FORBIDDEN)

        record_successful_login(user, request)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class BlockTaskTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        otp = (attrs.pop('otp', None) or self.initial_data.get('otp') or '').strip()
        data = super().validate(attrs)
        user = self.user

        if user.two_factor_enabled and user.two_factor_secret:
            if not otp:
                raise serializers.ValidationError({
                    'code': '2fa_required',
                    'detail': 'Code d\'authentification à deux facteurs requis.',
                })
            from .two_factor import verify_totp
            if not verify_totp(user.two_factor_secret, otp):
                raise serializers.ValidationError({
                    'code': 'invalid_2fa',
                    'detail': 'Code 2FA invalide.',
                })

        if email_verification_required(user):
            raise serializers.ValidationError({
                'code': 'email_not_verified',
                'detail': 'Vérifiez votre adresse email avant de vous connecter.',
                'email': user.email,
            })
        data['email_verified'] = user.email_verified
        return data


class BlockTaskTokenObtainPairView(TokenObtainPairView):
    serializer_class = BlockTaskTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and detail.get('code') in ('email_not_verified', '2fa_required', 'invalid_2fa'):
                status_code = status.HTTP_403_FORBIDDEN if detail.get('code') == 'email_not_verified' else status.HTTP_401_UNAUTHORIZED
                return Response(detail, status=status_code)
            raise
        record_successful_login(serializer.user, request)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
