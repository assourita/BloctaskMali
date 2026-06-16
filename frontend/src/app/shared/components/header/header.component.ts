import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';
import { Web3Service, WalletInfo } from '../../../core/services/web3.service';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <mat-toolbar class="header-toolbar" *ngIf="currentUser$ | async as user">

      <!-- Logo → dashboard utilisateur connecté -->
      <a [routerLink]="['/', user.user_type, 'dashboard']" class="logo">
        <span class="logo-icon">⛓️</span>
        <span class="logo-text">BlockTask</span>
      </a>

      <span class="spacer"></span>

      <div class="actions-section">

        <!-- Wallet -->
        <button class="wallet-btn" (click)="connectWallet()" *ngIf="!(wallet$ | async)">
          <mat-icon>account_balance_wallet</mat-icon>
          <span>Connecter Wallet</span>
        </button>

        <button class="wallet-connected" (click)="disconnectWallet()" *ngIf="wallet$ | async as wallet"
                [title]="wallet.address">
          <mat-icon>account_balance_wallet</mat-icon>
          <span class="wallet-addr">{{ wallet.address | slice:0:6 }}...{{ wallet.address | slice:-4 }}</span>
          <mat-icon class="disconnect-icon">close</mat-icon>
        </button>

        <!-- Notifications -->
        <div class="dropdown-wrap">
          <button class="icon-btn notif-btn" (click)="toggleNotif($event)">
            <mat-icon>notifications</mat-icon>
            <span class="badge-dot" *ngIf="notifCount > 0">{{notifCount}}</span>
          </button>
          <div class="dropdown-panel notif-panel" *ngIf="notifOpen" (click)="$event.stopPropagation()">
            <div class="dp-header">
              <span>Notifications</span>
            </div>
            <div class="dp-empty">
              <mat-icon>notifications_none</mat-icon>
              <span>Aucune notification</span>
            </div>
          </div>
        </div>

        <!-- Profil avatar -->
        <div class="dropdown-wrap">
          <button class="avatar-btn" (click)="toggleProfile($event)">
            <img *ngIf="user.profile_picture; else initials"
                 [src]="user.profile_picture" class="avatar-img" [alt]="user.first_name" />
            <ng-template #initials>
              <div class="avatar-initials">
                {{ ((user.first_name[0] || '') + (user.last_name[0] || '')) | uppercase }}
              </div>
            </ng-template>
          </button>

          <!-- Dropdown profil custom -->
          <div class="dropdown-panel profile-panel" *ngIf="profileOpen" (click)="$event.stopPropagation()">
            <!-- Info utilisateur -->
            <div class="dp-user-info">
              <div class="dp-avatar">
                {{ ((user.first_name[0] || '') + (user.last_name[0] || '')) | uppercase }}
              </div>
              <div class="dp-user-text">
                <div class="dp-name">{{ user.first_name }} {{ user.last_name }}</div>
                <div class="dp-role">{{ getRoleLabel(user.user_type) }}</div>
                <div class="dp-email">{{ user.email }}</div>
              </div>
            </div>
            <div class="dp-divider"></div>

            <!-- Actions -->
            <a class="dp-item" [routerLink]="['/', (user.active_role || user.user_type), 'profile']" (click)="closeDropdowns()">
              <mat-icon>manage_accounts</mat-icon>
              <span>Mon Profil</span>
            </a>
            <a class="dp-item" [routerLink]="['/', (user.active_role || user.user_type), 'dashboard']" (click)="closeDropdowns()">
              <mat-icon>dashboard</mat-icon>
              <span>Tableau de bord</span>
            </a>
            <a class="dp-item" [routerLink]="['/admin/settings']" (click)="closeDropdowns()" *ngIf="user.user_type === 'admin'">
              <mat-icon>settings</mat-icon>
              <span>Paramètres</span>
            </a>

            <!-- Switch espace si rôle secondaire disponible -->
            <div *ngIf="user.secondary_role">
              <div class="dp-divider"></div>
              <div class="dp-switch-label">Changer d'espace</div>
              <button class="dp-item dp-switch"
                *ngIf="(user.active_role || user.user_type) !== user.user_type"
                (click)="switchRole(user.user_type); closeDropdowns()">
                <mat-icon>swap_horiz</mat-icon>
                <span>Espace {{ getRoleLabel(user.user_type) }}</span>
                <span class="dp-primary-badge">Principal</span>
              </button>
              <button class="dp-item dp-switch"
                *ngIf="(user.active_role || user.user_type) !== user.secondary_role"
                (click)="switchRole(user.secondary_role!); closeDropdowns()">
                <mat-icon>swap_horiz</mat-icon>
                <span>Espace {{ getRoleLabel(user.secondary_role!) }}</span>
              </button>
            </div>

            <div class="dp-divider"></div>
            <button class="dp-item dp-logout" (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

      </div>
    </mat-toolbar>
  `,
  styles: [`
    .header-toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 1000;
      background: #fff;
      color: #1a1a1a;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      height: 64px;
      padding: 0 24px;
      display: flex;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #3CB371;
      font-weight: 700;
      font-size: 1.4rem;
      letter-spacing: -0.5px;
      transition: opacity 0.2s;
    }
    .logo:hover { opacity: 0.85; }
    .logo-icon { font-size: 1.5rem; }

    .spacer { flex: 1; }

    .actions-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Wallet button - non connecté */
    .wallet-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #3CB371;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .wallet-btn:hover {
      background: #2ea361;
      box-shadow: 0 4px 12px rgba(60,179,113,0.3);
      transform: translateY(-1px);
    }

    /* Wallet connecté */
    .wallet-connected {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      background: #f0faf4;
      color: #2e7d32;
      border: 1px solid #a5d6a7;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }
    .wallet-connected:hover {
      background: #ffebee;
      color: #c62828;
      border-color: #ef9a9a;
    }
    .wallet-addr { font-family: monospace; }
    .disconnect-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; opacity: 0.6; }

    /* ===== Dropdown wrapper ===== */
    .dropdown-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* ===== Icône cloche ===== */
    .icon-btn {
      width: 40px; height: 40px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #555;
      position: relative;
      transition: background 0.15s;
      mat-icon { font-size: 22px; }
    }
    .icon-btn:hover { background: #f5f5f5; }

    .badge-dot {
      position: absolute;
      top: 4px; right: 4px;
      background: #e53935;
      color: #fff;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      min-width: 16px;
      text-align: center;
    }

    /* ===== Avatar ===== */
    .avatar-btn {
      width: 40px; height: 40px;
      border-radius: 50%;
      border: 2px solid #e0e0e0;
      padding: 0;
      cursor: pointer;
      overflow: hidden;
      background: transparent;
      transition: border-color 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-btn:hover { border-color: #3CB371; }
    .avatar-img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; display: block; }
    .avatar-initials {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: #3CB371;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
    }

    /* ===== Dropdown panel ===== */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.16);
      z-index: 9999;
      overflow: hidden;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .profile-panel { min-width: 270px; }
    .notif-panel   { min-width: 300px; }

    /* Info utilisateur */
    .dp-user-info {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 18px;
      background: #f9fafb;
    }
    .dp-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: #3CB371; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; flex-shrink: 0;
    }
    .dp-name  { font-weight: 700; font-size: 14px; color: #1a1a1a; }
    .dp-role  { font-size: 11px; color: #3CB371; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .dp-email { font-size: 12px; color: #999; margin-top: 2px; }

    .dp-divider { height: 1px; background: #f0f0f0; margin: 4px 0; }

    /* Items */
    .dp-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 18px;
      font-size: 14px; font-weight: 500; color: #333;
      text-decoration: none;
      background: transparent; border: none; cursor: pointer;
      width: 100%; text-align: left;
      transition: background 0.15s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #666; }
    }
    .dp-item:hover { background: #f0faf4; color: #2e7d32; mat-icon { color: #3CB371; } }

    .dp-logout { color: #e53935; mat-icon { color: #e53935; } }
    .dp-logout:hover { background: #ffebee; }

    .dp-switch-label { padding: 6px 18px 2px; font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .dp-switch { color: #6C5CE7; mat-icon { color: #6C5CE7; } }
    .dp-switch:hover { background: #f5f3ff; }
    .dp-primary-badge { margin-left: auto; background: #ede9fe; color: #6C5CE7; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; }

    /* Notif */
    .dp-header {
      padding: 14px 18px;
      font-weight: 700; font-size: 14px; color: #1a1a1a;
      background: #f9fafb;
    }
    .dp-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 28px 18px;
      color: #bbb; font-size: 13px;
      mat-icon { font-size: 34px; width: 34px; height: 34px; color: #ddd; }
    }
  `]
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;
  wallet$: Observable<WalletInfo | null>;
  notifCount = 0;
  profileOpen = false;
  notifOpen = false;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileOpen = false;
    this.notifOpen = false;
  }
  
  constructor(
    private authService: AuthService,
    private web3Service: Web3Service,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.wallet$ = this.web3Service.wallet$;
  }
  
  ngOnInit(): void {}
  
  toggleProfile(e: Event): void {
    e.stopPropagation();
    this.profileOpen = !this.profileOpen;
    this.notifOpen = false;
  }

  toggleNotif(e: Event): void {
    e.stopPropagation();
    this.notifOpen = !this.notifOpen;
    this.profileOpen = false;
  }

  closeDropdowns(): void {
    this.profileOpen = false;
    this.notifOpen = false;
  }

  async connectWallet(): Promise<void> {
    try {
      await this.web3Service.connectWallet();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      alert(error.message || 'Impossible de connecter le wallet');
    }
  }

  disconnectWallet(): void {
    if (confirm('Déconnecter le wallet ?')) {
      this.web3Service.disconnectWallet();
    }
  }
  
  logout(): void {
    this.authService.logout();
  }
  
  switchRole(role: string): void {
    this.authService.switchRole(role).subscribe();
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
