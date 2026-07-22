from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EnterpriseTeamViewSet, EmployeeAssignmentViewSet,
    EnterpriseContractViewSet, EnterpriseInvoiceViewSet,
    EmployeeAvailabilityViewSet, enterprise_finances_summary,
)
from .validation_views import (
    validate_employee, validate_employee_for_mission, enterprise_employee_health,
    fix_employee_account, activate_employee, update_employee_email, create_provider_profile
)

router = DefaultRouter()
router.register(r'teams', EnterpriseTeamViewSet, basename='enterprise-team')
router.register(r'assignments', EmployeeAssignmentViewSet, basename='employee-assignment')
router.register(r'contracts', EnterpriseContractViewSet, basename='enterprise-contract')
router.register(r'invoices', EnterpriseInvoiceViewSet, basename='enterprise-invoice')
router.register(r'availability', EmployeeAvailabilityViewSet, basename='employee-availability')

urlpatterns = [
    path('finances/summary/', enterprise_finances_summary, name='enterprise-finances-summary'),
    # Endpoints de validation et remédiation
    path('employees/<uuid:employee_id>/validate/', validate_employee, name='validate-employee'),
    path('employees/<uuid:employee_id>/missions/<uuid:mission_id>/validate/', validate_employee_for_mission, name='validate-employee-mission'),
    path('employees/health/', enterprise_employee_health, name='enterprise-employee-health'),
    path('employees/<uuid:employee_id>/fix-account/', fix_employee_account, name='fix-employee-account'),
    path('employees/<uuid:employee_id>/activate/', activate_employee, name='activate-employee'),
    path('employees/<uuid:employee_id>/update-email/', update_employee_email, name='update-employee-email'),
    path('employees/<uuid:employee_id>/create-provider-profile/', create_provider_profile, name='create-employee-provider-profile'),
    path('', include(router.urls)),
]
