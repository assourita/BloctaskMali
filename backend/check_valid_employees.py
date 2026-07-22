#!/usr/bin/env python
"""Script pour vérifier les employés qui ont des comptes valides."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Employee, EnterpriseProfile
from apps.users.employee_validation import EmployeeValidator

User = get_user_model()

def check_valid_employees():
    """Vérifie les employés qui peuvent être assignés aux missions."""
    print("=== VÉRIFICATION DES EMPLOYÉS VALIDES ===\n")
    
    valid_employees = []
    invalid_employees = []
    
    # Traiter toutes les entreprises
    enterprises = EnterpriseProfile.objects.all()
    print(f"Entreprises à vérifier: {enterprises.count()}")
    
    for enterprise in enterprises:
        print(f"\n--- Entreprise: {enterprise.company_name} ---")
        
        employees = enterprise.employees.all()
        print(f"Total employés: {employees.count()}")
        
        validator = EmployeeValidator()
        
        for employee in employees:
            result = validator.validate_employee(employee)
            
            if result.can_assign_mission:
                valid_employees.append(employee)
                print(f"  ✅ {employee.first_name} {employee.last_name} - VALIDE")
            else:
                invalid_employees.append((employee, result))
                critical_issues = [i for i in result.issues if i.severity == 'critical']
                print(f"  ❌ {employee.first_name} {employee.last_name} - {len(critical_issues)} problèmes critiques")
    
    print(f"\n=== RÉSUMÉ ===")
    print(f"Employés valides (peuvent être assignés): {len(valid_employees)}")
    print(f"Employés invalides: {len(invalid_employees)}")
    
    if valid_employees:
        print(f"\n✅ EMPLOYÉS VALIDES POUR ASSIGNATION:")
        for i, emp in enumerate(valid_employees[:10], 1):  # Limiter à 10
            print(f"  {i}. {emp.first_name} {emp.last_name} ({emp.email})")
            print(f"     ID: {emp.id}")
            print(f"     User ID: {emp.user_id}")
        
        if len(valid_employees) > 10:
            print(f"     ... et {len(valid_employees) - 10} autres")
    
    if invalid_employees:
        print(f"\n❌ EMPLOYÉS INVALIDES (problèmes principaux):")
        for emp, result in invalid_employees[:5]:  # Limiter à 5
            critical_issues = [i for i in result.issues if i.severity == 'critical']
            print(f"  • {emp.first_name} {emp.last_name}:")
            for issue in critical_issues:
                print(f"    - {issue.message}")
        
        if len(invalid_employees) > 5:
            print(f"  • ... et {len(invalid_employees) - 5} autres")
    
    return valid_employees, invalid_employees

if __name__ == '__main__':
    valid, invalid = check_valid_employees()
