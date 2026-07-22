"""Endpoints de validation et de remédiation pour les employés."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from apps.users.models import EnterpriseProfile, Employee
from apps.missions.models import Mission
from .views import get_enterprise_profile

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_employee(request, employee_id):
    """Valide un employé et retourne les problèmes avec solutions."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        if not request.user.is_staff and employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        from apps.users.employee_validation import EmployeeValidator
        validator = EmployeeValidator()
        result = validator.validate_employee(employee)
        
        return Response({
            'employee_id': str(employee.id),
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'is_valid': result.is_valid,
            'can_assign_mission': result.can_assign_mission,
            'validation_score': result.validation_score,
            'issues': [
                {
                    'type': issue.type.value,
                    'severity': issue.severity,
                    'message': issue.message,
                    'suggested_action': issue.suggested_action,
                    'can_auto_fix': issue.can_auto_fix,
                    'fix_endpoint': issue.fix_endpoint
                }
                for issue in result.issues
            ]
        })
    
    except Employee.DoesNotExist:
        return Response({'error': 'Employé non trouvé'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_employee_for_mission(request, employee_id, mission_id):
    """Valide si un employé peut être assigné à une mission spécifique."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        mission = Mission.objects.get(id=mission_id)
        
        if not request.user.is_staff and employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        if not request.user.is_staff and mission.assigned_enterprise != profile:
            return Response({'error': 'Mission non trouvée'}, status=404)
        
        from apps.users.employee_validation import validate_employee_for_assignment
        result = validate_employee_for_assignment(str(employee.id), str(mission.id))
        
        return Response(result)
    
    except (Employee.DoesNotExist, Mission.DoesNotExist):
        return Response({'error': 'Employé ou mission non trouvé'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enterprise_employee_health(request):
    """Retourne un rapport sur la santé des comptes employés."""
    profile = get_enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise non trouvé'}, status=404)
    
    from apps.users.employee_validation import get_enterprise_employee_health
    result = get_enterprise_employee_health(str(profile.id))
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fix_employee_account(request, employee_id):
    """Crée un compte utilisateur pour un employé qui n'en a pas."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        if employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        if employee.user:
            return Response({'error': 'Cet employé a déjà un compte'}, status=400)
        
        if not employee.email or '@' not in employee.email:
            return Response({'error': 'Email valide requis'}, status=400)
        
        from apps.users.enterprise_services import create_employee_account
        try:
            new_employee, temp_password = create_employee_account(
                enterprise=profile,
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
            
            return Response({
                'success': True,
                'message': 'Compte créé avec succès',
                'temp_password': temp_password,
                'username': new_employee.user.username,
                'employee_id': str(employee.id)
            })
        
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
    
    except Employee.DoesNotExist:
        return Response({'error': 'Employé non trouvé'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_employee(request, employee_id):
    """Réactive un employé et son compte utilisateur."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        if employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        from apps.users.enterprise_services import update_employee_record
        employee = update_employee_record(employee, is_active=True)
        
        # Réactiver le compte utilisateur s'il existe
        if employee.user:
            employee.user.is_active = True
            employee.user.save(update_fields=['is_active'])
        
        return Response({
            'success': True,
            'message': 'Employé réactivé avec succès',
            'employee_id': str(employee.id)
        })
    
    except Employee.DoesNotExist:
        return Response({'error': 'Employé non trouvé'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_employee_email(request, employee_id):
    """Met à jour l'email d'un employé et crée le compte si nécessaire."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        if employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        new_email = request.data.get('email', '').strip().lower()
        if not new_email or '@' not in new_email:
            return Response({'error': 'Email valide requis'}, status=400)
        
        # Vérifier si l'email est déjà utilisé
        if User.objects.filter(email=new_email).exclude(id=employee.user_id).exists():
            return Response({'error': 'Cet email est déjà utilisé'}, status=400)
        
        # Mettre à jour l'email de l'employé
        employee.email = new_email
        employee.save(update_fields=['email'])
        
        # Si l'employé a un compte utilisateur, mettre à jour aussi
        if employee.user:
            employee.user.email = new_email
            employee.user.save(update_fields=['email'])
        
        return Response({
            'success': True,
            'message': 'Email mis à jour avec succès',
            'email': new_email
        })
    
    except Employee.DoesNotExist:
        return Response({'error': 'Employé non trouvé'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_provider_profile(request, employee_id):
    """Crée un profil prestataire pour un employé."""
    try:
        profile = get_enterprise_profile(request.user)
        if not profile:
            return Response({'error': 'Non autorisé'}, status=403)
        
        employee = Employee.objects.get(id=employee_id)
        if employee.enterprise != profile:
            return Response({'error': 'Employé non trouvé'}, status=404)
        
        if not employee.user:
            return Response({'error': 'L\'employé doit avoir un compte utilisateur'}, status=400)
        
        from apps.users.models import ProviderProfile
        provider_profile, created = ProviderProfile.objects.get_or_create(
            user=employee.user,
            defaults={
                'managed_by_enterprise': profile,
                'is_available': True,
            }
        )
        
        if not created:
            provider_profile.managed_by_enterprise = profile
            provider_profile.is_available = True
            provider_profile.save()
        
        return Response({
            'success': True,
            'message': 'Profil prestataire créé avec succès',
            'profile_id': str(provider_profile.id)
        })
    
    except Employee.DoesNotExist:
        return Response({'error': 'Employé non trouvé'}, status=404)
