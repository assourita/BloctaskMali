import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  EnterpriseInvite,
  ProviderEnterpriseMembership,
} from '../../../core/services/enterprise.service';

@Component({
  selector: 'app-provider-enterprises',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1><mat-icon>business</mat-icon> Mes entreprises</h1>
          <p>Acceptez les invitations et consultez les entreprises auxquelles vous êtes lié.</p>
        </div>
        <a mat-stroked-button routerLink="/provider/missions">
          <mat-icon>assignment</mat-icon> Mes missions
        </a>
      </div>

      <mat-card *ngFor="let inv of pendingInvites" class="invite-banner">
        <div class="invite-banner-content">
          <mat-icon>mail_outline</mat-icon>
          <div>
            <strong>{{ inv.enterprise_name }}</strong> vous invite à rejoindre son équipe
            <span class="invite-meta" *ngIf="inv.position"> · {{ inv.position }}</span>
            <span class="invite-meta" *ngIf="inv.message"> — « {{ inv.message }} »</span>
          </div>
        </div>
        <div class="invite-actions">
          <button mat-raised-button class="accept-btn" (click)="acceptInvite(inv)" [disabled]="actionId === inv.id">
            Accepter
          </button>
          <button mat-stroked-button color="warn" (click)="rejectInvite(inv)" [disabled]="actionId === inv.id">
            Refuser
          </button>
        </div>
      </mat-card>

      <p class="hint">
        <mat-icon>info</mat-icon>
        Les missions assignées via une entreprise apparaissent dans <strong>Mes missions assignées</strong>.
      </p>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="enterprise-card" *ngFor="let m of memberships">
          <div class="enterprise-info">
            <div class="logo"><mat-icon>domain</mat-icon></div>
            <div>
              <h3>{{ m.enterprise_name }}</h3>
              <p>{{ m.position || m.role }} · {{ m.is_active ? 'Actif' : 'Inactif' }}</p>
              <span class="hired-at" *ngIf="m.hired_at">Membre depuis {{ m.hired_at | date:'mediumDate' }}</span>
            </div>
          </div>
          <mat-chip [class]="m.is_active ? 'active-chip' : 'inactive-chip'">
            {{ m.is_active ? 'Lié' : 'Inactif' }}
          </mat-chip>
        </mat-card>

        <p class="empty" *ngIf="!memberships.length && !pendingInvites.length">
          Aucune entreprise liée pour le moment.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 920px;
      margin: 0 auto;
      padding: 24px;
      padding-bottom: 48px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }

    .page-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    .invite-banner {
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      border-left: 4px solid #16a34a;
      background: #f0fdf4;
    }

    .invite-banner-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 200px;
    }

    .invite-banner-content mat-icon { color: #16a34a; margin-top: 2px; }
    .invite-meta { font-size: 13px; color: #6b7280; }
    .invite-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .accept-btn { background: #16a34a !important; color: #fff !important; }

    .hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: #f8fafc;
      color: #475569;
      font-size: 13px;
    }

    .hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #16a34a; }

    .loading { display: flex; justify-content: center; padding: 40px; }

    .list { display: flex; flex-direction: column; gap: 10px; }

    .enterprise-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .enterprise-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .logo {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #ecfdf3;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .enterprise-info h3 {
      margin: 0 0 2px;
      font-size: 15px;
      color: #0f172a;
    }

    .enterprise-info p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .hired-at {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      color: #94a3b8;
    }

    .active-chip { background: #dcfce7 !important; color: #166534 !important; }
    .inactive-chip { background: #f1f5f9 !important; color: #64748b !important; }

    .empty {
      text-align: center;
      color: #94a3b8;
      padding: 36px 12px;
    }
  `],
})
export class ProviderEnterprisesComponent implements OnInit {
  pendingInvites: EnterpriseInvite[] = [];
  memberships: ProviderEnterpriseMembership[] = [];
  loading = true;
  actionId: string | null = null;

  constructor(
    private enterpriseService: EnterpriseService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getMyEnterpriseInvites().subscribe({
      next: (invites) => {
        this.pendingInvites = invites.filter((i) => i.status === 'pending');
      },
    });
    this.enterpriseService.getMyEnterprises().subscribe({
      next: (memberships) => {
        this.memberships = memberships;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  acceptInvite(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.acceptEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.snackBar.open(`Vous avez rejoint ${inv.enterprise_name}`, 'Fermer', { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur acceptation', 'Fermer', { duration: 4000 });
      },
    });
  }

  rejectInvite(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.rejectEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.snackBar.open('Invitation refusée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }
}
