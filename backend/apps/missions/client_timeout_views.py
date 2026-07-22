"""Vues pour la gestion des échéances par le client."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.missions.models import Mission, MissionStatusHistory
from apps.payments.models import Payment


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_expired_mission_detail(request, mission_id):
    """Vue détaillée pour le client d'une mission expirée."""
    try:
        mission = Mission.objects.get(id=mission_id)
        
        # Vérifier que l'utilisateur est le client
        if mission.client != request.user:
            return Response({'error': 'Vous n\'êtes pas le client de cette mission'}, status=403)
        
        # Vérifier que la mission est expirée
        if mission.status != Mission.Status.EXPIRED:
            return Response({'error': 'Cette mission n\'est pas expirée'}, status=400)
        
        # Calculer le remboursement potentiel
        refund_amount = 0
        can_refund = False
        
        if mission.deposit_paid:
            # Le client a payé, il peut être remboursé
            refund_amount = mission.budget  # Remboursement complet du budget
            can_refund = True
        
        # Informations sur l'entreprise assignée
        enterprise_info = None
        if mission.assigned_enterprise:
            enterprise_info = {
                'name': mission.assigned_enterprise.company_name,
                'email': mission.assigned_enterprise.company_email,
                'phone': mission.assigned_enterprise.company_phone
            }
        
        return Response({
            'mission': {
                'id': str(mission.id),
                'title': mission.title,
                'description': mission.description,
                'budget': float(mission.budget),
                'currency': mission.currency,
                'status': mission.status,
                'status_display': mission.get_status_display(),
                'created_at': mission.created_at.isoformat(),
                'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
                'deposit_paid': mission.deposit_paid,
                'assigned_enterprise': enterprise_info,
                'executing_employee': f"{mission.executing_employee.first_name} {mission.executing_employee.last_name}" if mission.executing_employee else None
            },
            'refund_info': {
                'can_refund': can_refund,
                'refund_amount': float(refund_amount),
                'refund_currency': mission.currency,
                'refund_reason': 'Échéance de dépôt de caution dépassée'
            },
            'available_actions': get_client_available_actions(mission),
            'message': {
                'type': 'warning',
                'title': 'Mission expirée',
                'message': 'La mission a expirée car l\'entreprise n\'a pas déposé la caution à temps. Vous pouvez annuler la mission et obtenir un remboursement.',
                'next_steps': [
                    'Annuler la mission pour libérer les fonds',
                    'Contacter l\'entreprise pour renégocier si souhaité',
                    'Créer une nouvelle mission si nécessaire'
                ]
            }
        })
        
    except Mission.DoesNotExist:
        return Response({'error': 'Mission non trouvée'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_expired_mission(request, mission_id):
    """Permet au client d'annuler une mission expirée et d'obtenir un remboursement."""
    try:
        mission = Mission.objects.get(id=mission_id)
        
        # Vérifier que l'utilisateur est le client
        if mission.client != request.user:
            return Response({'error': 'Vous n\'êtes pas le client de cette mission'}, status=403)
        
        # Vérifier que la mission est expirée
        if mission.status != Mission.Status.EXPIRED:
            return Response({'error': 'Cette mission n\'est pas expirée'}, status=400)
        
        with transaction.atomic():
            # Marquer la mission comme annulée
            old_status = mission.status
            mission.status = Mission.Status.CANCELLED
            mission.cancelled_at = timezone.now()
            mission.cancellation_reason = 'Échéance de dépôt dépassée - Annulation par le client'
            mission.save(update_fields=['status', 'cancelled_at', 'cancellation_reason', 'updated_at'])
            
            # Créer l'historique
            MissionStatusHistory.objects.create(
                mission=mission,
                old_status=old_status,
                new_status=Mission.Status.CANCELLED,
                changed_by=request.user,
                reason='Échéance de dépôt dépassée - Annulation et remboursement par le client'
            )
            
            # Traiter le remboursement si le budget a été payé
            refund_processed = False
            refund_amount = 0
            
            if mission.deposit_paid:
                # Créer le remboursement
                refund_amount = mission.budget
                
                payment = Payment.objects.create(
                    user=request.user,
                    payment_type=Payment.PaymentType.REFUND,
                    amount=refund_amount,
                    currency=mission.currency,
                    status=Payment.Status.PENDING,
                    description=f'Remboursement mission "{mission.title}" - Échéance dépassée',
                    related_mission=mission
                )
                
                # Dans un système réel, ici on traiterait le remboursement via le service de paiement
                # Pour l'instant, on marque comme complété
                payment.status = Payment.Status.COMPLETED
                payment.processed_at = timezone.now()
                payment.save(update_fields=['status', 'processed_at'])
                
                refund_processed = True
            
            # Notifier les parties concernées
            from apps.notifications.services import create_notification
            
            # Notifier l'entreprise
            if mission.assigned_enterprise:
                create_notification(
                    mission.assigned_enterprise.user,
                    'mission_cancelled',
                    'Mission annulée',
                    f'La mission « {mission.title} » a été annulée par le client suite à l\'échéance de dépôt.',
                    mission=mission,
                    action_url=f'/enterprise/missions/{mission.id}'
                )
            
            # Notifier l'employé
            if mission.executing_employee and mission.executing_employee.user:
                create_notification(
                    mission.executing_employee.user,
                    'mission_cancelled',
                    'Mission annulée',
                    f'La mission « {mission.title} » a été annulée. Vous êtes maintenant disponible pour d\'autres missions.',
                    mission=mission,
                    action_url='/provider/missions/'
                )
            
            return Response({
                'success': True,
                'message': 'Mission annulée avec succès',
                'mission_status': mission.status,
                'refund': {
                    'processed': refund_processed,
                    'amount': float(refund_amount),
                    'currency': mission.currency,
                    'payment_id': str(payment.id) if refund_processed else None
                },
                'next_steps': {
                    'client': 'Fonds remboursés sur votre compte',
                    'enterprise': 'Doit chercher d\'autres missions',
                    'employee': 'Disponible pour de nouvelles assignations'
                }
            })
            
    except Mission.DoesNotExist:
        return Response({'error': 'Mission non trouvée'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renegotiate_mission(request, mission_id):
    """Permet au client d'initier une renégociation avec l'entreprise."""
    try:
        mission = Mission.objects.get(id=mission_id)
        
        # Vérifier que l'utilisateur est le client
        if mission.client != request.user:
            return Response({'error': 'Vous n\'êtes pas le client de cette mission'}, status=403)
        
        # Vérifier que la mission est expirée
        if mission.status != Mission.Status.EXPIRED:
            return Response({'error': 'Cette mission n\'est pas expirée'}, status=400)
        
        new_deadline = request.data.get('new_deadline')
        message = request.data.get('message', '')
        
        if not new_deadline:
            return Response({'error': 'Nouvelle échéance requise'}, status=400)
        
        # Réactiver la mission avec nouveau délai
        with transaction.atomic():
            old_status = mission.status
            mission.status = Mission.Status.ACCEPTED
            mission.deposit_deadline = new_deadline
            mission.save(update_fields=['status', 'deposit_deadline', 'updated_at'])
            
            # Créer l'historique
            MissionStatusHistory.objects.create(
                mission=mission,
                old_status=old_status,
                new_status=Mission.Status.ACCEPTED,
                changed_by=request.user,
                reason=f'Renégociation - Nouvelle échéance: {new_deadline}. Message: {message}'
            )
            
            # Notifier l'entreprise
            if mission.assigned_enterprise:
                from apps.notifications.services import create_notification
                create_notification(
                    mission.assigned_enterprise.user,
                    'mission_renegotiated',
                    'Mission renégociée',
                    f'Le client propose une nouvelle échéance pour « {mission.title} »: {new_deadline}',
                    mission=mission,
                    action_url=f'/enterprise/missions/{mission.id}'
                )
            
            return Response({
                'success': True,
                'message': 'Renégociation initiée avec succès',
                'mission_status': mission.status,
                'new_deadline': new_deadline,
                'next_steps': {
                    'enterprise': 'Doit déposer la caution avant la nouvelle échéance',
                    'employee': 'En attente du dépôt pour pouvoir démarrer',
                    'client': 'En attente de la réponse de l\'entreprise'
                }
            })
            
    except Mission.DoesNotExist:
        return Response({'error': 'Mission non trouvée'}, status=404)


def get_client_available_actions(mission):
    """Retourne les actions disponibles pour le client."""
    actions = []
    
    if mission.status == Mission.Status.EXPIRED:
        actions.append({
            'action': 'cancel_and_refund',
            'label': 'Annuler et rembourser',
            'url': f'/api/missions/{mission.id}/cancel-expired/',
            'description': 'Annuler la mission et obtenir un remboursement complet',
            'type': 'primary'
        })
        
        actions.append({
            'action': 'renegotiate',
            'label': 'Renégocier',
            'url': f'/api/missions/{mission.id}/renegotiate/',
            'description': 'Proposer une nouvelle échéance à l\'entreprise',
            'type': 'secondary'
        })
    
    return actions
