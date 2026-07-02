"""Authentification JWT et Google OAuth."""
import logging

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .email_verification import email_verification_required
from .google_auth import authenticate_or_register_google_user, verify_google_id_token
from .serializers import UserSerializer

logger = logging.getLogger(__name__)


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
        data = super().validate(attrs)
        user = self.user
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
            if isinstance(detail, dict) and detail.get('code') == 'email_not_verified':
                return Response(detail, status=status.HTTP_403_FORBIDDEN)
            raise
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
