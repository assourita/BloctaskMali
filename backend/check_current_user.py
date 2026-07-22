#!/usr/bin/env python
"""Script pour vérifier l'utilisateur actuel et ses permissions."""

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

def check_current_user_permissions():
    """Vérifie les permissions de l'utilisateur actuel."""
    print("=== VÉRIFICATION UTILISATEUR ACTUEL ===\n")
    
    # Mission ID des logs
    mission_id = "63197826-0b09-4d02-95ef-c0761029d0dd"
    
    try:
        mission = Mission.objects.get(id=mission_id)
        print(f"Mission: {mission.title}")
        print(f"Employé assigné: {mission.executing_employee}")
        
        # Lister tous les utilisateurs employés pour voir lequel est connecté
        print(f"\n=== UTILISATEURS EMPLOYÉS DISPONIBLES ===")
        
        employees = Employee.objects.filter(user__isnull=False).select_related('user')
        for emp in employees:
            can_start = _mission_start_allowed(emp.user, mission)
            is_assigned = emp == mission.executing_employee
            
            print(f"• {emp.user.get_full_name()} ({emp.user.email})")
            print(f"  - Employee ID: {emp.id}")
            print(f"  - User ID: {emp.user.id}")
            print(f"  - Can start mission: {can_start}")
            print(f"  - Is assigned to this mission: {is_assigned}")
            print(f"  - Enterprise: {emp.enterprise.company_name}")
            print()
        
        # Vérifier spécifiquement l'employé assigné
        if mission.executing_employee and mission.executing_employee.user:
            assigned_emp = mission.executing_employee
            print(f"=== EMPLOYÉ ASSIGNÉ SPÉCIFIQUE ===")
            print(f"Nom: {assigned_emp.user.get_full_name()}")
            print(f"Email: {assigned_emp.user.email}")
            print(f"User ID: {assigned_emp.user.id}")
            print(f"Employee ID: {assigned_emp.id}")
            print(f"Enterprise: {assigned_emp.enterprise.company_name}")
            print(f"Can start: {_mission_start_allowed(assigned_emp.user, mission)}")
            
            # Vérifier si cet utilisateur existe dans la base
            try:
                user_check = User.objects.get(id=assigned_emp.user.id)
                print(f"User exists in DB: {bool(user_check)}")
                print(f"User is active: {user_check.is_active}")
                print(f"User type: {getattr(user_check, 'user_type', 'N/A')}")
            except User.DoesNotExist:
                print("ERROR: User not found in database!")
        
    except Mission.DoesNotExist:
        print(f"Mission {mission_id} non trouvée")

if __name__ == '__main__':
    check_current_user_permissions()
