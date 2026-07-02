import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-enterprise-missions-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="nav-bar">
      <div class="tab-group">
        <a
          class="tab"
          routerLink="/enterprise/missions/available"
          [class.active]="activeTab === 'available'"
        >
          <mat-icon>search</mat-icon>
          Missions disponibles
        </a>
        <a
          class="tab"
          routerLink="/enterprise/missions"
          [queryParams]="{ tab: 'ordered' }"
          [class.active]="activeTab === 'ordered'"
        >
          <mat-icon>shopping_cart</mat-icon>
          Missions commandées
        </a>
        <a
          class="tab"
          routerLink="/enterprise/missions"
          [queryParams]="{ tab: 'received' }"
          [class.active]="activeTab === 'received'"
        >
          <mat-icon>business_center</mat-icon>
          Missions reçues
        </a>
      </div>
      <div class="nav-actions">
        <a mat-flat-button color="primary" routerLink="/enterprise/missions/create" class="create-btn">
          <mat-icon>add</mat-icon>
          Nouvelle mission
        </a>
        <button mat-stroked-button type="button" *ngIf="showRefresh" (click)="refresh.emit()">
          <mat-icon>refresh</mat-icon>
          Actualiser
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nav-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 24px;
      padding: 6px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .tab-group {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-decoration: none;
      transition: all 0.2s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #f3f4f6; color: #374151; }
      &.active {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        color: #047857;
        box-shadow: inset 0 0 0 1px #6ee7b7;
      }
    }
    .nav-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .create-btn { border-radius: 10px !important; }
    @media (max-width: 640px) {
      .nav-bar { flex-direction: column; align-items: stretch; }
      .tab-group { width: 100%; }
      .tab { flex: 1; justify-content: center; }
      .nav-actions { width: 100%; }
      .create-btn { flex: 1; }
    }
  `],
})
export class EnterpriseMissionsNavComponent {
  @Input() showRefresh = false;
  @Output() refresh = new EventEmitter<void>();

  constructor(private router: Router) {}

  get activeTab(): 'ordered' | 'received' | 'create' | 'available' {
    const url = this.router.url;
    if (url.includes('/missions/create')) return 'create';
    if (url.includes('/missions/available')) return 'available';
    if (url.includes('tab=received')) return 'received';
    return 'ordered';
  }
}
