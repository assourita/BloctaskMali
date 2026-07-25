import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  RecruitmentApplication,
  RecruitmentCall,
} from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

type Tab = 'open' | 'mine';

@Component({
  selector: 'app-provider-appels',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1><mat-icon>campaign</mat-icon> Appels à candidature</h1>
          <p>
            Postulez pour rejoindre une entreprise via un appel ouvert.
            Les invitations ciblées restent dans Invitations.
          </p>
        </div>
        <a mat-stroked-button routerLink="/provider/invitations">
          <mat-icon>mail_outline</mat-icon> Invitations
        </a>
      </header>

      <div class="filters">
        <button type="button" [class.active]="tab === 'open'" (click)="setTab('open')">Appels ouverts</button>
        <button type="button" [class.active]="tab === 'mine'" (click)="setTab('mine')">Mes candidatures</button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading && tab === 'open'">
        <mat-card class="call-card" *ngFor="let call of calls">
          <div class="identity">
            <div class="logo" *ngIf="!call.enterprise?.logo"><mat-icon>domain</mat-icon></div>
            <img *ngIf="call.enterprise?.logo" class="logo-img" [src]="call.enterprise!.logo!" [alt]="call.enterprise_name" />
            <div class="body">
              <div class="badges">
                <span class="badge open">Ouvert</span>
                <span class="badge muted">{{ roleLabel(call.role) }}</span>
                <span class="badge applied" *ngIf="call.my_application?.status === 'pending'">Déjà postulé</span>
                <span class="badge accepted" *ngIf="call.my_application?.status === 'accepted'">Accepté</span>
              </div>
              <h3>{{ call.title }}</h3>
              <p class="ent">{{ call.enterprise_name }}<span *ngIf="call.city"> · {{ call.city }}</span></p>
              <p>{{ call.position || roleLabel(call.role) }}</p>
              <p class="desc">{{ call.description }}</p>
              <p class="req" *ngIf="call.requirements"><strong>Prérequis :</strong> {{ call.requirements }}</p>
              <p class="meta" *ngIf="call.expires_at">Expire le {{ call.expires_at | date:'short' }}</p>

              <div class="apply" *ngIf="!call.my_application || call.my_application.status === 'rejected' || call.my_application.status === 'withdrawn'">
                <textarea
                  class="field"
                  [(ngModel)]="messages[call.id]"
                  placeholder="Message de candidature (optionnel)"
                  rows="2"></textarea>
                <button mat-raised-button class="accept-btn"
                  (click)="apply(call)" [disabled]="actionId === call.id">
                  {{ actionId === call.id ? 'Envoi…' : 'Postuler' }}
                </button>
              </div>
            </div>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!calls.length">
          <mat-icon>campaign</mat-icon>
          <h3>Aucun appel ouvert</h3>
          <p>Revenez plus tard — les entreprises publient ici leurs besoins d'équipe.</p>
        </div>
      </div>

      <div class="list" *ngIf="!loading && tab === 'mine'">
        <mat-card class="call-card" *ngFor="let app of applications">
          <div class="badges">
            <span class="badge" [class]="app.status">{{ appStatusLabel(app.status) }}</span>
          </div>
          <h3>{{ app.call?.title || 'Appel' }}</h3>
          <p class="ent">{{ app.call?.enterprise_name }}</p>
          <p>{{ app.call?.position || roleLabel(app.call?.role || '') }}</p>
          <p class="message" *ngIf="app.message">« {{ app.message }} »</p>
          <p class="meta">
            Postulé le {{ app.created_at | date:'short' }}
            <span *ngIf="app.reviewed_at"> · traité {{ app.reviewed_at | date:'short' }}</span>
          </p>
        </mat-card>

        <div class="empty" *ngIf="!applications.length">
          <mat-icon>inbox</mat-icon>
          <h3>Aucune candidature</h3>
          <p>Parcourez les appels ouverts pour postuler.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 920px; margin: 0 auto; padding: 24px; padding-bottom: 48px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 520px; }
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .call-card { padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .identity { display: flex; gap: 12px; }
    .logo, .logo-img { width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0; }
    .logo {
      background: #ecfdf3; color: #16a34a; display: flex; align-items: center; justify-content: center;
    }
    .logo-img { object-fit: cover; }
    .body { flex: 1; min-width: 0; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.open, &.pending { background: #fef3c7; color: #92400e; }
      &.accepted { background: #dcfce7; color: #166534; }
      &.rejected, &.withdrawn { background: #fee2e2; color: #991b1b; }
      &.muted { background: #eef2ff; color: #3730a3; }
      &.applied { background: #e0f2fe; color: #075985; }
    }
    h3 { margin: 0 0 2px; font-size: 16px; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .ent { font-weight: 600; color: #334155 !important; margin-bottom: 2px !important; }
    .desc { margin-top: 8px !important; color: #475569 !important; white-space: pre-wrap; }
    .req { margin-top: 6px !important; }
    .meta { margin-top: 4px !important; font-size: 12px !important; color: #94a3b8 !important; }
    .message { margin-top: 6px !important; font-style: italic; color: #475569 !important; }
    .apply { margin-top: 12px; display: grid; gap: 8px; }
    .field {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font: inherit; width: 100%;
      box-sizing: border-box;
    }
    .accept-btn { background: #16a34a !important; color: #fff !important; justify-self: start; }
    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
    }
  `],
})
export class ProviderAppelsComponent implements OnInit {
  tab: Tab = 'open';
  calls: RecruitmentCall[] = [];
  applications: RecruitmentApplication[] = [];
  loading = true;
  actionId: string | null = null;
  messages: Record<string, string> = {};

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  appStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      rejected: 'Refusée',
      withdrawn: 'Retirée',
    };
    return map[status] || status;
  }

  setTab(tab: Tab): void {
    this.tab = tab;
    this.load();
  }

  load(): void {
    this.loading = true;
    if (this.tab === 'open') {
      this.enterpriseService.listOpenRecruitmentCalls().subscribe({
        next: (list) => {
          this.calls = list || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Erreur chargement des appels', 'Fermer', { duration: 3000 });
        },
      });
      return;
    }
    this.enterpriseService.getMyRecruitmentApplications().subscribe({
      next: (list) => {
        this.applications = list || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur chargement candidatures', 'Fermer', { duration: 3000 });
      },
    });
  }

  apply(call: RecruitmentCall): void {
    this.actionId = call.id;
    this.enterpriseService.applyToRecruitmentCall(call.id, this.messages[call.id] || '').subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Candidature envoyée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snack.open(err.error?.error || err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }
}
