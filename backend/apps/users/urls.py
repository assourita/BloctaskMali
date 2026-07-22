"""
BlockTask Users URLs
"""

from django.urls import path
from . import views
from . import admin_kyc_views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('email/verify/', views.EmailVerifyView.as_view(), name='email-verify'),
    path('email/resend/', views.EmailResendVerificationView.as_view(), name='email-resend'),
    
    # Profile
    path('me/', views.UserProfileView.as_view(), name='user-profile'),
    path('<uuid:id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<uuid:id>/reset-password/', views.AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('', views.UserListView.as_view(), name='user-list'),
    
    # Provider
    path('providers/<uuid:id>/public/', views.provider_public_profile, name='provider-public'),
    path('clients/<uuid:id>/public/', views.client_public_profile, name='client-public'),
    path('enterprises/<uuid:id>/public/', views.enterprise_public_profile, name='enterprise-public'),
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
    path('kyc/verify-phone/', views.PhoneVerificationRequestView.as_view(), name='kyc-verify-phone'),
    path('kyc/confirm-phone/', views.PhoneVerificationConfirmView.as_view(), name='kyc-confirm-phone'),
    
    # Admin KYC Override
    path('kyc/override/<uuid:user_id>/', admin_kyc_views.override_kyc_decision, name='kyc-override'),
    path('kyc/analysis/<uuid:user_id>/', admin_kyc_views.get_kyc_ai_analysis, name='kyc-ai-analysis'),
    path('kyc/ai/toggle/', admin_kyc_views.toggle_ai_kyc, name='kyc-ai-toggle'),
    path('kyc/ai/status/', admin_kyc_views.get_ai_kyc_status, name='kyc-ai-status'),
    
    # Security
    path('password/change/', views.ChangePasswordView.as_view(), name='change-password'),
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('password/reset/validate/', views.PasswordResetValidateView.as_view(), name='password-reset-validate'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('2fa/setup/', views.TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('2fa/confirm/', views.TwoFactorConfirmView.as_view(), name='2fa-confirm'),
    path('2fa/disable/', views.TwoFactorDisableView.as_view(), name='2fa-disable'),
    path('2fa/status/', views.TwoFactorStatusView.as_view(), name='2fa-status'),
    
    # Stats & Actions
    path('stats/', views.get_user_stats, name='user-stats'),
    path('toggle-availability/', views.toggle_availability, name='toggle-availability'),
    path('activate-provider-role/', views.activate_provider_role, name='activate-provider-role'),
    path('switch-role/', views.switch_active_role, name='switch-role'),
    path('toggle-gps/', views.toggle_gps_tracking, name='toggle-gps'),
    
    # Admin
    path('admin/stats/', views.admin_stats, name='admin-stats'),
    path('admin/activity/', views.admin_recent_activity, name='admin-activity'),
    path('admin/enterprises/', views.admin_enterprises_list, name='admin-enterprises'),
    path('admin/enterprises/<uuid:id>/verify/', views.admin_enterprise_verify, name='admin-enterprise-verify'),
]
