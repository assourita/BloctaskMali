"""Vues spécifiques pour les employés avec gestion des échéances."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from apps.missions.models import Mission, MissionStatusHistory
from apps.users.models import Employee


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_mission_detail(request, mission_id):
    """Vue détaillée de la mission pour l'employé avec actions d'échéance."""
    try:
        # Vérifier que l'utilisateur est un employé
        try:
            employee = request.user.employee_profile
        except Employee.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé ou n\'est pas un employé'}, status=404)
        
        # Récupérer la mission
        mission = Mission.objects.get(id=mission_id)
        
        # Vérifier que l'employé est assigné à cette mission
        if mission.executing_employee != employee:
            return Response({'error': 'Vous n\'êtes pas assigné à cette mission'}, status=403)
        
        # Calculer le temps restant avant échéance
        now = timezone.now()
        deadline = mission.deposit_deadline
        time_remaining = None
        is_overdue = False
        
        if deadline:
            if deadline > now:
                time_remaining = deadline - now
            else:
                is_overdue = True
        
        # Déterminer les actions disponibles
        can_start = False
        can_claim_timeout = False
        requires_deposit = not mission.deposit_paid
        
        if mission.deposit_paid and mission.status == Mission.Status.ACCEPTED:
            can_start = True
        
        if is_overdue and not mission.deposit_paid:
            can_claim_timeout = True
        
        # Statut actuel de la mission
        current_status = {
            'status': mission.status,
            'status_display': mission.get_status_display(),
            'deposit_paid': mission.deposit_paid,
            'assigned_enterprise': mission.assigned_enterprise.company_name if mission.assigned_enterprise else None,
            'executing_employee': f"{mission.executing_employee.first_name} {mission.executing_employee.last_name}" if mission.executing_employee else None
        }
        
        # Historique récent (limité aux 5 derniers)
        recent_history = MissionStatusHistory.objects.filter(
            mission=mission
        ).order_by('-created_at')[:5]
        
        history_items = []
        for history in recent_history:
            history_items.append({
                'old_status': history.old_status,
                'new_status': history.new_status,
                'new_status_display': mission.get_status_display() if history.new_status == mission.status else history.new_status,
                'changed_by': history.changed_by.get_full_name() if history.changed_by else None,
                'reason': history.reason,
                'created_at': history.created_at.isoformat()
            })
        
        # Actions disponibles
        available_actions = []
        if can_start:
            available_actions.append({
                'action': 'start',
                'label': 'Démarrer la mission',
                'url': f'/api/missions/{mission.id}/start/',
                'description': 'Commencer l\'exécution de la mission'
            })
        
        if can_claim_timeout:
            available_actions.append({
                'action': 'claim_timeout',
                'label': 'Signaler l\'échéance',
                'url': f'/api/missions/{mission.id}/claim-timeout/',
                'description': 'Le délai de dépôt est dépassé, vous pouvez signaler cette échéance'
            })
        
        if requires_deposit:
            available_actions.append({
                'action': 'waiting_deposit',
                'label': 'En attente de dépôt',
                'description': 'L\'entreprise doit déposer la caution avant que vous puissiez démarrer',
                'disabled': True
            })
        
        return Response({
            'mission': {
                'id': str(mission.id),
                'title': mission.title,
                'description': mission.description,
                'budget': float(mission.budget),
                'currency': mission.currency,
                'status': current_status,
                'deadline': {
                    'deadline': deadline.isoformat() if deadline else None,
                    'time_remaining': str(time_remaining) if time_remaining else None,
                    'is_overdue': is_overdue,
                    'hours_remaining': time_remaining.total_seconds() / 3600 if time_remaining else None
                },
                'deposit': {
                    'required': float(mission.required_deposit or 0),
                    'paid': mission.deposit_paid,
                    'deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None
                }
            },
            'employee_info': {
                'name': f"{employee.first_name} {employee.last_name}",
                'position': employee.position,
                'can_start': can_start,
                'can_claim_timeout': can_claim_timeout
            },
            'history': history_items,
            'available_actions': available_actions,
            'message': get_employee_status_message(mission, employee, is_overdue, can_start, can_claim_timeout)
        })
        
    except Mission.DoesNotExist:
        return Response({'error': 'Mission non trouvée'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_mission_timeout(request, mission_id):
    """Permet à l'employé de signaler une échéance de dépôt."""
    try:
        # Vérifier que l'utilisateur est un employé
        try:
            employee = request.user.employee_profile
        except Employee.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé ou n\'est pas un employé'}, status=404)
        
        # Récupérer la mission
        mission = Mission.objects.get(id=mission_id)
        
        # Vérifier que l'employé est assigné à cette mission
        if mission.executing_employee != employee:
            return Response({'error': 'Vous n\'êtes pas assigné à cette mission'}, status=403)
        
        # Vérifier que le délai est bien dépassé
        if mission.deposit_paid:
            return Response({'error': 'Le dépôt a déjà été effectué'}, status=400)
        
        if not mission.deposit_deadline:
            return Response({'error': 'Aucune échéance définie pour cette mission'}, status=400)
        
        if mission.deposit_deadline > timezone.now():
            return Response({'error': 'Le délai n\'est pas encore dépassé'}, status=400)
        
        # Marquer la mission comme expirée
        mission.status = Mission.Status.EXPIRED
        mission.save(update_fields=['status', 'updated_at'])
        
        # Créer l'historique
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=Mission.Status.ACCEPTED,
            new_status=Mission.Status.EXPIRED,
            changed_by=request.user,
            reason=f'Échéance de dépôt dépassée - Signalé par l\'employé {employee.get_full_name()}'
        )
        
        # Notifier le client et l'entreprise
        from apps.notifications.services import create_notification
        
        # Notifier le client
        create_notification(
            mission.client,
            'mission_expired',
            'Mission expirée',
            f'La mission « {mission.title} » a expirée suite au non-paiement de la caution. Vous pouvez annuler et obtenir un remboursement.',
            mission=mission,
            action_url=f'/client/missions/{mission.id}/cancel/'
        )
        
        # Notifier l'entreprise
        if mission.assigned_enterprise:
            create_notification(
                mission.assigned_enterprise.user,
                'mission_expired',
                'Mission expirée',
                f'La mission « {mission.title} » a expirée. Le délai de dépôt de caution est dépassé.',
                mission=mission,
                action_url=f'/enterprise/missions/{mission.id}'
            )
        
        return Response({
            'success': True,
            'message': 'Échéance signalée avec succès. La mission est maintenant marquée comme expirée.',
            'mission_status': mission.status,
            'next_steps': {
                'client': 'Peut annuler la mission et obtenir un remboursement',
                'enterprise': 'Doit contacter le client pour renégocier',
                'employee': 'En attente d\'une nouvelle assignation'
            }
        })
        
    except Mission.DoesNotExist:
        return Response({'error': 'Mission non trouvée'}, status=404)


def get_employee_status_message(mission, employee, is_overdue, can_start, can_claim_timeout):
    """Génère le message approprié pour l'employé."""
    if can_start:
        return {
            'type': 'success',
            'title': 'Prêt à démarrer',
            'message': 'La caution a été déposée. Vous pouvez démarrer la mission maintenant.',
            'action': 'start'
        }
    elif is_overdue and can_claim_timeout:
        return {
            'type': 'warning',
            'title': 'Échéance dépassée',
            'message': 'Le délai de dépôt de caution est dépassé. Signalez cette échéance.',
            'action': 'claim_timeout'
        }
    elif not mission.deposit_paid:
        deadline = mission.deposit_deadline
        if deadline:
            time_left = deadline - timezone.now()
            hours_left = time_left.total_seconds() / 3600
            if hours_left < 24:
                return {
                    'type': 'urgent',
                    'title': 'Dépôt requis urgent',
                    'message': f'L\'entreprise doit déposer la caution dans {hours_left:.1f} heures.',
                    'action': 'wait'
                }
            else:
                return {
                    'type': 'info',
                    'title': 'En attente de dépôt',
                    'message': f'En attente du dépôt de caution par l\'entreprise (délai : {hours_left:.1f} heures restantes).',
                    'action': 'wait'
                }
        else:
            return {
                'type': 'info',
                'title': 'En attente de dépôt',
                'message': 'En attente du dépôt de caution par l\'entreprise.',
                'action': 'wait'
            }
    else:
        return {
            'type': 'info',
            'title': 'Mission en cours',
            'message': f'Statut actuel : {mission.get_status_display()}',
            'action': 'view'
        }
