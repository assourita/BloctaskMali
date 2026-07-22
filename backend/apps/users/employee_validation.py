"""Service de validation des comptes employés et détection des problèmes."""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Employee, EnterpriseProfile
from apps.missions.models import Mission
from apps.enterprises.models import EmployeeAssignment

User = get_user_model()


class ValidationIssueType(Enum):
    """Types de problèmes de validation."""
    NO_USER_ACCOUNT = "no_user_account"
    USER_INACTIVE = "user_inactive"
    USER_SUSPENDED = "user_suspended"
    EMPLOYEE_INACTIVE = "employee_inactive"
    EMPLOYEE_TERMINATED = "employee_terminated"
    NO_PROVIDER_PROFILE = "no_provider_profile"
    INVALID_EMAIL = "invalid_email"
    MISSING_PHONE = "missing_phone"
    MISSING_NINA = "missing_nina"
    MISSING_ID_CARD = "missing_id_card"
    WALLET_ISSUES = "wallet_issues"
    DUPLICATE_EMAIL = "duplicate_email"


@dataclass
class ValidationIssue:
    """Représente un problème de validation."""
    type: ValidationIssueType
    severity: str  # 'critical', 'warning', 'info'
    message: str
    suggested_action: str
    can_auto_fix: bool = False
    fix_endpoint: Optional[str] = None


@dataclass
class EmployeeValidationResult:
    """Résultat de validation d'un employé."""
    employee: Employee
    is_valid: bool
    issues: List[ValidationIssue]
    can_assign_mission: bool
    validation_score: int  # 0-100


class EmployeeValidator:
    """Service de validation des comptes employés."""
    
    def __init__(self):
        self.critical_issues = [
            ValidationIssueType.NO_USER_ACCOUNT,
            ValidationIssueType.USER_SUSPENDED,
            ValidationIssueType.EMPLOYEE_TERMINATED,
            ValidationIssueType.DUPLICATE_EMAIL,
        ]
        
        self.warning_issues = [
            ValidationIssueType.USER_INACTIVE,
            ValidationIssueType.EMPLOYEE_INACTIVE,
            ValidationIssueType.NO_PROVIDER_PROFILE,
            ValidationIssueType.INVALID_EMAIL,
        ]
    
    def validate_employee(self, employee: Employee) -> EmployeeValidationResult:
        """Valide un employé et retourne les problèmes trouvés."""
        issues = []
        
        # Validation du compte utilisateur
        if not employee.user:
            issues.append(ValidationIssue(
                type=ValidationIssueType.NO_USER_ACCOUNT,
                severity='critical',
                message="Cet employé n'a pas de compte utilisateur associé",
                suggested_action="Créer un compte utilisateur avec un email valide",
                can_auto_fix=True,
                fix_endpoint="/api/enterprise/employees/{id}/create-account/"
            ))
        else:
            issues.extend(self._validate_user_account(employee.user))
        
        # Validation du profil employé
        issues.extend(self._validate_employee_profile(employee))
        
        # Validation du profil prestataire
        if employee.user:
            issues.extend(self._validate_provider_profile(employee.user))
        
        # Validation des documents
        issues.extend(self._validate_documents(employee))
        
        # Validation du wallet
        if employee.user:
            issues.extend(self._validate_wallet(employee.user))
        
        # Calcul du score de validation
        validation_score = self._calculate_validation_score(issues)
        
        # Détermination de la validité pour assignation
        can_assign = self._can_assign_mission(issues)
        is_valid = len([i for i in issues if i.severity == 'critical']) == 0
        
        return EmployeeValidationResult(
            employee=employee,
            is_valid=is_valid,
            issues=issues,
            can_assign_mission=can_assign,
            validation_score=validation_score
        )
    
    def _validate_user_account(self, user: User) -> List[ValidationIssue]:
        """Valide le compte utilisateur."""
        issues = []
        
        if not user.is_active:
            issues.append(ValidationIssue(
                type=ValidationIssueType.USER_INACTIVE,
                severity='warning',
                message="Le compte utilisateur est désactivé",
                suggested_action="Réactiver le compte utilisateur",
                can_auto_fix=True,
                fix_endpoint=f"/api/users/{user.id}/activate/"
            ))
        
        if user.is_suspended:
            issues.append(ValidationIssue(
                type=ValidationIssueType.USER_SUSPENDED,
                severity='critical',
                message=f"Le compte est suspendu : {user.suspension_reason}",
                suggested_action="Contacter l'administrateur pour résoudre la suspension",
                can_auto_fix=False
            ))
        
        # Vérification des doublons d'email
        if user.email:
            email_count = User.objects.filter(email=user.email).exclude(id=user.id).count()
            if email_count > 0:
                issues.append(ValidationIssue(
                    type=ValidationIssueType.DUPLICATE_EMAIL,
                    severity='critical',
                    message="L'email est utilisé par un autre compte",
                    suggested_action="Mettre à jour l'email avec une adresse unique",
                    can_auto_fix=False
                ))
        
        return issues
    
    def _validate_employee_profile(self, employee: Employee) -> List[ValidationIssue]:
        """Valide le profil de l'employé."""
        issues = []
        
        if not employee.is_active:
            issues.append(ValidationIssue(
                type=ValidationIssueType.EMPLOYEE_INACTIVE,
                severity='warning',
                message="L'employé est marqué comme inactif",
                suggested_action="Réactiver l'employé si nécessaire",
                can_auto_fix=True,
                fix_endpoint=f"/api/enterprise/employees/{employee.id}/activate/"
            ))
        
        if employee.terminated_at:
            issues.append(ValidationIssue(
                type=ValidationIssueType.EMPLOYEE_TERMINATED,
                severity='critical',
                message=f"L'employé a été terminé le {employee.terminated_at.strftime('%d/%m/%Y')}",
                suggested_action="Créer un nouvel employé ou réactiver celui-ci",
                can_auto_fix=False
            ))
        
        if not employee.email or '@' not in employee.email:
            issues.append(ValidationIssue(
                type=ValidationIssueType.INVALID_EMAIL,
                severity='warning',
                message="L'email de l'employé est invalide ou manquant",
                suggested_action="Mettre à jour l'email avec une adresse valide",
                can_auto_fix=True,
                fix_endpoint=f"/api/enterprise/employees/{employee.id}/update-email/"
            ))
        
        if not employee.phone or len(employee.phone.strip()) < 8:
            issues.append(ValidationIssue(
                type=ValidationIssueType.MISSING_PHONE,
                severity='warning',
                message="Le numéro de téléphone est manquant ou invalide",
                suggested_action="Ajouter un numéro de téléphone valide",
                can_auto_fix=True,
                fix_endpoint=f"/api/enterprise/employees/{employee.id}/update-phone/"
            ))
        
        return issues
    
    def _validate_provider_profile(self, user: User) -> List[ValidationIssue]:
        """Valide le profil prestataire."""
        issues = []
        
        try:
            provider_profile = user.provider_profile
            if not provider_profile:
                issues.append(ValidationIssue(
                    type=ValidationIssueType.NO_PROVIDER_PROFILE,
                    severity='warning',
                    message="Le profil prestataire est manquant",
                    suggested_action="Créer le profil prestataire automatiquement",
                    can_auto_fix=True,
                    fix_endpoint=f"/api/users/{user.id}/create-provider-profile/"
                ))
        except:
            issues.append(ValidationIssue(
                type=ValidationIssueType.NO_PROVIDER_PROFILE,
                severity='warning',
                message="Le profil prestataire est manquant",
                suggested_action="Créer le profil prestataire automatiquement",
                can_auto_fix=True,
                fix_endpoint=f"/api/users/{user.id}/create-provider-profile/"
            ))
        
        return issues
    
    def _validate_documents(self, employee: Employee) -> List[ValidationIssue]:
        """Valide les documents requis."""
        issues = []
        
        if not employee.nina or len(employee.nina.strip()) < 10:
            issues.append(ValidationIssue(
                type=ValidationIssueType.MISSING_NINA,
                severity='info',
                message="Le NINA est manquant ou incomplet",
                suggested_action="Ajouter le numéro NINA de l'employé",
                can_auto_fix=True,
                fix_endpoint=f"/api/enterprise/employees/{employee.id}/update-nina/"
            ))
        
        if not employee.id_card:
            issues.append(ValidationIssue(
                type=ValidationIssueType.MISSING_ID_CARD,
                severity='info',
                message="La carte d'identité n'est pas téléchargée",
                suggested_action="Télécharger une copie de la carte d'identité",
                can_auto_fix=False
            ))
        
        return issues
    
    def _validate_wallet(self, user: User) -> List[ValidationIssue]:
        """Valide le wallet de l'utilisateur."""
        issues = []
        
        try:
            wallet = user.wallet
            if not wallet:
                issues.append(ValidationIssue(
                    type=ValidationIssueType.WALLET_ISSUES,
                    severity='warning',
                    message="Le wallet n'est pas configuré",
                    suggested_action="Configurer le wallet pour recevoir les paiements",
                    can_auto_fix=True,
                    fix_endpoint=f"/api/users/{user.id}/setup-wallet/"
                ))
        except:
            issues.append(ValidationIssue(
                type=ValidationIssueType.WALLET_ISSUES,
                severity='warning',
                message="Le wallet n'est pas configuré",
                suggested_action="Configurer le wallet pour recevoir les paiements",
                can_auto_fix=True,
                fix_endpoint=f"/api/users/{user.id}/setup-wallet/"
            ))
        
        return issues
    
    def _calculate_validation_score(self, issues: List[ValidationIssue]) -> int:
        """Calcule un score de validation (0-100)."""
        if not issues:
            return 100
        
        score = 100
        for issue in issues:
            if issue.severity == 'critical':
                score -= 40
            elif issue.severity == 'warning':
                score -= 20
            elif issue.severity == 'info':
                score -= 10
        
        return max(0, score)
    
    def _can_assign_mission(self, issues: List[ValidationIssue]) -> bool:
        """Détermine si l'employé peut être assigné à une mission."""
        critical_issues = [i for i in issues if i.severity == 'critical']
        return len(critical_issues) == 0
    
    def validate_enterprise_employees(self, enterprise: EnterpriseProfile) -> List[EmployeeValidationResult]:
        """Valide tous les employés d'une entreprise."""
        results = []
        employees = enterprise.employees.all()
        
        for employee in employees:
            result = self.validate_employee(employee)
            results.append(result)
        
        return results
    
    def get_problematic_employees(self, enterprise: EnterpriseProfile) -> List[EmployeeValidationResult]:
        """Retourne uniquement les employés avec des problèmes."""
        all_results = self.validate_enterprise_employees(enterprise)
        return [r for r in all_results if not r.is_valid or r.issues]
    
    def check_assignment_eligibility(self, employee: Employee, mission: Mission) -> Tuple[bool, List[ValidationIssue]]:
        """Vérifie si un employé peut être assigné à une mission spécifique."""
        validation = self.validate_employee(employee)
        
        # Vérifications spécifiques à la mission
        additional_issues = []
        
        # Vérifier si l'employé a déjà des missions en cours
        active_assignments = EmployeeAssignment.objects.filter(
            employee=employee,
            mission__status__in=['accepted', 'in_progress']
        ).count()
        
        if active_assignments >= 3:  # Limite de 3 missions simultanées
            additional_issues.append(ValidationIssue(
                type=ValidationIssueType.EMPLOYEE_INACTIVE,  # Réutiliser ce type
                severity='warning',
                message=f"L'employé a déjà {active_assignments} missions en cours",
                suggested_action="Attendre la fin d'une mission ou assigner un autre employé",
                can_auto_fix=False
            ))
        
        all_issues = validation.issues + additional_issues
        can_assign = len([i for i in all_issues if i.severity == 'critical']) == 0
        
        return can_assign, all_issues


# Fonctions utilitaires
def validate_employee_for_assignment(employee_id: str, mission_id: str) -> Dict:
    """Valide un employé pour une assignation de mission."""
    try:
        employee = Employee.objects.get(id=employee_id)
        mission = Mission.objects.get(id=mission_id)
        
        validator = EmployeeValidator()
        can_assign, issues = validator.check_assignment_eligibility(employee, mission)
        
        return {
            'can_assign': can_assign,
            'issues': [
                {
                    'type': issue.type.value,
                    'severity': issue.severity,
                    'message': issue.message,
                    'suggested_action': issue.suggested_action,
                    'can_auto_fix': issue.can_auto_fix,
                    'fix_endpoint': issue.fix_endpoint
                }
                for issue in issues
            ],
            'validation_score': validator.validate_employee(employee).validation_score
        }
    
    except Employee.DoesNotExist:
        return {
            'can_assign': False,
            'issues': [{
                'type': 'employee_not_found',
                'severity': 'critical',
                'message': 'Employé non trouvé',
                'suggested_action': 'Vérifier l\'ID de l\'employé',
                'can_auto_fix': False
            }]
        }
    except Mission.DoesNotExist:
        return {
            'can_assign': False,
            'issues': [{
                'type': 'mission_not_found',
                'severity': 'critical',
                'message': 'Mission non trouvée',
                'suggested_action': 'Vérifier l\'ID de la mission',
                'can_auto_fix': False
            }]
        }


def get_enterprise_employee_health(enterprise_id: str) -> Dict:
    """Retourne un rapport sur la santé des comptes employés d'une entreprise."""
    try:
        enterprise = EnterpriseProfile.objects.get(id=enterprise_id)
        validator = EmployeeValidator()
        results = validator.validate_enterprise_employees(enterprise)
        
        total_employees = len(results)
        valid_employees = len([r for r in results if r.is_valid])
        problematic_employees = total_employees - valid_employees
        
        critical_issues_count = sum(
            len([i for i in r.issues if i.severity == 'critical']) 
            for r in results
        )
        
        return {
            'total_employees': total_employees,
            'valid_employees': valid_employees,
            'problematic_employees': problematic_employees,
            'critical_issues_count': critical_issues_count,
            'health_score': (valid_employees / total_employees * 100) if total_employees > 0 else 0,
            'employees': [
                {
                    'id': str(r.employee.id),
                    'name': f"{r.employee.first_name} {r.employee.last_name}",
                    'email': r.employee.email,
                    'is_valid': r.is_valid,
                    'can_assign_mission': r.can_assign_mission,
                    'validation_score': r.validation_score,
                    'issues_count': len(r.issues),
                    'critical_issues': len([i for i in r.issues if i.severity == 'critical'])
                }
                for r in results
            ]
        }
    
    except EnterpriseProfile.DoesNotExist:
        return {
            'error': 'Entreprise non trouvée'
        }
