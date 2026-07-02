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
    <nav class="missions-nav">
      <a
        mat-stroked-button
        routerLink="/enterprise/missions"
        [queryParams]="{ tab: 'ordered' }"
        [class.active]="activeTab === 'ordered'"
      >
        Missions commandées
      </a>
      <a
        mat-stroked-button
        routerLink="/enterprise/missions"
        [queryParams]="{ tab: 'received' }"
        [class.active]="activeTab === 'received'"
      >
        Missions reçues (prestataire)
      </a>
      <a
        mat-stroked-button
        routerLink="/enterprise/missions/create"
        [class.active]="activeTab === 'create'"
      >
        <mat-icon>add</mat-icon>
        Nouvelle mission
      </a>
      <button mat-stroked-button type="button" *ngIf="showRefresh" (click)="refresh.emit()">
        <mat-icon>refresh</mat-icon>
        Actualiser
      </button>
    </nav>
  `,
  styles: [`
    .missions-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    a.active, a.active mat-icon {
      border-color: var(--mat-sys-primary, #2e7d32);
      color: var(--mat-sys-primary, #2e7d32);
    }
  `],
})
export class EnterpriseMissionsNavComponent {
  @Input() showRefresh = false;
  @Output() refresh = new EventEmitter<void>();

  constructor(private router: Router) {}

  get activeTab(): 'ordered' | 'received' | 'create' {
    const url = this.router.url;
    if (url.includes('/missions/create')) return 'create';
    if (url.includes('tab=received')) return 'received';
    return 'ordered';
  }
}
