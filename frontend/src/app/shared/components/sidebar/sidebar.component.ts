import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService, User } from '../../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <aside class="sidebar" *ngIf="currentUser$ | async as user">
      <div class="user-info">
        <mat-icon class="user-avatar-icon">account_circle</mat-icon>
        <div class="user-details">
          <span class="user-name">{{ user.first_name }} {{ user.last_name }}</span>
          <span class="user-type">{{ getRoleLabel(user.user_type) }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <nav class="nav-menu">
        <a 
          *ngFor="let item of getNavItems(user.user_type)" 
          [routerLink]="item.path"
          routerLinkActive="active"
          class="nav-item"
        >
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <mat-divider></mat-divider>

      <div class="sidebar-footer">
        <a routerLink="/" class="nav-item home-btn" target="_self">
          <mat-icon>home</mat-icon>
          <span>Page d'accueil</span>
        </a>
        <a routerLink="/help" class="nav-item">
          <mat-icon>help</mat-icon>
          <span>Aide & Support</span>
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      left: 0;
      top: 64px;
      bottom: 0;
      width: 280px;
      background: white;
      display: flex;
      flex-direction: column;
      z-index: 100;
      box-shadow: 1px 0 3px rgba(0,0,0,0.1);
      border-right: 1px solid #e9ecef;
    }

    .user-info {
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .user-avatar-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3CB371;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 1rem;
    }

    .user-type {
      font-size: 0.75rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      margin-top: 4px;
    }

    .nav-menu {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      overflow-x: hidden;
      max-height: calc(100vh - 250px);
    }

    .nav-menu::-webkit-scrollbar {
      width: 6px;
    }

    .nav-menu::-webkit-scrollbar-track {
      background: transparent;
    }

    .nav-menu::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .nav-menu::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      color: #6c757d;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9375rem;
    }

    .nav-item:hover {
      background: #f8f9fa;
      color: #3CB371;
    }

    .nav-item.active {
      background: #3CB371;
      color: white;
      font-weight: 600;
    }

    .nav-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid #e9ecef;
    }

    .sidebar-footer .nav-item {
      color: #6c757d;
    }

    .sidebar-footer .nav-item:hover {
      color: #3CB371;
    }

    .sidebar-footer .home-btn {
      color: #3CB371;
      font-weight: 600;
      border: 1px solid #d4edda;
      background: #f0faf4;
      margin-bottom: 4px;
    }

    .sidebar-footer .home-btn:hover {
      background: #3CB371;
      color: white;
      border-color: #3CB371;
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .sidebar.open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  currentUser$: Observable<User | null>;

  private clientNav: NavItem[] = [
    { path: '/client/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { path: '/client/missions', label: 'Mes missions', icon: 'assignment' },
    { path: '/client/missions/create', label: 'Nouvelle mission', icon: 'add_circle' },
    { path: '/client/tracking', label: 'Suivi en temps réel', icon: 'my_location' },
    { path: '/client/payments', label: 'Paiements', icon: 'payment' },
    { path: '/client/disputes', label: 'Litiges', icon: 'gavel' },
    { path: '/client/profile', label: 'Mon profil', icon: 'person' }
  ];

  private providerNav: NavItem[] = [
    { path: '/provider/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { path: '/provider/missions', label: 'Mes missions', icon: 'assignment' },
    { path: '/provider/missions/available', label: 'Missions disponibles', icon: 'search' },
    { path: '/provider/tracking', label: 'Suivi GPS', icon: 'my_location' },
    { path: '/provider/earnings', label: 'Mes revenus', icon: 'attach_money' },
    { path: '/provider/reputation', label: 'Réputation', icon: 'verified' },
    { path: '/provider/deposit', label: 'Caution', icon: 'security' },
    { path: '/provider/profile', label: 'Mon profil', icon: 'person' }
  ];

  private enterpriseNav: NavItem[] = [
    { path: '/enterprise/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { path: '/enterprise/employees', label: 'Mes employés', icon: 'people' },
    { path: '/enterprise/missions', label: 'Missions', icon: 'assignment' },
    { path: '/enterprise/tracking', label: 'Carte GPS', icon: 'my_location' },
    { path: '/enterprise/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/enterprise/finances', label: 'Finances', icon: 'account_balance' },
    { path: '/enterprise/disputes', label: 'Litiges', icon: 'gavel' }
  ];

  private adminNav: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/users', label: 'Utilisateurs', icon: 'people' },
    { path: '/admin/missions', label: 'Missions', icon: 'assignment' },
    { path: '/admin/disputes', label: 'Litiges', icon: 'gavel' },
    { path: '/admin/kyc', label: 'Validation KYC', icon: 'verified_user' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/admin/blockchain', label: 'Blockchain', icon: 'link' },
    { path: '/admin/settings', label: 'Paramètres', icon: 'settings' }
  ];

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  getNavItems(userType: string): NavItem[] {
    switch (userType) {
      case 'client': return this.clientNav;
      case 'provider': return this.providerNav;
      case 'enterprise': return this.enterpriseNav;
      case 'admin': return this.adminNav;
      default: return [];
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      client: 'Client',
      provider: 'Prestataire',
      enterprise: 'Entreprise',
      admin: 'Administrateur'
    };
    return labels[role] || role;
  }
}
