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

type CallFilter = 'open' | 'closed' | 'cancelled' | 'all';

@Component({
  selector: 'app-enterprise-appels',
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
            Publiez un appel ouvert : tous les prestataires peuvent postuler pour rejoindre votre entreprise.
            Distinct des invitations ciblées par email.
          </p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button routerLink="/enterprise/invitations">
            <mat-icon>mail_outline</mat-icon> Invitations
          </a>
          <button mat-raised-button color="primary" (click)="showForm = !showForm">
            <mat-icon>add</mat-icon> {{ showForm ? 'Fermer' : 'Nouvel appel' }}
          </button>
        </div>
      </header>

      <mat-card *ngIf="showForm" class="form-card">
        <h3>Publier un appel à candidature</h3>
        <div class="form-grid">
          <input class="field full" [(ngModel)]="form.title" placeholder="Titre *" />
          <textarea class="field full" [(ngModel)]="form.description" placeholder="Description *" rows="3"></textarea>
          <input class="field" [(ngModel)]="form.position" placeholder="Poste" />
          <select class="field" [(ngModel)]="form.role">
            <option value="agent">Agent terrain</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrateur</option>
            <option value="hr">Ressources humaines</option>
            <option value="accountant">Comptable</option>
          </select>
          <input class="field" [(ngModel)]="form.city" placeholder="Ville" />
          <input class="field" type="number" min="1" [(ngModel)]="form.days_valid" placeholder="Durée (jours)" />
          <textarea class="field full" [(ngModel)]="form.requirements" placeholder="Prérequis (optionnel)" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button mat-button (click)="showForm = false">Annuler</button>
          <button mat-raised-button color="primary" (click)="create()" [disabled]="creating">
            {{ creating ? 'Publication…' : 'Publier' }}
          </button>
        </div>
      </mat-card>

      <div class="filters">
        <button *ngFor="let f of filters" type="button"
          [class.active]="statusFilter === f.id"
          (click)="setFilter(f.id)">
          {{ f.label }}
        </button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="call-card" *ngFor="let call of calls" [class.open]="expandedId === call.id">
          <div class="call-top">
            <div>
              <div class="badges">
                <span class="badge" [class]="call.status">{{ statusLabel(call.status) }}</span>
                <span class="badge muted">{{ roleLabel(call.role) }}</span>
                <span class="badge count" *ngIf="call.pending_applications_count">
                  {{ call.pending_applications_count }} en attente
                </span>
              </div>
              <h3>{{ call.title }}</h3>
              <p>{{ call.position || roleLabel(call.role) }}<span *ngIf="call.city"> · {{ call.city }}</span></p>
              <p class="meta">
                Publié le {{ call.created_at | date:'short' }}
                <span *ngIf="call.expires_at"> · expire {{ call.expires_at | date:'short' }}</span>
                · {{ call.applications_count || 0 }} candidature(s)
              </p>
              <p class="desc">{{ call.description }}</p>
            </div>
            <div class="actions">
              <button mat-stroked-button (click)="toggleApps(call)">
                {{ expandedId === call.id ? 'Masquer' : 'Candidatures' }}
              </button>
              <button mat-stroked-button *ngIf="call.status === 'open'"
                (click)="setStatus(call, 'closed')" [disabled]="actionId === call.id">
                Clôturer
              </button>
              <button mat-stroked-button color="warn" *ngIf="call.status === 'open'"
                (click)="setStatus(call, 'cancelled')" [disabled]="actionId === call.id">
                Annuler
              </button>
            </div>
          </div>

          <div class="apps" *ngIf="expandedId === call.id">
            <div class="loading" *ngIf="appsLoading"><mat-spinner diameter="28"></mat-spinner></div>
            <div *ngIf="!appsLoading && !applications.length" class="empty-inline">Aucune candidature.</div>
            <div class="app-row" *ngFor="let app of applications">
              <div>
                <strong>{{ app.provider?.first_name }} {{ app.provider?.last_name }}</strong>
                <span class="meta">{{ app.provider?.email }}</span>
                <span class="badge" [class]="app.status">{{ appStatusLabel(app.status) }}</span>
                <p class="message" *ngIf="app.message">« {{ app.message }} »</p>
              </div>
              <div class="actions" *ngIf="app.status === 'pending'">
                <button mat-raised-button class="accept-btn"
                  (click)="review(app, 'accept')" [disabled]="actionId === app.id">
                  Accepter
                </button>
                <button mat-stroked-button color="warn"
                  (click)="review(app, 'reject')" [disabled]="actionId === app.id">
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!calls.length">
          <mat-icon>campaign</mat-icon>
          <h3>Aucun appel</h3>
          <p>Publiez un appel ouvert pour que les prestataires puissent postuler.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding-bottom: 40px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 520px; }
    }
    .header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .form-card { padding: 18px; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 12px;
      h3 { margin: 0 0 12px; font-size: 16px; }
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font: inherit; width: 100%;
      box-sizing: border-box; background: #fff;
      &.full { grid-column: 1 / -1; }
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }
    .loading { display: flex; justify-content: center; padding: 32px; }
    .call-card { padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px;
      &.open { box-shadow: 0 4px 16px rgba(15,23,42,0.06); }
    }
    .call-top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; display: inline-block;
      &.open, &.pending { background: #fef3c7; color: #92400e; }
      &.closed, &.accepted { background: #dcfce7; color: #166534; }
      &.cancelled, &.rejected { background: #fee2e2; color: #991b1b; }
      &.muted { background: #eef2ff; color: #3730a3; }
      &.count { background: #e0f2fe; color: #075985; }
    }
    h3 { margin: 0 0 4px; font-size: 16px; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .meta { margin-top: 4px !important; font-size: 12px !important; color: #94a3b8 !important; }
    .desc { margin-top: 8px !important; color: #475569 !important; white-space: pre-wrap; }
    .message { margin-top: 6px !important; font-style: italic; color: #475569 !important; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .accept-btn { background: #16a34a !important; color: #fff !important; }
    .apps { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .app-row {
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 12px 0; border-bottom: 1px solid #f1f5f9;
      strong { display: block; margin-bottom: 2px; }
      .meta { display: block; margin-bottom: 4px; }
    }
    .empty-inline { color: #94a3b8; font-size: 13px; padding: 8px 0; }
    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class EnterpriseAppelsComponent implements OnInit {
  calls: RecruitmentCall[] = [];
  applications: RecruitmentApplication[] = [];
  loading = true;
  appsLoading = false;
  creating = false;
  showForm = false;
  actionId: string | null = null;
  expandedId: string | null = null;
  statusFilter: CallFilter = 'open';

  form = {
    title: '',
    description: '',
    position: 'Agent terrain',
    role: 'agent',
    city: '',
    requirements: '',
    days_valid: 30,
  };

  filters: { id: CallFilter; label: string }[] = [
    { id: 'open', label: 'Ouverts' },
    { id: 'closed', label: 'Clôturés' },
    { id: 'cancelled', label: 'Annulés' },
    { id: 'all', label: 'Tout' },
  ];

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

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Ouvert',
      closed: 'Clôturé',
      cancelled: 'Annulé',
    };
    return map[status] || status;
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

  setFilter(id: CallFilter): void {
    this.statusFilter = id;
    this.expandedId = null;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.listEnterpriseRecruitmentCalls(this.statusFilter).subscribe({
      next: (list) => {
        this.calls = list || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur chargement des appels', 'Fermer', { duration: 3000 });
      },
    });
  }

  create(): void {
    if (!this.form.title.trim() || !this.form.description.trim()) {
      this.snack.open('Titre et description requis', 'Fermer', { duration: 3000 });
      return;
    }
    this.creating = true;
    this.enterpriseService.createRecruitmentCall({
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      position: this.form.position,
      role: this.form.role,
      city: this.form.city,
      requirements: this.form.requirements,
      days_valid: Number(this.form.days_valid) || 30,
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showForm = false;
        this.form = {
          title: '',
          description: '',
          position: 'Agent terrain',
          role: 'agent',
          city: '',
          requirements: '',
          days_valid: 30,
        };
        this.statusFilter = 'open';
        this.snack.open('Appel publié', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.creating = false;
        this.snack.open(err.error?.error || err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  setStatus(call: RecruitmentCall, status: string): void {
    const label = status === 'closed' ? 'clôturer' : 'annuler';
    if (!confirm(`Voulez-vous ${label} « ${call.title} » ?`)) return;
    this.actionId = call.id;
    this.enterpriseService.updateRecruitmentCall(call.id, { status }).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open(status === 'closed' ? 'Appel clôturé' : 'Appel annulé', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snack.open(err.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  toggleApps(call: RecruitmentCall): void {
    if (this.expandedId === call.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = call.id;
    this.appsLoading = true;
    this.applications = [];
    this.enterpriseService.listRecruitmentApplications(call.id).subscribe({
      next: (list) => {
        this.applications = list || [];
        this.appsLoading = false;
      },
      error: () => {
        this.appsLoading = false;
        this.snack.open('Erreur chargement candidatures', 'Fermer', { duration: 3000 });
      },
    });
  }

  review(app: RecruitmentApplication, action: 'accept' | 'reject'): void {
    const name = `${app.provider?.first_name || ''} ${app.provider?.last_name || ''}`.trim() || 'ce candidat';
    if (action === 'accept' && !confirm(`Accepter ${name} dans l'entreprise ?`)) return;
    this.actionId = app.id;
    this.enterpriseService.reviewRecruitmentApplication(app.id, action).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open(action === 'accept' ? 'Candidat accepté' : 'Candidature refusée', 'Fermer', { duration: 3000 });
        if (this.expandedId) {
          this.enterpriseService.listRecruitmentApplications(this.expandedId).subscribe({
            next: (list) => { this.applications = list || []; },
          });
        }
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snack.open(err.error?.error || err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }
}
