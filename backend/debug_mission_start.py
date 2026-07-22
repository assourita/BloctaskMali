#!/usr/bin/env python
"""Script de débogage pour vérifier pourquoi l'employé ne peut pas démarrer la mission."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.missions.models import Mission
from apps.users.models import Employee
from apps.missions.views import _mission_start_allowed

User = get_user_model()

def debug_mission_start_permissions():
    """Débogage des permissions de démarrage de mission."""
    print("=== DÉBOGAGE PERMISSIONS DÉMARRAGE MISSION ===\n")
    
    # Prendre la mission ID des logs
    mission_id = "63197826-0b09-4d02-95ef-c0761029d0dd"
    
    try:
        mission = Mission.objects.get(id=mission_id)
        print(f"Mission trouvée: {mission.title}")
        print(f"Status: {mission.status}")
        print(f"Deposit paid: {mission.deposit_paid}")
        print(f"Provider ID: {mission.provider_id}")
        print(f"Assigned enterprise: {mission.assigned_enterprise}")
        print(f"Executing employee: {mission.executing_employee}")
        print(f"Deposit deadline: {mission.deposit_deadline}")
        
        # Vérifier tous les utilisateurs pour voir qui peut démarrer
        print(f"\n=== TEST PERMISSIONS ===")
        
        # Test avec le provider
        if mission.provider:
            can_start = _mission_start_allowed(mission.provider, mission)
            print(f"Provider ({mission.provider.get_full_name()}): {can_start}")
        
        # Test avec l'entreprise
        if mission.assigned_enterprise:
            can_start = _mission_start_allowed(mission.assigned_enterprise.user, mission)
            print(f"Enterprise ({mission.assigned_enterprise.user.get_full_name()}): {can_start}")
        
        # Test avec l'employé
        if mission.executing_employee:
            if mission.executing_employee.user:
                can_start = _mission_start_allowed(mission.executing_employee.user, mission)
                print(f"Employee ({mission.executing_employee.user.get_full_name()}): {can_start}")
                
                # Détails de l'employé
                emp = mission.executing_employee
                print(f"  Employee details:")
                print(f"    - Employee ID: {emp.id}")
                print(f"    - User ID: {emp.user_id}")
                print(f"    - User: {emp.user}")
                print(f"    - Is active: {emp.is_active}")
                print(f"    - User is active: {emp.user.is_active if emp.user else 'N/A'}")
            else:
                print(f"Employee ({mission.executing_employee.get_full_name()}): NO USER ACCOUNT")
        
        # Vérifier manuellement les conditions
        print(f"\n=== VÉRIFICATION MANUELLE DES CONDITIONS ===")
        
        # Condition 1: provider_id == user.id
        print(f"1. Provider direct match: {mission.provider_id}")
        
        # Condition 2: enterprise user_id == user.id
        ent_user_id = mission.assigned_enterprise.user_id if mission.assigned_enterprise else None
        print(f"2. Enterprise user ID: {ent_user_id}")
        print(f"   - Has executing_employee: {bool(mission.executing_employee_id)}")
        print(f"   - Deposit paid: {mission.deposit_paid}")
        
        # Condition 3: employee user_id == user.id
        emp_user_id = mission.executing_employee.user_id if mission.executing_employee else None
        print(f"3. Employee user ID: {emp_user_id}")
        print(f"   - Has executing_employee: {bool(mission.executing_employee_id)}")
        print(f"   - Deposit paid: {mission.deposit_paid}")
        
    except Mission.DoesNotExist:
        print(f"Mission {mission_id} non trouvée")

if __name__ == '__main__':
    debug_mission_start_permissions()
