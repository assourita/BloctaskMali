import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, combineLatest, map, filter } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService, User } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
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
    <aside class="sidebar" [class.open]="sidebarService.isOpen" *ngIf="viewModel$ | async as vm">
      <div class="user-info">
        <mat-icon class="user-avatar-icon">account_circle</mat-icon>
        <div class="user-details">
          <span class="user-name">{{ vm.user.first_name }} {{ vm.user.last_name }}</span>
          <span class="user-type">{{ getRoleLabel(vm.activeRole) }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <nav class="nav-menu">
        <ng-container *ngFor="let group of getNavGroups(vm.activeRole)">
          <div class="nav-group-label" *ngIf="group.label">{{ group.label }}</div>
          <a
            *ngFor="let item of group.items"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: !!item.exact }"
            class="nav-item"
            (click)="onNavClick()"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </ng-container>
      </nav>

      <mat-divider></mat-divider>

      <div class="sidebar-footer">
        <a routerLink="/" class="nav-item home-btn" target="_self">
          <mat-icon>home</mat-icon>
          <span class="nav-label">Page d'accueil</span>
        </a>
        <a routerLink="/help" class="nav-item">
          <mat-icon>help</mat-icon>
          <span class="nav-label">Aide & Support</span>
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
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      overflow: hidden;
      box-sizing: border-box;
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .user-info {
      padding: 20px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      flex-shrink: 0;
      min-width: 0;
    }

    .user-avatar-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #3CB371;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-type {
      font-size: 0.7rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      margin-top: 2px;
    }

    .nav-menu {
      flex: 1;
      padding: 12px 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
    }

    .nav-group-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
      padding: 12px 12px 6px;
    }

    .nav-menu::-webkit-scrollbar {
      width: 6px;
    }

    .nav-menu::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #475569;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      min-width: 0;
      box-sizing: border-box;
    }

    .nav-label {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-item:hover {
      background: #f1f5f9;
      color: #15803d;
    }

    .nav-item.active {
      background: #16a34a;
      color: white;
      font-weight: 600;
    }

    .nav-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      line-height: 20px;
    }

    .sidebar-footer {
      padding: 12px 10px;
      border-top: 1px solid #e9ecef;
      flex-shrink: 0;
    }

    .sidebar-footer .home-btn {
      color: #15803d;
      font-weight: 600;
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      margin-bottom: 4px;
    }

    .sidebar-footer .home-btn:hover {
      background: #16a34a;
      color: white;
      border-color: #16a34a;
    }

    @media (max-width: 768px) {
      .sidebar {
        top: 56px;
        width: min(86vw, 300px);
        z-index: 200;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.18);
      }

      .nav-item {
        min-height: 44px;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  viewModel$: Observable<{ user: User; activeRole: string }>;

  private clientGroups: NavGroup[] = [
    {
      items: [
        { path: '/client/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
        { path: '/client/missions', label: 'Mes missions créées', icon: 'assignment' },
        { path: '/client/missions/create', label: 'Nouvelle mission', icon: 'add_circle' },
        { path: '/client/providers', label: 'Attribuer une mission', icon: 'assignment_ind' },
        { path: '/client/solicitations', label: 'Sollicitations envoyées', icon: 'send' },
        { path: '/client/tracking', label: 'Suivi en temps réel', icon: 'my_location' },
        { path: '/client/payments', label: 'Paiements', icon: 'payment' },
        { path: '/client/disputes', label: 'Litiges', icon: 'gavel' },
        { path: '/client/profile', label: 'Mon profil', icon: 'person' },
      ],
    },
  ];

  private providerGroups: NavGroup[] = [
    {
      items: [
        { path: '/provider/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
        { path: '/provider/missions', label: 'Mes missions assignées', icon: 'assignment' },
        { path: '/provider/missions/solicitations', label: 'Mes sollicitations', icon: 'mail' },
        { path: '/provider/missions/available', label: 'Missions disponibles', icon: 'search' },
        { path: '/provider/tracking', label: 'Suivi GPS', icon: 'my_location' },
        { path: '/provider/earnings', label: 'Mes revenus', icon: 'attach_money' },
        { path: '/provider/reputation', label: 'Réputation', icon: 'verified' },
        { path: '/provider/deposit', label: 'Caution', icon: 'security' },
        { path: '/provider/profile', label: 'Mon profil', icon: 'person' },
      ],
    },
  ];

  private enterpriseGroups: NavGroup[] = [
    {
      items: [
        { path: '/enterprise/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
        { path: '/enterprise/employees', label: 'Employés', icon: 'people' },
        { path: '/enterprise/missions', label: 'Missions', icon: 'assignment' },
        { path: '/enterprise/missions/available', label: 'Missions disponibles', icon: 'search' },
        { path: '/enterprise/solicitations', label: 'Sollicitations reçues', icon: 'mail' },
        { path: '/enterprise/providers', label: 'Attribuer mission', icon: 'assignment_ind' },
        { path: '/enterprise/tracking', label: 'Carte GPS', icon: 'my_location' },
        { path: '/enterprise/analytics', label: 'Analytics', icon: 'analytics' },
        { path: '/enterprise/finances', label: 'Finances', icon: 'account_balance' },
        { path: '/enterprise/deposit', label: 'Caution', icon: 'security' },
        { path: '/enterprise/payments', label: 'Paiements', icon: 'payment' },
        { path: '/enterprise/disputes', label: 'Litiges', icon: 'gavel' },
        { path: '/enterprise/profile', label: 'Mon entreprise', icon: 'business' },
      ],
    },
  ];

  private adminGroups: NavGroup[] = [
    {
      label: 'Vue d\'ensemble',
      items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
      ],
    },
    {
      label: 'Opérations',
      items: [
        { path: '/admin/users', label: 'Utilisateurs', icon: 'people' },
        { path: '/admin/kyc', label: 'Validation KYC', icon: 'verified_user' },
        { path: '/admin/missions', label: 'Missions', icon: 'assignment' },
        { path: '/admin/disputes', label: 'Litiges', icon: 'gavel' },
        { path: '/admin/enterprises', label: 'Entreprises', icon: 'business' },
      ],
    },
    {
      label: 'Contenu & finance',
      items: [
        { path: '/admin/categories', label: 'Catégories', icon: 'category' },
        { path: '/admin/blockchain', label: 'Escrow & blockchain', icon: 'account_balance_wallet' },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { path: '/admin/settings', label: 'Paramètres', icon: 'settings' },
        { path: '/admin/profile', label: 'Mon profil', icon: 'person' },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    public sidebarService: SidebarService,
  ) {
    this.viewModel$ = combineLatest([
      this.authService.currentUser$,
      this.authService.activeRole$,
    ]).pipe(
      map(([user, activeRole]) => user ? {
        user,
        activeRole: activeRole || user.active_role || user.user_type || 'client',
      } : null),
      filter((vm): vm is { user: User; activeRole: string } => vm !== null),
    );
  }

  ngOnInit(): void {}

  onNavClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarService.setOpen(false);
    }
  }

  getNavGroups(userType: string): NavGroup[] {
    switch (userType) {
      case 'client': return this.clientGroups;
      case 'provider': return this.providerGroups;
      case 'enterprise': return this.enterpriseGroups;
      case 'admin': return this.adminGroups;
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
