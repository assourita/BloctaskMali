#!/usr/bin/env python
"""Script pour vérifier le statut complet de la mission et pourquoi le démarrage est bloqué."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.missions.models import Mission
from apps.users.models import Employee
from apps.missions.views import _mission_start_allowed

User = get_user_model()

def check_mission_complete_status():
    """Vérifie le statut complet de la mission."""
    print("=== VÉRIFICATION COMPLÈTE STATUT MISSION ===\n")
    
    mission_id = "63197826-0b09-4d02-95ef-c0761029d0dd"
    
    try:
        mission = Mission.objects.get(id=mission_id)
        now = timezone.now()
        
        print(f"📋 MISSION: {mission.title}")
        print(f"🆔 ID: {mission.id}")
        print(f"📊 Status: {mission.status} ({mission.get_status_display()})")
        print(f"💰 Budget: {mission.budget} {mission.currency}")
        print(f"💵 Caution requise: {mission.required_deposit} {mission.currency}")
        print(f"✅ Caution payée: {mission.deposit_paid}")
        print(f"⏰ Date limite caution: {mission.deposit_deadline}")
        
        # Vérifier l'échéance
        if mission.deposit_deadline:
            if mission.deposit_deadline > now:
                time_remaining = mission.deposit_deadline - now
                print(f"⏳ Temps restant: {time_remaining}")
                print(f"📅 En heures: {time_remaining.total_seconds() / 3600:.1f} heures")
                is_overdue = False
            else:
                time_overdue = now - mission.deposit_deadline
                print(f"⚠️ ÉCHÉANCE DÉPASSÉE DE: {time_overdue}")
                print(f"📅 En heures: {time_overdue.total_seconds() / 3600:.1f} heures")
                is_overdue = True
        else:
            print("⏰ Aucune échéance définie")
            is_overdue = False
        
        print(f"\n👥 PARTICIPANTS:")
        print(f"👤 Client: {mission.client.get_full_name()} ({mission.client.email})")
        print(f"🏢 Entreprise assignée: {mission.assigned_enterprise.company_name if mission.assigned_enterprise else 'None'}")
        print(f"👷 Employé assigné: {f'{mission.executing_employee.first_name} {mission.executing_employee.last_name}' if mission.executing_employee else 'None'}")
        print(f"🔧 Prestataire: {mission.provider.get_full_name() if mission.provider else 'None'}")
        
        # Vérifier les permissions de démarrage
        print(f"\n🔐 PERMISSIONS DÉMARRAGE:")
        
        # Test avec chaque participant
        participants = []
        if mission.client:
            participants.append(("Client", mission.client))
        if mission.assigned_enterprise:
            participants.append(("Entreprise", mission.assigned_enterprise.user))
        if mission.executing_employee and mission.executing_employee.user:
            participants.append(("Employé", mission.executing_employee.user))
        if mission.provider:
            participants.append(("Prestataire", mission.provider))
        
        for role, user in participants:
            can_start = _mission_start_allowed(user, mission)
            status = "✅ AUTORISÉ" if can_start else "❌ BLOQUÉ"
            print(f"  {role}: {user.get_full_name()} - {status}")
        
        # Analyser pourquoi c'est bloqué
        print(f"\n🔍 ANALYSE DU BLOCAGE:")
        
        if not mission.deposit_paid:
            print(f"❌ CAUTION NON PAYÉE - C'est la cause principale du blocage!")
            print(f"   💡 Solution: L'entreprise doit déposer {mission.required_deposit} {mission.currency}")
        
        if is_overdue:
            print(f"❌ ÉCHÉANCE DÉPASSÉE - La mission est expirée!")
            print(f"   💡 Solution: Le client peut annuler et se faire rembourser")
        
        if mission.status != Mission.Status.ACCEPTED:
            print(f"❌ STATUT INCORRECT - La mission n'est pas en statut 'ACCEPTED'")
            print(f"   💡 Solution: Vérifier le workflow de la mission")
        
        # Vérifier si l'employé peut signaler l'échéance
        if is_overdue and not mission.deposit_paid and mission.executing_employee:
            print(f"\n🚨 ACTION DISPONIBLE POUR L'EMPLOYÉ:")
            print(f"   L'employé peut signaler l'échéance!")
            print(f"   Endpoint: POST /api/missions/{mission.id}/claim-timeout/")
        
        # État actuel du workflow
        print(f"\n📋 ÉTAT DU WORKFLOW:")
        if mission.deposit_paid and not is_overdue:
            print(f"✅ PRÊT À DÉMARRER - L'employé peut démarrer la mission")
        elif not mission.deposit_paid and not is_overdue:
            print(f"⏳ EN ATTENTE - En attente du paiement de la caution")
        elif is_overdue and not mission.deposit_paid:
            print(f"⚠️ EXPIRÉE - La mission est expirée, actions requises")
        elif mission.deposit_paid and is_overdue:
            print(f"🔄 SITUATION SPÉCIALE - Dépôt payé mais échéance dépassée")
        
    except Mission.DoesNotExist:
        print(f"❌ Mission {mission_id} non trouvée")

if __name__ == '__main__':
    check_mission_complete_status()
