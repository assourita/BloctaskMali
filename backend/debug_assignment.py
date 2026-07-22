#!/usr/bin/env python
"""Script de débogage pour tester l'assignation d'employés."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.users.models import Employee, EnterpriseProfile
from apps.missions.models import Mission
from apps.users.employee_validation import EmployeeValidator

def debug_employee_validation():
    """Débogage de la validation des employés."""
    print("=== DÉBOGAGE VALIDATION EMPLOYÉS ===\n")
    
    # Lister toutes les entreprises
    enterprises = EnterpriseProfile.objects.all()
    print(f"Entreprises trouvées: {enterprises.count()}")
    
    for enterprise in enterprises:
        print(f"\n--- Entreprise: {enterprise.company_name} ---")
        employees = enterprise.employees.all()
        print(f"Employés: {employees.count()}")
        
        validator = EmployeeValidator()
        for employee in employees:
            print(f"\nEmployé: {employee.first_name} {employee.last_name}")
            print(f"Email: {employee.email}")
            print(f"User ID: {employee.user_id}")
            print(f"Actif: {employee.is_active}")
            print(f"Terminé: {employee.terminated_at}")
            
            # Validation complète
            result = validator.validate_employee(employee)
            print(f"Valide: {result.is_valid}")
            print(f"Peut assigner: {result.can_assign_mission}")
            print(f"Score: {result.validation_score}")
            
            if result.issues:
                print("Problèmes:")
                for issue in result.issues:
                    print(f"  - [{issue.severity}] {issue.message}")
                    print(f"    Solution: {issue.suggested_action}")
    
    # Lister les missions disponibles
    print("\n=== MISSIONS DISPONIBLES ===")
    missions = Mission.objects.filter(status='funded')
    print(f"Mission funded: {missions.count()}")
    
    for mission in missions[:3]:  # Limiter à 3 missions
        print(f"\nMission: {mission.title}")
        print(f"ID: {mission.id}")
        print(f"Status: {mission.status}")
        print(f"Entreprise assignée: {mission.assigned_enterprise}")
        print(f"Dépôt payé: {mission.deposit_paid}")

if __name__ == '__main__':
    debug_employee_validation()
