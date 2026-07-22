#!/usr/bin/env python
"""Script pour vérifier pourquoi l'employé ne peut pas se connecter."""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.users.employee_helpers import primary_employee

User = get_user_model()

def check_employee_login_issue():
    """Vérifie le problème de connexion de l'employé."""
    print("=== VÉRIFICATION CONNEXION EMPLOYÉ ===\n")
    
    # L'ID de l'employé des logs
    user_id = "6fb7e521-1ebe-4a27-b297-24ec9c21b463"
    
    try:
        user = User.objects.get(id=user_id)
        print(f"👤 UTILISATEUR TROUVÉ:")
        print(f"  - ID: {user.id}")
        print(f"  - Email: {user.email}")
        print(f"  - Username: {user.username}")
        print(f"  - Nom complet: {user.get_full_name()}")
        print(f"  - Actif: {user.is_active}")
        print(f"  - Suspendu: {user.is_suspended}")
        print(f"  - Type: {getattr(user, 'user_type', 'N/A')}")
        print(f"  - Date création: {user.created_at}")
        print(f"  - Dernière connexion: {user.last_login}")
        
        # Vérifier le mot de passe
        print(f"\n🔐 VÉRIFICATION MOT DE PASSE:")
        print(f"  - A un mot de passe: {bool(user.password)}")
        if user.password:
            print(f"  - Hash du mot de passe: {user.password[:20]}...")
        
        # Vérifier si c'est un employé
        employee = primary_employee(user)
        if employee:
            print(f"\n👷 PROFIL EMPLOYÉ:")
            print(f"  - Employee ID: {employee.id}")
            print(f"  - Entreprise: {employee.enterprise.company_name}")
            print(f"  - Position: {employee.position}")
            print(f"  - Actif: {employee.is_active}")
            print(f"  - Email employé: {employee.email}")
            print(f"  - Téléphone: {employee.phone}")
        else:
            print(f"\n❌ PAS DE PROFIL EMPLOYÉ TROUVÉ")
        
        # Tester quelques mots de passe courants
        test_passwords = [
            "password",
            "123456", 
            "password123",
            "blocktask",
            "admin",
            user.email,
            user.username
        ]
        
        print(f"\n🧪 TEST MOTS DE PASSE COURANTS:")
        for pwd in test_passwords:
            try:
                if user.check_password(pwd):
                    print(f"  ✅ MOT DE PASSE TROUVÉ: {pwd}")
                    break
            except:
                print(f"  ❌ Erreur avec: {pwd}")
        else:
            print(f"  ❌ Aucun mot de passe courant ne fonctionne")
        
        # Suggestions pour réparer
        print(f"\n💡 SOLUTIONS:")
        if not user.is_active:
            print(f"  1. ❌ Le compte n'est pas actif - Activez-le dans l'admin")
        if user.is_suspended:
            print(f"  2. ❌ Le compte est suspendu - Désuspendez-le dans l'admin")
        if not user.password or user.password.startswith('!'):
            print(f"  3. ❌ Le mot de passe n'est pas défini - Définissez-en un dans l'admin")
        
        print(f"\n🔧 ACTIONS RECOMMANDÉES:")
        print(f"  1. Allez dans l'admin Django")
        print(f"  2. Cherchez l'utilisateur: {user.email}")
        print(f"  3. Vérifiez que 'is_active' est coché")
        print(f"  4. Vérifiez que 'is_suspended' n'est pas coché")
        print(f"  5. Définissez un nouveau mot de passe")
        print(f"  6. Sauvegardez et essayez de vous connecter")
        
    except User.DoesNotExist:
        print(f"❌ Utilisateur {user_id} non trouvé")

if __name__ == '__main__':
    check_employee_login_issue()
