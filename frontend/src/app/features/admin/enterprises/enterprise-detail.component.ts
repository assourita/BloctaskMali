import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

type TabKey =
  | 'profile'
  | 'employees'
  | 'invitations'
  | 'calls'
  | 'assignments'
  | 'missions'
  | 'teams';

@Component({
  selector: 'app-admin-enterprise-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page" *ngIf="!loading; else loadingTpl">
      <header class="hero" *ngIf="profile as p">
        <button type="button" class="back" routerLink="/admin/enterprises">
          <mat-icon>arrow_back</mat-icon> Entreprises
        </button>
        <div class="hero-main">
          <div class="avatar"><mat-icon>apartment</mat-icon></div>
          <div class="hero-text">
            <h1>
              {{ p.company_name || 'Entreprise' }}
              <mat-icon class="verified" *ngIf="p.is_verified">verified</mat-icon>
            </h1>
            <p>{{ p.company_email }} · {{ p.city || '—' }} · {{ p.company_phone || '—' }}</p>
            <div class="badges">
              <span class="badge" [class.on]="p.is_verified">{{ p.is_verified ? 'Vérifiée' : 'Non vérifiée' }}</span>
              <span class="badge" [class.on]="p.is_active" [class.off]="!p.is_active">{{ p.is_active ? 'Compte actif' : 'Inactif' }}</span>
              <span class="badge muted">Réputation {{ p.reputation_score | number:'1.0-1' }}</span>
            </div>
          </div>
          <div class="hero-actions">
            <button type="button" class="btn-primary" *ngIf="!p.is_verified" (click)="setVerified(true)" [disabled]="busy">
              <mat-icon>verified</mat-icon> Vérifier
            </button>
            <button type="button" class="btn-ghost" *ngIf="p.is_verified" (click)="setVerified(false)" [disabled]="busy">
              Retirer vérif.
            </button>
          </div>
        </div>
      </header>

      <div class="stats" *ngIf="stats">
        <div class="stat"><strong>{{ stats.employees_active }}</strong><span>Employés actifs</span></div>
        <div class="stat"><strong>{{ stats.invites_pending }}</strong><span>Invitations en attente</span></div>
        <div class="stat"><strong>{{ stats.calls_open }}</strong><span>Appels ouverts</span></div>
        <div class="stat"><strong>{{ stats.assignments }}</strong><span>Affectations</span></div>
        <div class="stat"><strong>{{ stats.missions_received }}</strong><span>Missions reçues</span></div>
        <div class="stat"><strong>{{ stats.missions_completed }}</strong><span>Exécutées</span></div>
      </div>

      <nav class="tabs">
        <button type="button" *ngFor="let t of tabs" [class.active]="tab === t.key" (click)="tab = t.key">
          {{ t.label }}
        </button>
      </nav>

      <section class="panel" *ngIf="tab === 'profile' && profile as p">
        <h2>Profil complet</h2>
        <div class="grid-2">
          <div class="kv"><span>Raison sociale</span><strong>{{ p.company_name }}</strong></div>
          <div class="kv"><span>Email</span><strong>{{ p.company_email }}</strong></div>
          <div class="kv"><span>Téléphone</span><strong>{{ p.company_phone || '—' }}</strong></div>
          <div class="kv"><span>Site web</span><strong>{{ p.website || '—' }}</strong></div>
          <div class="kv"><span>RCCM</span><strong>{{ p.rccm || '—' }}</strong></div>
          <div class="kv"><span>IFU</span><strong>{{ p.ifu || '—' }}</strong></div>
          <div class="kv"><span>Adresse</span><strong>{{ p.address || '—' }}</strong></div>
          <div class="kv"><span>Ville</span><strong>{{ p.city || '—' }}</strong></div>
          <div class="kv"><span>Caution disponible</span><strong>{{ p.deposit_balance | number:'1.0-0' }} XOF</strong></div>
          <div class="kv"><span>Caution bloquée</span><strong>{{ p.deposit_locked | number:'1.0-0' }} XOF</strong></div>
          <div class="kv"><span>Dépenses totales</span><strong>{{ p.total_spent | number:'1.0-0' }} XOF</strong></div>
          <div class="kv"><span>Créée le</span><strong>{{ p.created_at | date:'medium' }}</strong></div>
        </div>
        <h3>Gérant / compte</h3>
        <div class="grid-2" *ngIf="p.owner">
          <div class="kv"><span>Nom</span><strong>{{ p.owner.first_name }} {{ p.owner.last_name }}</strong></div>
          <div class="kv"><span>Email</span><strong>{{ p.owner.email }}</strong></div>
          <div class="kv"><span>Téléphone</span><strong>{{ p.owner.phone_number || '—' }}</strong></div>
          <div class="kv"><span>KYC</span><strong>{{ p.owner.kyc_status || '—' }}</strong></div>
        </div>
        <a *ngIf="p.trade_register_url" class="doc-link" [href]="p.trade_register_url" target="_blank" rel="noopener">
          <mat-icon>description</mat-icon> Registre de commerce
        </a>
      </section>

      <section class="panel" *ngIf="tab === 'employees'">
        <h2>Employés ({{ employees.length }})</h2>
        <div class="table" *ngIf="employees.length; else emptyEmp">
          <div class="thead">
            <span>Nom</span><span>Rôle</span><span>Contact</span><span>Missions</span><span>Statut</span>
          </div>
          <div class="trow" *ngFor="let e of employees">
            <span><strong>{{ e.first_name }} {{ e.last_name }}</strong><small>{{ e.position }}</small></span>
            <span>{{ e.role }}</span>
            <span>{{ e.email || e.phone || '—' }}</span>
            <span>{{ e.missions_completed }} ok / {{ e.missions_failed }} ko</span>
            <span class="pill" [class.on]="e.is_active">{{ e.is_active ? 'Actif' : 'Inactif' }}</span>
          </div>
        </div>
        <ng-template #emptyEmp><p class="empty">Aucun employé.</p></ng-template>
      </section>

      <section class="panel" *ngIf="tab === 'invitations'">
        <h2>Invitations ({{ invitations.length }})</h2>
        <div class="table" *ngIf="invitations.length; else emptyInv">
          <div class="thead inv">
            <span>Email</span><span>Rôle</span><span>Statut</span><span>Date</span>
          </div>
          <div class="trow inv" *ngFor="let i of invitations">
            <span><strong>{{ i.email }}</strong><small *ngIf="i.user">{{ i.user }}</small></span>
            <span>{{ i.role }} · {{ i.position }}</span>
            <span class="pill">{{ i.status }}</span>
            <span>{{ i.created_at | date:'short' }}</span>
          </div>
        </div>
        <ng-template #emptyInv><p class="empty">Aucune invitation.</p></ng-template>
      </section>

      <section class="panel" *ngIf="tab === 'calls'">
        <h2>Appels d'offre / recrutement ({{ calls.length }})</h2>
        <div class="cards" *ngIf="calls.length; else emptyCalls">
          <article class="mini" *ngFor="let c of calls">
            <div class="mini-head">
              <h3>{{ c.title }}</h3>
              <span class="pill" [class.on]="c.status === 'open'">{{ c.status }}</span>
            </div>
            <p>{{ c.description }}</p>
            <div class="meta">{{ c.position }} · {{ c.city || '—' }} · {{ c.applications_count }} candidature(s)</div>
            <div class="meta muted">{{ c.created_at | date:'medium' }}</div>
          </article>
        </div>
        <ng-template #emptyCalls><p class="empty">Aucun appel d'offre.</p></ng-template>
      </section>

      <section class="panel" *ngIf="tab === 'assignments'">
        <h2>Affectations de mission ({{ assignments.length }})</h2>
        <div class="table" *ngIf="assignments.length; else emptyAsg">
          <div class="thead asg">
            <span>Mission</span><span>Employé</span><span>Lead</span><span>Statut mission</span><span>Date</span>
          </div>
          <div class="trow asg" *ngFor="let a of assignments">
            <span><strong>{{ a.mission_title }}</strong></span>
            <span>{{ a.employee }}</span>
            <span>{{ a.is_lead ? 'Oui' : 'Non' }}</span>
            <span class="pill">{{ a.mission_status }}</span>
            <span>{{ a.assigned_at | date:'short' }}</span>
          </div>
        </div>
        <ng-template #emptyAsg><p class="empty">Aucune affectation.</p></ng-template>
      </section>

      <section class="panel" *ngIf="tab === 'missions'">
        <h2>Missions reçues / exécutées</h2>
        <h3>Reçues ({{ missionsReceived.length }})</h3>
        <div class="table" *ngIf="missionsReceived.length; else emptyRec">
          <div class="thead mis">
            <span>Titre</span><span>Statut</span><span>Budget</span><span>Client</span><span>Date</span>
          </div>
          <div class="trow mis" *ngFor="let m of missionsReceived">
            <span><strong>{{ m.title }}</strong><small>{{ m.category }}</small></span>
            <span class="pill">{{ m.status }}</span>
            <span>{{ m.budget | number:'1.0-0' }} {{ m.currency }}</span>
            <span>{{ m.client || '—' }}</span>
            <span>{{ m.created_at | date:'short' }}</span>
          </div>
        </div>
        <ng-template #emptyRec><p class="empty">Aucune mission reçue.</p></ng-template>

        <h3>Exécutées / terminées ({{ missionsCompleted.length }})</h3>
        <div class="table" *ngIf="missionsCompleted.length; else emptyDone">
          <div class="thead mis">
            <span>Titre</span><span>Statut</span><span>Budget</span><span>Client</span><span>Fin</span>
          </div>
          <div class="trow mis" *ngFor="let m of missionsCompleted">
            <span><strong>{{ m.title }}</strong></span>
            <span class="pill on">{{ m.status }}</span>
            <span>{{ m.budget | number:'1.0-0' }} {{ m.currency }}</span>
            <span>{{ m.client || '—' }}</span>
            <span>{{ (m.completed_at || m.created_at) | date:'short' }}</span>
          </div>
        </div>
        <ng-template #emptyDone><p class="empty">Aucune mission terminée.</p></ng-template>

        <h3>Publiées par l'entreprise ({{ missionsPosted.length }})</h3>
        <div class="table" *ngIf="missionsPosted.length; else emptyPost">
          <div class="thead mis">
            <span>Titre</span><span>Statut</span><span>Budget</span><span>Prestataire</span><span>Date</span>
          </div>
          <div class="trow mis" *ngFor="let m of missionsPosted">
            <span><strong>{{ m.title }}</strong></span>
            <span class="pill">{{ m.status }}</span>
            <span>{{ m.budget | number:'1.0-0' }} {{ m.currency }}</span>
            <span>{{ m.provider || '—' }}</span>
            <span>{{ m.created_at | date:'short' }}</span>
          </div>
        </div>
        <ng-template #emptyPost><p class="empty">Aucune mission publiée.</p></ng-template>
      </section>

      <section class="panel" *ngIf="tab === 'teams'">
        <h2>Équipes ({{ teams.length }})</h2>
        <div class="cards" *ngIf="teams.length; else emptyTeams">
          <article class="mini" *ngFor="let t of teams">
            <div class="mini-head">
              <h3>{{ t.name }}</h3>
              <span class="pill" [class.on]="t.is_active">{{ t.is_active ? 'Active' : 'Inactive' }}</span>
            </div>
            <p>{{ t.description || 'Pas de description' }}</p>
            <div class="meta">Chef : {{ t.manager || '—' }} · {{ t.members_count }} membre(s)</div>
          </article>
        </div>
        <ng-template #emptyTeams><p class="empty">Aucune équipe.</p></ng-template>
      </section>

      <p class="error" *ngIf="error">{{ error }}</p>
    </div>

    <ng-template #loadingTpl>
      <div class="loading"><mat-spinner diameter="40"></mat-spinner><p>Chargement du dossier…</p></div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 1180px; margin: 0 auto; padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 16px; }
    .hero {
      background: linear-gradient(145deg, #064e3b 0%, #059669 55%, #34d399 120%);
      color: #fff; border-radius: 18px; padding: 20px 22px 22px;
    }
    .back { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: none; color: #d1fae5; cursor: pointer; font-weight: 600; margin-bottom: 12px; }
    .hero-main { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
    .avatar { width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,.18); display: flex; align-items: center; justify-content: center; }
    .avatar mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .hero-text { flex: 1; min-width: 200px; }
    .hero-text h1 { margin: 0 0 6px; font-size: 1.55rem; display: flex; align-items: center; gap: 8px; }
    .verified { color: #a7f3d0; font-size: 22px; width: 22px; height: 22px; }
    .hero-text p { margin: 0 0 10px; opacity: .9; font-size: 14px; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { background: rgba(255,255,255,.16); border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
    .badge.on { background: #ecfdf5; color: #065f46; }
    .badge.off { background: #fee2e2; color: #991b1b; }
    .badge.muted { opacity: .95; }
    .hero-actions { display: flex; gap: 8px; }
    .btn-primary, .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 10px 14px;
      font-weight: 700; cursor: pointer; border: none;
    }
    .btn-primary { background: #fff; color: #047857; }
    .btn-ghost { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.35); }

    .stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
    .stat strong { display: block; font-size: 1.25rem; color: #064e3b; }
    .stat span { font-size: 12px; color: #6b7280; }

    .tabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .tabs button {
      border: none; background: #f3f4f6; color: #374151; border-radius: 999px; padding: 8px 14px;
      font-weight: 600; font-size: 13px; cursor: pointer;
    }
    .tabs button.active { background: #059669; color: #fff; }

    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; }
    .panel h2 { margin: 0 0 14px; font-size: 1.05rem; }
    .panel h3 { margin: 18px 0 10px; font-size: .95rem; color: #065f46; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
    .kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .kv span { color: #6b7280; }
    .doc-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; color: #059669; font-weight: 600; text-decoration: none; }

    .table { display: flex; flex-direction: column; gap: 0; }
    .thead, .trow {
      display: grid; gap: 10px; align-items: start; padding: 10px 8px; font-size: 13px;
      grid-template-columns: 1.6fr .8fr 1.2fr .9fr .7fr;
    }
    .thead.inv, .trow.inv { grid-template-columns: 1.4fr 1fr .7fr .8fr; }
    .thead.asg, .trow.asg { grid-template-columns: 1.5fr 1fr .5fr .8fr .8fr; }
    .thead.mis, .trow.mis { grid-template-columns: 1.5fr .7fr .8fr 1fr .8fr; }
    .thead { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    .trow { border-bottom: 1px solid #f3f4f6; }
    .trow small { display: block; color: #9ca3af; margin-top: 2px; }
    .pill { display: inline-block; background: #f3f4f6; color: #374151; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .pill.on { background: #d1fae5; color: #065f46; }

    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .mini { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fafafa; }
    .mini-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .mini h3 { margin: 0; font-size: 14px; }
    .mini p { margin: 8px 0; font-size: 13px; color: #4b5563; line-height: 1.4; }
    .meta { font-size: 12px; color: #6b7280; }
    .muted { color: #9ca3af; }
    .empty { color: #9ca3af; font-style: italic; }
    .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; }
    .loading { display: flex; flex-direction: column; align-items: center; padding: 80px; gap: 12px; color: #6b7280; }

    @media (max-width: 900px) {
      .stats { grid-template-columns: repeat(3, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
      .thead, .trow, .thead.inv, .trow.inv, .thead.asg, .trow.asg, .thead.mis, .trow.mis {
        grid-template-columns: 1fr; gap: 4px;
      }
      .thead { display: none; }
    }
  `]
})
export class AdminEnterpriseDetailComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  enterpriseId = '';
  loading = true;
  busy = false;
  error = '';
  tab: TabKey = 'profile';
  profile: any = null;
  stats: any = null;
  employees: any[] = [];
  invitations: any[] = [];
  calls: any[] = [];
  assignments: any[] = [];
  missionsPosted: any[] = [];
  missionsReceived: any[] = [];
  missionsCompleted: any[] = [];
  teams: any[] = [];

  tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'Profil' },
    { key: 'employees', label: 'Employés' },
    { key: 'invitations', label: 'Invitations' },
    { key: 'calls', label: "Appels d'offre" },
    { key: 'assignments', label: 'Affectations' },
    { key: 'missions', label: 'Missions' },
    { key: 'teams', label: 'Équipes' },
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.enterpriseId = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    if (!this.enterpriseId) return;
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/users/admin/enterprises/${this.enterpriseId}/`, { headers: this.h() }).subscribe({
      next: (data) => {
        this.profile = data.profile;
        this.stats = data.stats;
        this.employees = data.employees || [];
        this.invitations = data.invitations || [];
        this.calls = data.recruitment_calls || [];
        this.assignments = data.assignments || [];
        this.missionsPosted = data.missions_posted || [];
        this.missionsReceived = data.missions_received || [];
        this.missionsCompleted = data.missions_completed || [];
        this.teams = data.teams || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger le dossier entreprise.';
        this.loading = false;
      },
    });
  }

  setVerified(is_verified: boolean): void {
    this.busy = true;
    this.http.post(`${this.apiUrl}/users/admin/enterprises/${this.enterpriseId}/verify/`, { is_verified }, { headers: this.h() }).subscribe({
      next: () => {
        this.busy = false;
        if (this.profile) this.profile.is_verified = is_verified;
        this.snack.open(is_verified ? 'Entreprise vérifiée' : 'Vérification retirée', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busy = false;
        this.snack.open('Erreur de vérification', 'Fermer', { duration: 3000 });
      },
    });
  }
}
