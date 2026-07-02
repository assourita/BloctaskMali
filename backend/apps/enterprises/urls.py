from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EnterpriseTeamViewSet, EmployeeAssignmentViewSet,
    EnterpriseContractViewSet, EnterpriseInvoiceViewSet,
    EmployeeAvailabilityViewSet, enterprise_finances_summary,
)

router = DefaultRouter()
router.register(r'teams', EnterpriseTeamViewSet, basename='enterprise-team')
router.register(r'assignments', EmployeeAssignmentViewSet, basename='employee-assignment')
router.register(r'contracts', EnterpriseContractViewSet, basename='enterprise-contract')
router.register(r'invoices', EnterpriseInvoiceViewSet, basename='enterprise-invoice')
router.register(r'availability', EmployeeAvailabilityViewSet, basename='employee-availability')

urlpatterns = [
    path('finances/summary/', enterprise_finances_summary, name='enterprise-finances-summary'),
    path('', include(router.urls)),
]
