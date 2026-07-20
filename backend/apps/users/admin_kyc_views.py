"""Vues admin pour override des décisions KYC IA et configuration."""
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_ai_kyc(request):
    """Permet à un admin d'activer/désactiver l'analyse IA KYC."""
    if not request.user.has_role('admin'):
        return Response(
            {'error': 'Accès réservé aux administrateurs'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    enabled = request.data.get('enabled', False)
    
    # Note: Ceci ne modifie que la variable d'environnement pour la session actuelle
    # Pour un changement permanent, il faut modifier la variable d'environnement sur Render
    # Cette vue est principalement pour le développement/testing
    if not hasattr(settings, '_AI_KYC_ENABLED_OVERRIDE'):
        settings._AI_KYC_ENABLED_OVERRIDE = enabled
    
    return Response({
        'message': f'Analyse IA KYC {"activée" if enabled else "désactivée"}',
        'ai_kyc_enabled': enabled,
        'note': 'Pour un changement permanent, modifiez la variable d\'environnement AI_KYC_ENABLED sur Render'
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_ai_kyc_status(request):
    """Récupère le statut actuel de l'analyse IA KYC."""
    if not request.user.has_role('admin'):
        return Response(
            {'error': 'Accès réservé aux administrateurs'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Vérifier d'abord l'override de session
    if hasattr(settings, '_AI_KYC_ENABLED_OVERRIDE'):
        enabled = settings._AI_KYC_ENABLED_OVERRIDE
    else:
        enabled = getattr(settings, 'AI_KYC_ENABLED', False)
    
    return Response({
        'ai_kyc_enabled': enabled,
        'openai_api_configured': bool(getattr(settings, 'OPENAI_API_KEY', '')),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def override_kyc_decision(request, user_id):
    """Permet à un admin de contester/modifier la décision IA KYC."""
    if not request.user.has_role('admin'):
        return Response(
            {'error': 'Accès réservé aux administrateurs'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Utilisateur non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    new_status = request.data.get('status')
    reason = request.data.get('reason', '')
    
    if new_status not in ['verified', 'rejected', 'pending']:
        return Response(
            {'error': 'Statut invalide. Valeurs possibles: verified, rejected, pending'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Enregistrer l'override
    target_user.kyc_admin_override = True
    target_user.kyc_admin_override_by = request.user
    target_user.kyc_admin_override_at = timezone.now()
    target_user.kyc_admin_override_reason = reason
    
    # Appliquer le nouveau statut
    if new_status == 'verified':
        target_user.kyc_status = User.KYCStatus.VERIFIED
        target_user.kyc_verified_at = timezone.now()
        target_user.kyc_rejection_reason = ''
    elif new_status == 'rejected':
        target_user.kyc_status = User.KYCStatus.REJECTED
        target_user.kyc_rejection_reason = reason or 'Rejeté par administrateur'
    elif new_status == 'pending':
        target_user.kyc_status = User.KYCStatus.PENDING
        target_user.kyc_rejection_reason = ''
    
    target_user.save(update_fields=[
        'kyc_status', 'kyc_verified_at', 'kyc_rejection_reason',
        'kyc_admin_override', 'kyc_admin_override_by', 
        'kyc_admin_override_at', 'kyc_admin_override_reason'
    ])
    
    return Response({
        'message': 'Statut KYC modifié avec succès',
        'kyc_status': target_user.kyc_status,
        'ai_decision': target_user.kyc_ai_decision,
        'ai_confidence': target_user.kyc_ai_confidence,
        'overridden_by': request.user.email,
        'override_reason': reason,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_kyc_ai_analysis(request, user_id):
    """Récupère l'analyse IA KYC d'un utilisateur (admin only)."""
    if not request.user.has_role('admin'):
        return Response(
            {'error': 'Accès réservé aux administrateurs'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Utilisateur non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        'user_id': str(target_user.id),
        'email': target_user.email,
        'kyc_status': target_user.kyc_status,
        'ai_decision': target_user.kyc_ai_decision,
        'ai_confidence': target_user.kyc_ai_confidence,
        'ai_analysis': target_user.kyc_ai_analysis,
        'ai_analyzed_at': target_user.kyc_ai_analyzed_at,
        'admin_override': target_user.kyc_admin_override,
        'admin_override_by': target_user.kyc_admin_override_by.email if target_user.kyc_admin_override_by else None,
        'admin_override_at': target_user.kyc_admin_override_at,
        'admin_override_reason': target_user.kyc_admin_override_reason,
    })
