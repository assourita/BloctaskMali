import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { ProfileCompleteGuard } from './core/guards/profile-complete.guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'wallet-connect',
    loadComponent: () => import('./features/auth/wallet-connect/wallet-connect.component').then(m => m.WalletConnectComponent)
  },
  {
    path: 'help',
    loadComponent: () => import('./features/help/help.component').then(m => m.HelpComponent)
  },
  {
    path: 'providers/:id',
    loadComponent: () => import('./features/providers/provider-public-profile/provider-public-profile.component').then(m => m.ProviderPublicProfileComponent)
  },
  
  // Client routes
  {
    path: 'client',
    canActivate: [AuthGuard, RoleGuard],
    canActivateChild: [ProfileCompleteGuard],
    data: { roles: ['client'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/client/dashboard/dashboard.component').then(m => m.ClientDashboardComponent)
      },
      {
        path: 'missions',
        loadComponent: () => import('./features/client/missions/missions.component').then(m => m.ClientMissionsComponent)
      },
      {
        path: 'missions/create',
        loadComponent: () => import('./features/client/missions/create-mission/create-mission.component').then(m => m.CreateMissionComponent)
      },
      {
        path: 'providers',
        loadComponent: () => import('./features/client/providers/assign-provider.component').then(m => m.ClientAssignProviderComponent)
      },
      {
        path: 'solicitations',
        loadComponent: () => import('./features/client/solicitations/sent-solicitations.component').then(m => m.ClientSentSolicitationsComponent)
      },
      {
        path: 'missions/:id',
        loadComponent: () => import('./features/client/missions/mission-detail/mission-detail.component').then(m => m.MissionDetailComponent)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/client/tracking/tracking.component').then(m => m.ClientTrackingComponent)
      },
      {
        path: 'payments',
        loadComponent: () => import('./features/client/payments/payments.component').then(m => m.ClientPaymentsComponent)
      },
      {
        path: 'disputes',
        loadComponent: () => import('./features/client/disputes/disputes.component').then(m => m.ClientDisputesComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/client/profile/profile.component').then(m => m.ClientProfileComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Provider routes
  {
    path: 'provider',
    canActivate: [AuthGuard, RoleGuard],
    canActivateChild: [ProfileCompleteGuard],
    data: { roles: ['provider'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/provider/dashboard/dashboard.component').then(m => m.ProviderDashboardComponent)
      },
      {
        path: 'missions/available',
        loadComponent: () => import('./features/provider/missions/available-missions/available-missions.component').then(m => m.AvailableMissionsComponent)
      },
      {
        path: 'missions/solicitations',
        loadComponent: () => import('./features/provider/missions/solicitations/solicitations.component').then(m => m.ProviderSolicitationsComponent)
      },
      {
        path: 'missions/solicitations/:id',
        loadComponent: () => import('./features/solicitations/solicitation-detail/solicitation-detail.component').then(m => m.SolicitationDetailComponent),
        data: { scope: 'provider' },
      },
      {
        path: 'missions/:id',
        loadComponent: () => import('./features/provider/missions/mission-detail/mission-detail.component').then(m => m.ProviderMissionDetailComponent)
      },
      {
        path: 'missions',
        loadComponent: () => import('./features/provider/missions/missions.component').then(m => m.ProviderMissionsComponent)
      },
      {
        path: 'earnings',
        loadComponent: () => import('./features/provider/earnings/earnings.component').then(m => m.ProviderEarningsComponent)
      },
      {
        path: 'reputation',
        loadComponent: () => import('./features/provider/reputation/reputation.component').then(m => m.ProviderReputationComponent)
      },
      {
        path: 'deposit',
        loadComponent: () => import('./features/provider/deposit/deposit.component').then(m => m.ProviderDepositComponent)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/provider/tracking/tracking.component').then(m => m.ProviderTrackingComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/provider/profile/profile.component').then(m => m.ProviderProfileComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Enterprise routes
  {
    path: 'enterprise',
    canActivate: [AuthGuard, RoleGuard],
    canActivateChild: [ProfileCompleteGuard],
    data: { roles: ['enterprise'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/enterprise/dashboard/dashboard.component').then(m => m.EnterpriseDashboardComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./features/enterprise/employees/employees.component').then(m => m.EnterpriseEmployeesComponent)
      },
      {
        path: 'missions',
        loadComponent: () => import('./features/enterprise/missions/missions.component').then(m => m.EnterpriseMissionsComponent)
      },
      {
        path: 'solicitations',
        loadComponent: () => import('./features/enterprise/solicitations/solicitations.component').then(m => m.EnterpriseSolicitationsComponent)
      },
      {
        path: 'solicitations/:id',
        loadComponent: () => import('./features/solicitations/solicitation-detail/solicitation-detail.component').then(m => m.SolicitationDetailComponent),
        data: { scope: 'enterprise' },
      },
      {
        path: 'missions/create',
        loadComponent: () => import('./features/client/missions/create-mission/create-mission.component').then(m => m.CreateMissionComponent)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/enterprise/tracking/tracking.component').then(m => m.EnterpriseTrackingComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/enterprise/analytics/analytics.component').then(m => m.EnterpriseAnalyticsComponent)
      },
      {
        path: 'finances',
        loadComponent: () => import('./features/enterprise/finances/finances.component').then(m => m.EnterpriseFinancesComponent)
      },
      {
        path: 'disputes',
        loadComponent: () => import('./features/enterprise/disputes/disputes.component').then(m => m.EnterpriseDisputesComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/enterprise/profile/profile.component').then(m => m.EnterpriseProfileComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Admin routes
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'missions',
        loadComponent: () => import('./features/admin/missions/missions.component').then(m => m.AdminMissionsComponent)
      },
      {
        path: 'disputes',
        loadComponent: () => import('./features/admin/disputes/disputes.component').then(m => m.AdminDisputesComponent)
      },
      {
        path: 'kyc',
        loadComponent: () => import('./features/admin/kyc/kyc.component').then(m => m.AdminKycComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/analytics/analytics.component').then(m => m.AdminAnalyticsComponent)
      },
      {
        path: 'blockchain',
        loadComponent: () => import('./features/admin/blockchain/blockchain.component').then(m => m.AdminBlockchainComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/settings/settings.component').then(m => m.AdminSettingsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/admin/profile/profile.component').then(m => m.AdminProfileComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // 404
  { path: '**', redirectTo: '' }
];
