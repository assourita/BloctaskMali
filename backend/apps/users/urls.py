"""
BlockTask Users URLs
"""

from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    
    # Profile
    path('me/', views.UserProfileView.as_view(), name='user-profile'),
    path('<uuid:id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('', views.UserListView.as_view(), name='user-list'),
    
    # Provider
    path('provider/profile/', views.ProviderProfileView.as_view(), name='provider-profile'),
    
    # Enterprise
    path('enterprise/profile/', views.EnterpriseProfileView.as_view(), name='enterprise-profile'),
    path('enterprise/employees/', views.EmployeeListCreateView.as_view(), name='employee-list'),
    path('enterprise/employees/<uuid:id>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    
    # Wallet & Transactions
    path('wallet/transactions/', views.WalletTransactionListView.as_view(), name='wallet-transactions'),
    path('wallet/connect/', views.WalletConnectView.as_view(), name='wallet-connect'),
    
    # KYC
    path('kyc/submit/', views.KYCSubmissionView.as_view(), name='kyc-submit'),
    
    # Security
    path('password/change/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # Stats & Actions
    path('stats/', views.get_user_stats, name='user-stats'),
    path('toggle-availability/', views.toggle_availability, name='toggle-availability'),
    path('activate-provider-role/', views.activate_provider_role, name='activate-provider-role'),
    path('switch-role/', views.switch_active_role, name='switch-role'),
    path('toggle-gps/', views.toggle_gps_tracking, name='toggle-gps'),
    
    # Admin
    path('admin/stats/', views.admin_stats, name='admin-stats'),
    path('admin/activity/', views.admin_recent_activity, name='admin-activity'),
]
