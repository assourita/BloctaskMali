#!/usr/bin/env python
"""Script pour lier les comptes utilisateurs existants aux employés."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Employee, EnterpriseProfile

User = get_user_model()

def link_existing_accounts():
    """Lie les comptes utilisateurs existants aux employés correspondants."""
    print("=== LIAGE DES COMPTES UTILISATEURS EXISTANTS ===\n")
    
    linked_count = 0
    not_found_count = 0
    
    # Traiter toutes les entreprises
    enterprises = EnterpriseProfile.objects.all()
    print(f"Entreprises à traiter: {enterprises.count()}")
    
    for enterprise in enterprises:
        print(f"\n--- Entreprise: {enterprise.company_name} ---")
        
        # Employés sans compte utilisateur
        employees_without_account = enterprise.employees.filter(user__isnull=True)
        print(f"Employés sans compte lié: {employees_without_account.count()}")
        
        for employee in employees_without_account:
            try:
                print(f"  Recherche du compte pour: {employee.first_name} {employee.last_name}")
                print(f"  Email: {employee.email}")
                
                if not employee.email or '@' not in employee.email:
                    print(f"  ❌ Email invalide: {employee.email}")
                    not_found_count += 1
                    continue
                
                # Chercher le compte utilisateur par email
                try:
                    user = User.objects.get(email=employee.email.lower())
                    print(f"  ✅ Compte trouvé: {user.username} (ID: {user.id})")
                    
                    # Lier le compte à l'employé
                    employee.user = user
                    employee.save(update_fields=['user'])
                    
                    print(f"  ✅ Compte lié avec succès!")
                    linked_count += 1
                    
                except User.DoesNotExist:
                    print(f"  ❌ Aucun compte trouvé pour cet email")
                    not_found_count += 1
                    
            except Exception as e:
                print(f"  ❌ Erreur: {str(e)}")
                not_found_count += 1
    
    print(f"\n=== RÉSUMÉ ===")
    print(f"Comptes liés avec succès: {linked_count}")
    print(f"Comptes non trouvés: {not_found_count}")
    
    if linked_count > 0:
        print(f"\n✅ Les employés liés peuvent maintenant être assignés aux missions!")
    else:
        print(f"\n❌ Aucun compte n'a pu être lié")
    
    # Vérification finale
    print(f"\n=== VÉRIFICATION FINALE ===")
    still_without_account = Employee.objects.filter(user__isnull=True).count()
    print(f"Employés encore sans compte: {still_without_account}")

if __name__ == '__main__':
    link_existing_accounts()
