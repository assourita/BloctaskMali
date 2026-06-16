import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar class="dashboard-header">
      <div class="header-left">
        <button mat-button class="home-btn" routerLink="/">
          <mat-icon>home</mat-icon>
          <span class="logo-text">BlockTask</span>
        </button>
      </div>

      <div class="header-right">
        <!-- Notifications -->
        <button mat-icon-button class="notif-btn">
          <mat-icon>notifications</mat-icon>
        </button>

        <!-- Avatar trigger -->
        <button class="avatar-btn" [matMenuTriggerFor]="profileMenu">
          <ng-container *ngIf="(currentUser$ | async) as user">
            <img *ngIf="user.profile_picture; else initials"
                 [src]="user.profile_picture"
                 class="avatar-img"
                 [alt]="user.first_name" />
            <ng-template #initials>
              <div class="avatar-initials">
                {{ (user.first_name[0] || '') + (user.last_name[0] || '') | uppercase }}
              </div>
            </ng-template>
          </ng-container>
          <ng-container *ngIf="!(currentUser$ | async)">
            <div class="avatar-initials">U</div>
          </ng-container>
        </button>

        <!-- Dropdown menu -->
        <mat-menu #profileMenu="matMenu" class="profile-dropdown" xPosition="before">
          <ng-container *ngIf="(currentUser$ | async) as user">
            <!-- User info header -->
            <div class="profile-info" (click)="$event.stopPropagation()">
              <div class="profile-name">{{ user.first_name }} {{ user.last_name | uppercase }}</div>
              <div class="profile-phone">{{ user.phone_number || user.email }}</div>
            </div>
            <mat-divider></mat-divider>

            <!-- Actions -->
            <button mat-menu-item routerLink="./profile">
              <mat-icon class="menu-icon">manage_accounts</mat-icon>
              <span>Mon Profil</span>
            </button>
            <button mat-menu-item routerLink="./messages">
              <mat-icon class="menu-icon">mail_outline</mat-icon>
              <span>Mes Messages</span>
            </button>

            <mat-divider></mat-divider>

            <!-- Logout -->
            <button mat-menu-item class="logout-item" (click)="logout()">
              <mat-icon class="menu-icon logout-icon">logout</mat-icon>
              <span class="logout-text">Déconnexion</span>
            </button>
          </ng-container>
        </mat-menu>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .dashboard-header {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      height: 64px;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .home-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #3CB371;
      font-weight: 600;
      font-size: 18px;
    }

    .logo-text {
      color: #3CB371;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notif-btn {
      color: #666;
    }

    .avatar-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      padding: 0;
      cursor: pointer;
      overflow: hidden;
      background: transparent;
      transition: opacity 0.2s;
    }

    .avatar-btn:hover {
      opacity: 0.85;
    }

    .avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-initials {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3CB371;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.5px;
    }

    /* Dropdown content */
    .profile-info {
      padding: 16px 20px 14px;
      cursor: default;
      outline: none;
    }

    .profile-name {
      font-weight: 700;
      font-size: 15px;
      color: #1a1a1a;
      line-height: 1.3;
    }

    .profile-phone {
      font-size: 13px;
      color: #888;
      margin-top: 3px;
    }

    .menu-icon {
      margin-right: 12px !important;
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: #555;
    }

    .logout-icon {
      color: #e53935 !important;
    }

    .logout-text {
      color: #e53935;
    }
  `]
})
export class DashboardHeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
