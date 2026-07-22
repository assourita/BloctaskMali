#!/usr/bin/env python
"""Script pour réparer tous les comptes employés sans compte utilisateur."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.users.models import Employee, EnterpriseProfile
from apps.users.enterprise_services import create_employee_account

def fix_all_employee_accounts():
    """Crée des comptes utilisateurs pour tous les employés qui n'en ont pas."""
    print("=== RÉPARATION DES COMPTES EMPLOYÉS ===\n")
    
    fixed_count = 0
    error_count = 0
    
    # Traiter toutes les entreprises
    enterprises = EnterpriseProfile.objects.all()
    print(f"Entreprises à traiter: {enterprises.count()}")
    
    for enterprise in enterprises:
        print(f"\n--- Entreprise: {enterprise.company_name} ---")
        
        # Employés sans compte utilisateur
        employees_without_account = enterprise.employees.filter(user__isnull=True)
        print(f"Employés sans compte: {employees_without_account.count()}")
        
        for employee in employees_without_account:
            try:
                print(f"  Création du compte pour: {employee.first_name} {employee.last_name}")
                print(f"  Email: {employee.email}")
                
                if not employee.email or '@' not in employee.email:
                    print(f"  ❌ Email invalide: {employee.email}")
                    error_count += 1
                    continue
                
                # Créer le compte utilisateur
                new_employee, temp_password = create_employee_account(
                    enterprise=enterprise,
                    first_name=employee.first_name,
                    last_name=employee.last_name,
                    email=employee.email,
                    phone=employee.phone,
                    position=employee.position,
                    role=employee.role
                )
                
                # Mettre à jour l'employé original avec le nouveau compte
                employee.user = new_employee.user
                employee.save(update_fields=['user'])
                
                print(f"  ✅ Compte créé avec succès!")
                print(f"     Username: {new_employee.user.username}")
                print(f"     Password: {temp_password}")
                print(f"     User ID: {new_employee.user.id}")
                
                fixed_count += 1
                
            except Exception as e:
                print(f"  ❌ Erreur: {str(e)}")
                error_count += 1
    
    print(f"\n=== RÉSUMÉ ===")
    print(f"Comptes créés avec succès: {fixed_count}")
    print(f"Erreurs: {error_count}")
    
    if fixed_count > 0:
        print(f"\n✅ Les employés peuvent maintenant être assignés aux missions!")
    else:
        print(f"\n❌ Aucun compte n'a pu être créé")

if __name__ == '__main__':
    fix_all_employee_accounts()
