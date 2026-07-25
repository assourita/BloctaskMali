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
        <article class="call-card" *ngFor="let call of calls">
          <header class="card-head">
            <div class="avatar" *ngIf="!logoOk(call)">
              {{ initials(call.enterprise_name) }}
            </div>
            <img *ngIf="logoOk(call)"
              class="avatar-img"
              [src]="call.enterprise!.logo!"
              [alt]="call.enterprise_name"
              (error)="onLogoError(call.id)" />
            <div class="head-text">
              <div class="badges">
                <span class="badge open">Ouvert</span>
                <span class="badge muted">{{ roleLabel(call.role) }}</span>
                <span class="badge applied" *ngIf="call.my_application?.status === 'pending'">Déjà postulé</span>
                <span class="badge accepted" *ngIf="call.my_application?.status === 'accepted'">Accepté</span>
                <span class="badge rejected" *ngIf="call.my_application?.status === 'rejected'">Refusé</span>
              </div>
              <h3>{{ call.title }}</h3>
              <p class="ent">
                {{ call.enterprise_name }}
                <span *ngIf="call.city"> · {{ call.city }}</span>
              </p>
            </div>
          </header>

          <div class="card-body">
            <div class="info-row" *ngIf="call.position">
              <mat-icon>badge</mat-icon>
              <span>{{ call.position }}</span>
            </div>
            <p class="desc" *ngIf="call.description">{{ call.description }}</p>
            <div class="req-box" *ngIf="call.requirements">
              <strong>Prérequis</strong>
              <p>{{ call.requirements }}</p>
            </div>
            <p class="meta" *ngIf="call.expires_at">
              <mat-icon>schedule</mat-icon>
              Expire le {{ call.expires_at | date:'medium' }}
            </p>
          </div>

          <footer class="card-foot"
            *ngIf="!call.my_application || call.my_application.status === 'rejected' || call.my_application.status === 'withdrawn'">
            <textarea
              class="field"
              [(ngModel)]="messages[call.id]"
              placeholder="Message de candidature (optionnel)"
              rows="3"></textarea>
            <button mat-raised-button class="accept-btn"
              (click)="apply(call)" [disabled]="actionId === call.id">
              <mat-icon>send</mat-icon>
              {{ actionId === call.id ? 'Envoi…' : 'Postuler' }}
            </button>
          </footer>
        </article>

        <div class="empty" *ngIf="!calls.length">
          <mat-icon>campaign</mat-icon>
          <h3>Aucun appel ouvert</h3>
          <p>Revenez plus tard — les entreprises publient ici leurs besoins d'équipe.</p>
        </div>
      </div>

      <div class="list" *ngIf="!loading && tab === 'mine'">
        <article class="call-card app-card" *ngFor="let app of applications">
          <div class="badges">
            <span class="badge" [ngClass]="app.status">{{ appStatusLabel(app.status) }}</span>
          </div>
          <h3>{{ app.call?.title || 'Appel' }}</h3>
          <p class="ent">{{ app.call?.enterprise_name }}</p>
          <p class="pos">{{ app.call?.position || roleLabel(app.call?.role || '') }}</p>
          <p class="message" *ngIf="app.message">« {{ app.message }} »</p>
          <p class="meta">
            <mat-icon>event</mat-icon>
            Postulé le {{ app.created_at | date:'medium' }}
            <span *ngIf="app.reviewed_at"> · traité {{ app.reviewed_at | date:'medium' }}</span>
          </p>
        </article>

        <div class="empty" *ngIf="!applications.length">
          <mat-icon>inbox</mat-icon>
          <h3>Aucune candidature</h3>
          <p>Parcourez les appels ouverts pour postuler.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 820px; margin: 0 auto; padding: 24px; padding-bottom: 48px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 22px; color: #0f172a; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 520px; line-height: 1.45; }
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .list { display: flex; flex-direction: column; gap: 14px; }

    .call-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .card-head {
      display: flex; gap: 14px; align-items: flex-start;
      padding: 18px 18px 14px;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #f1f5f9;
    }
    .avatar, .avatar-img {
      width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0;
    }
    .avatar {
      background: #16a34a; color: #fff; font-weight: 700; font-size: 15px;
      display: flex; align-items: center; justify-content: center; letter-spacing: 0.02em;
    }
    .avatar-img { object-fit: cover; border: 1px solid #e2e8f0; }
    .head-text { flex: 1; min-width: 0; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
      &.open, &.pending { background: #fef3c7; color: #92400e; }
      &.accepted { background: #dcfce7; color: #166534; }
      &.rejected, &.withdrawn { background: #fee2e2; color: #991b1b; }
      &.muted { background: #eef2ff; color: #3730a3; }
      &.applied { background: #e0f2fe; color: #075985; }
    }
    h3 { margin: 0 0 4px; font-size: 17px; color: #0f172a; line-height: 1.3; }
    .ent { margin: 0; font-size: 13px; font-weight: 600; color: #334155; }
    .pos { margin: 4px 0 0; font-size: 13px; color: #64748b; }

    .card-body { padding: 14px 18px 8px; display: grid; gap: 10px; }
    .info-row {
      display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #16a34a; }
    }
    .desc {
      margin: 0; font-size: 14px; color: #475569; line-height: 1.55; white-space: pre-wrap;
    }
    .req-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;
      strong { display: block; font-size: 12px; color: #334155; margin-bottom: 4px; }
      p { margin: 0; font-size: 13px; color: #64748b; line-height: 1.45; white-space: pre-wrap; }
    }
    .meta {
      margin: 0; display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #94a3b8;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }
    .message { margin: 8px 0 0; font-style: italic; color: #475569; font-size: 13px; }

    .card-foot {
      padding: 12px 18px 18px; display: grid; gap: 10px;
      border-top: 1px solid #f1f5f9; background: #fafafa;
    }
    .field {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font: inherit; width: 100%;
      box-sizing: border-box; background: #fff; resize: vertical; min-height: 72px;
      &:focus { outline: none; border-color: #86efac; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12); }
    }
    .accept-btn {
      background: #16a34a !important; color: #fff !important; justify-self: start;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .app-card { padding: 18px; }

    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
      p { margin: 0; font-size: 14px; }
    }
    @media (max-width: 640px) {
      .page { padding: 16px; }
      .card-head { padding: 14px; }
      .card-body, .card-foot { padding-left: 14px; padding-right: 14px; }
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
  brokenLogos = new Set<string>();

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'E';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  logoOk(call: RecruitmentCall): boolean {
    return !!(call.enterprise?.logo && !this.brokenLogos.has(call.id));
  }

  onLogoError(callId: string): void {
    this.brokenLogos.add(callId);
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
