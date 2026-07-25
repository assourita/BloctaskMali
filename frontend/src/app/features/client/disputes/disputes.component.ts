import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../../core/services/mission.service';

interface UserInfo { id?: string; first_name: string; last_name: string; email?: string; }

interface DisputeEvidence {
  id: string;
  evidence_type: string;
  title: string;
  description?: string;
  file?: string | null;
  is_accepted?: boolean;
  submitted_by?: UserInfo;
  created_at: string;
}

interface DisputeMessage {
  id: string;
  message: string;
  is_internal: boolean;
  sender: UserInfo;
  created_at: string;
}

interface Dispute {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_budget?: number;
  mission_currency?: string;
  reason: string;
  description: string;
  status: string;
  decision?: string;
  decision_reason?: string;
  requested_resolution: string;
  defendant_response?: string;
  defendant_responded_at?: string;
  created_at: string;
  resolved_at?: string;
  client_refund_amount?: number;
  provider_payment_amount?: number;
  plaintiff: UserInfo;
  defendant: UserInfo;
  evidence?: DisputeEvidence[];
  messages?: DisputeMessage[];
  evidence_count?: number;
}

interface MissionOption { id: string; title: string; status: string; }

@Component({
  selector: 'app-client-disputes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>gavel</mat-icon> Litiges</h1>
          <p>Consultez, suivez ou ouvrez un litige sur une mission</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button type="button" (click)="load()" [disabled]="loading">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
          <button mat-raised-button color="primary" type="button" (click)="showForm = !showForm; selected = null">
            <mat-icon>add</mat-icon> Nouveau litige
          </button>
        </div>
      </div>

      <mat-card class="form-card" *ngIf="showForm">
        <mat-card-header><mat-card-title>Ouvrir un litige</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="dispute-form">
            <label class="lbl">Mission</label>
            <select class="field" formControlName="mission_id">
              <option value="">Sélectionner une mission</option>
              <option *ngFor="let m of eligibleMissions" [value]="m.id">{{ m.title }} ({{ m.status }})</option>
            </select>
            <label class="lbl">Motif</label>
            <select class="field" formControlName="reason">
              <option value="non_delivery">Non livraison</option>
              <option value="late_delivery">Livraison en retard</option>
              <option value="damaged_item">Article endommagé</option>
              <option value="wrong_item">Mauvais article</option>
              <option value="poor_quality">Mauvaise qualité</option>
              <option value="incomplete_work">Travail incomplet</option>
              <option value="fake_proof">Fausse preuve</option>
              <option value="payment_issue">Problème de paiement</option>
              <option value="behavior">Comportement inapproprié</option>
              <option value="other">Autre</option>
            </select>
            <label class="lbl">Description</label>
            <textarea class="field" formControlName="description" rows="4" placeholder="Décrivez le problème..."></textarea>
            <label class="lbl">Résolution souhaitée</label>
            <input class="field" formControlName="requested_resolution" placeholder="Remboursement, nouvelle exécution..." />
            <div class="form-actions">
              <button mat-button type="button" (click)="showForm = false">Annuler</button>
              <button mat-raised-button color="warn" type="submit" [disabled]="form.invalid || submitting">Soumettre</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="layout" [class.with-detail]="!!selected">
        <div class="list-col">
          <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

          <div class="dispute-list" *ngIf="!loading">
            <mat-card
              *ngFor="let d of disputes"
              class="dispute-card"
              [class.active]="selected?.id === d.id"
              (click)="openDispute(d)"
            >
              <div class="dispute-head">
                <div>
                  <h3>{{ d.mission_title }}</h3>
                  <span class="date">{{ d.created_at | date:'medium' }}</span>
                </div>
                <mat-chip [class]="'st-' + d.status">{{ statusLabel(d.status) }}</mat-chip>
              </div>
              <p class="reason"><strong>Motif :</strong> {{ reasonLabel(d.reason) }}</p>
              <p class="desc">{{ d.description | slice:0:140 }}{{ (d.description || '').length > 140 ? '…' : '' }}</p>
              <div class="card-footer">
                <span class="meta" *ngIf="d.evidence_count">{{ d.evidence_count }} preuve(s)</span>
                <button mat-button color="primary" type="button" (click)="openDispute(d); $event.stopPropagation()">
                  Consulter <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </mat-card>
            <p class="empty" *ngIf="!disputes.length">Aucun litige pour le moment</p>
          </div>
        </div>

        <aside class="detail-col" *ngIf="selected">
          <div class="detail-panel">
            <div class="panel-header">
              <h2>Détail du litige</h2>
              <button mat-icon-button type="button" (click)="closeDetail()"><mat-icon>close</mat-icon></button>
            </div>

            <div class="loading" *ngIf="detailLoading"><mat-spinner diameter="32"></mat-spinner></div>

            <ng-container *ngIf="!detailLoading && selected">
              <div class="badges">
                <mat-chip [class]="'st-' + selected.status">{{ statusLabel(selected.status) }}</mat-chip>
                <mat-chip *ngIf="selected.decision && selected.decision !== 'pending'" class="st-resolved">
                  {{ decisionLabel(selected.decision) }}
                </mat-chip>
              </div>

              <div class="info-block">
                <span class="lbl">Mission</span>
                <strong>{{ selected.mission_title }}</strong>
                <span class="sub" *ngIf="selected.mission_budget != null">
                  {{ selected.mission_budget | number:'1.0-0' }} {{ selected.mission_currency || 'XOF' }}
                </span>
              </div>

              <div class="info-block">
                <span class="lbl">Motif</span>
                <strong>{{ reasonLabel(selected.reason) }}</strong>
              </div>

              <div class="info-block">
                <span class="lbl">Description</span>
                <p>{{ selected.description }}</p>
              </div>

              <div class="info-block" *ngIf="selected.requested_resolution">
                <span class="lbl">Résolution demandée</span>
                <p>{{ selected.requested_resolution }}</p>
              </div>

              <div class="info-block defense-block">
                <span class="lbl">Défense du défendeur</span>
                <p *ngIf="selected.defendant_response">{{ selected.defendant_response }}</p>
                <p *ngIf="!selected.defendant_response" class="empty-inline">Aucune défense pour le moment.</p>
                <form class="evidence-form" *ngIf="canDefend" [formGroup]="defenseForm" (ngSubmit)="submitDefense()">
                  <h4>{{ selected.defendant_response ? 'Mettre à jour votre défense' : 'Répondre à la plainte' }}</h4>
                  <textarea class="field" formControlName="defendant_response" rows="4"
                    placeholder="Expliquez votre version des faits (min. 20 caractères)…"></textarea>
                  <button mat-stroked-button color="primary" type="submit" [disabled]="defenseForm.invalid || defenseSubmitting">
                    {{ defenseSubmitting ? 'Envoi…' : 'Soumettre ma défense' }}
                  </button>
                </form>
              </div>

              <div class="parties">
                <div>
                  <span class="lbl">Plaignant</span>
                  <strong>{{ selected.plaintiff.first_name }} {{ selected.plaintiff.last_name }}</strong>
                </div>
                <div>
                  <span class="lbl">Défendeur</span>
                  <strong>{{ selected.defendant.first_name }} {{ selected.defendant.last_name }}</strong>
                </div>
              </div>

              <div class="decision-box" *ngIf="selected.decision && selected.decision !== 'pending'">
                <span class="lbl">Verdict</span>
                <strong>{{ decisionLabel(selected.decision) }}</strong>
                <p *ngIf="selected.decision_reason"><span class="lbl">Justification</span>{{ selected.decision_reason }}</p>
                <div class="amounts" *ngIf="(selected.client_refund_amount || 0) > 0 || (selected.provider_payment_amount || 0) > 0">
                  <span *ngIf="(selected.client_refund_amount || 0) > 0">
                    Remboursement client : {{ selected.client_refund_amount | number:'1.0-0' }} {{ selected.mission_currency || 'XOF' }}
                  </span>
                  <span *ngIf="(selected.provider_payment_amount || 0) > 0">
                    Paiement prestataire : {{ selected.provider_payment_amount | number:'1.0-0' }} {{ selected.mission_currency || 'XOF' }}
                  </span>
                </div>
              </div>

              <mat-divider></mat-divider>

              <section class="section">
                <div class="section-head">
                  <h3>Preuves ({{ (selected.evidence || []).length }})</h3>
                </div>
                <div class="evidence-list" *ngIf="selected.evidence?.length; else noEvidence">
                  <div class="evidence-item" *ngFor="let e of selected.evidence">
                    <div>
                      <strong>{{ e.title }}</strong>
                      <span class="sub">{{ evidenceTypeLabel(e.evidence_type) }} · {{ e.created_at | date:'short' }}</span>
                      <p *ngIf="e.description">{{ e.description }}</p>
                    </div>
                    <a *ngIf="e.file" [href]="e.file" target="_blank" rel="noopener" mat-stroked-button>
                      <mat-icon>open_in_new</mat-icon> Voir
                    </a>
                  </div>
                </div>
                <ng-template #noEvidence><p class="empty-inline">Aucune preuve pour le moment.</p></ng-template>

                <form class="evidence-form" *ngIf="canAddEvidence" [formGroup]="evidenceForm" (ngSubmit)="submitEvidence()">
                  <h4>Ajouter une preuve</h4>
                  <select class="field" formControlName="evidence_type">
                    <option value="photo">Photo</option>
                    <option value="document">Document</option>
                    <option value="screenshot">Capture d'écran</option>
                    <option value="chat_log">Historique de conversation</option>
                    <option value="gps_data">Données GPS</option>
                    <option value="receipt">Reçu</option>
                    <option value="witness">Témoignage</option>
                    <option value="expert">Rapport d'expert</option>
                  </select>
                  <input class="field" formControlName="title" placeholder="Titre de la preuve" />
                  <textarea class="field" formControlName="description" rows="2" placeholder="Description (optionnel)"></textarea>
                  <input type="file" (change)="onEvidenceFile($event)" />
                  <button mat-stroked-button color="primary" type="submit" [disabled]="evidenceForm.invalid || evidenceSubmitting">
                    {{ evidenceSubmitting ? 'Envoi…' : 'Envoyer la preuve' }}
                  </button>
                </form>
              </section>

              <section class="section" *ngIf="selected.messages?.length">
                <h3>Échanges</h3>
                <div class="msg" *ngFor="let m of selected.messages">
                  <strong>{{ m.sender.first_name }} {{ m.sender.last_name }}</strong>
                  <span class="sub">{{ m.created_at | date:'short' }}</span>
                  <p>{{ m.message }}</p>
                </div>
              </section>
            </ng-container>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .form-card { margin-bottom: 24px; }
    .dispute-form { display: flex; flex-direction: column; gap: 8px; }
    .lbl { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.02em; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; width: 100%; box-sizing: border-box; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .layout.with-detail { grid-template-columns: 1fr 1fr; }
    @media (max-width: 900px) {
      .layout.with-detail { grid-template-columns: 1fr; }
    }
    .dispute-list { display: flex; flex-direction: column; gap: 12px; }
    .dispute-card { padding: 16px 18px; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; border: 1px solid transparent;
      &:hover, &.active { border-color: #16a34a; box-shadow: 0 4px 12px rgba(22,163,74,0.12); }
    }
    .dispute-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;
      h3 { margin: 0 0 4px; font-size: 16px; } .date { font-size: 12px; color: #9ca3af; }
    }
    .reason, .desc { font-size: 14px; color: #374151; margin: 6px 0; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px;
      .meta { font-size: 12px; color: #6b7280; }
    }
    .detail-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; position: sticky; top: 16px; max-height: calc(100vh - 100px); overflow: auto; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
      h2 { margin: 0; font-size: 18px; }
    }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .info-block { margin-bottom: 14px;
      strong { display: block; margin-top: 2px; }
      p { margin: 4px 0 0; font-size: 14px; color: #374151; line-height: 1.5; }
      .sub { display: block; font-size: 13px; color: #6b7280; margin-top: 2px; }
    }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .decision-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 16px;
      p { margin: 8px 0 0; font-size: 14px; }
      .amounts { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 13px; color: #166534; }
    }
    .section { margin-top: 16px;
      h3 { margin: 0 0 10px; font-size: 15px; }
      h4 { margin: 12px 0 8px; font-size: 14px; }
    }
    .evidence-item { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f3f4f6;
      .sub { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
      p { margin: 4px 0 0; font-size: 13px; color: #4b5563; }
    }
    .evidence-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e7eb; }
    .msg { padding: 8px 0; border-bottom: 1px solid #f3f4f6;
      .sub { margin-left: 8px; font-size: 12px; color: #9ca3af; }
      p { margin: 4px 0 0; font-size: 14px; }
    }
    .empty, .empty-inline { text-align: center; color: #9ca3af; padding: 24px 8px; font-size: 14px; }
    .st-open { background: #fee2e2 !important; color: #991b1b !important; }
    .st-under_review, .st-pending_evidence, .st-arbitration { background: #fef3c7 !important; color: #92400e !important; }
    .st-resolved, .st-closed { background: #d1fae5 !important; color: #065f46 !important; }
  `]
})
export class ClientDisputesComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  disputes: Dispute[] = [];
  eligibleMissions: MissionOption[] = [];
  selected: Dispute | null = null;
  loading = true;
  detailLoading = false;
  showForm = false;
  submitting = false;
  evidenceSubmitting = false;
  defenseSubmitting = false;
  evidenceFile: File | null = null;
  form: FormGroup;
  evidenceForm: FormGroup;
  defenseForm: FormGroup;
  currentUserId = '';
  private missionRole: 'client' | 'provider' = 'client';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private missionService: MissionService,
    private route: ActivatedRoute,
  ) {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('current_user') || '';
      const u = raw ? JSON.parse(raw) : null;
      this.currentUserId = String(u?.id || '');
    } catch {
      this.currentUserId = '';
    }
    this.form = this.fb.group({
      mission_id: ['', Validators.required],
      reason: ['non_delivery', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20)]],
      requested_resolution: [''],
    });
    this.evidenceForm = this.fb.group({
      evidence_type: ['photo', Validators.required],
      title: ['', Validators.required],
      description: [''],
    });
    this.defenseForm = this.fb.group({
      defendant_response: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    // Réutilisé aussi sous /provider/disputes
    this.missionRole = window.location.pathname.includes('/provider/') ? 'provider' : 'client';
    this.load();
    this.loadMissions();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.openDispute({ id: params['id'] } as Dispute);
      }
    });
  }

  get canAddEvidence(): boolean {
    if (!this.selected) return false;
    return !['resolved', 'closed'].includes(this.selected.status);
  }

  get canDefend(): boolean {
    if (!this.selected || !this.currentUserId) return false;
    if (['resolved', 'closed'].includes(this.selected.status)) return false;
    return String(this.selected.defendant?.id || '') === this.currentUserId;
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<Dispute[]>(`${this.apiUrl}/disputes/mine/`, { headers: this.h() }).subscribe({
      next: (d) => { this.disputes = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadMissions(): void {
    this.missionService.getMyMissionsByStatuses(
      ['in_progress', 'submitted', 'completed', 'disputed'],
      this.missionRole,
    ).subscribe({
      next: (list) => { this.eligibleMissions = list as MissionOption[]; },
    });
  }

  openDispute(d: Dispute): void {
    this.showForm = false;
    this.selected = d;
    this.detailLoading = true;
    this.http.get<Dispute>(`${this.apiUrl}/disputes/${d.id}/`, { headers: this.h() }).subscribe({
      next: (full) => {
        this.selected = full;
        this.detailLoading = false;
        const idx = this.disputes.findIndex(x => x.id === full.id);
        if (idx >= 0) {
          this.disputes = [...this.disputes];
          this.disputes[idx] = { ...this.disputes[idx], ...full };
        }
      },
      error: () => {
        this.detailLoading = false;
        this.snack.open('Impossible de charger le litige', 'Fermer', { duration: 4000 });
      },
    });
  }

  closeDetail(): void {
    this.selected = null;
  }

  onEvidenceFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.evidenceFile = input.files?.[0] || null;
  }

  submitEvidence(): void {
    if (!this.selected || this.evidenceForm.invalid) return;
    this.evidenceSubmitting = true;
    const fd = new FormData();
    const v = this.evidenceForm.value;
    fd.append('evidence_type', v.evidence_type);
    fd.append('title', v.title);
    if (v.description) fd.append('description', v.description);
    if (this.evidenceFile) fd.append('file', this.evidenceFile);

    this.http.post(`${this.apiUrl}/disputes/${this.selected.id}/add_evidence/`, fd, {
      headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` }),
    }).subscribe({
      next: () => {
        this.evidenceSubmitting = false;
        this.evidenceForm.reset({ evidence_type: 'photo', title: '', description: '' });
        this.evidenceFile = null;
        this.snack.open('Preuve ajoutée', 'Fermer', { duration: 3000 });
        this.openDispute(this.selected!);
      },
      error: (e) => {
        this.evidenceSubmitting = false;
        this.snack.open(e.error?.error || e.error?.detail || 'Erreur envoi preuve', 'Fermer', { duration: 4000 });
      },
    });
  }

  submitDefense(): void {
    if (!this.selected || this.defenseForm.invalid) return;
    this.defenseSubmitting = true;
    this.http.post<Dispute>(`${this.apiUrl}/disputes/${this.selected.id}/submit_defense/`, this.defenseForm.value, {
      headers: this.h(),
    }).subscribe({
      next: (updated) => {
        this.defenseSubmitting = false;
        this.selected = updated;
        this.defenseForm.reset({ defendant_response: '' });
        this.snack.open('Défense enregistrée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (e) => {
        this.defenseSubmitting = false;
        const msg = e.error?.defendant_response?.[0] || e.error?.error || 'Erreur envoi défense';
        this.snack.open(msg, 'Fermer', { duration: 4000 });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.http.post(`${this.apiUrl}/disputes/`, this.form.value, { headers: this.h() }).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.showForm = false;
        this.form.reset({ reason: 'non_delivery' });
        this.snack.open('Litige ouvert', 'Fermer', { duration: 3000 });
        this.load();
        if (created?.id) this.openDispute(created);
      },
      error: (e) => {
        this.submitting = false;
        this.snack.open(e.error?.detail || e.error?.mission_id?.[0] || e.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves requises',
      resolved: 'Résolu', closed: 'Fermé', arbitration: 'Arbitrage', appealed: 'En appel',
    };
    return m[s] || s;
  }

  reasonLabel(r: string): string {
    const m: Record<string, string> = {
      non_delivery: 'Non livraison', late_delivery: 'Livraison en retard', damaged_item: 'Article endommagé',
      wrong_item: 'Mauvais article', poor_quality: 'Mauvaise qualité', incomplete_work: 'Travail incomplet',
      fake_proof: 'Fausse preuve', payment_issue: 'Problème de paiement', behavior: 'Comportement inapproprié',
      other: 'Autre', damage: 'Dommages', fraud: 'Fraude',
    };
    return m[r] || r;
  }

  decisionLabel(d: string): string {
    const m: Record<string, string> = {
      client_wins: 'Client gagne', provider_wins: 'Prestataire gagne', split: 'Partage 50/50',
      partial_client: 'Remboursement partiel client', partial_provider: 'Paiement partiel prestataire',
    };
    return m[d] || d;
  }

  evidenceTypeLabel(t: string): string {
    const m: Record<string, string> = {
      photo: 'Photo', document: 'Document', screenshot: "Capture d'écran", chat_log: 'Conversation',
      gps_data: 'GPS', receipt: 'Reçu', witness: 'Témoignage', video: 'Vidéo', other: 'Autre',
    };
    return m[t] || t;
  }
}
