import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dispute-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page" *ngIf="!loading; else loadingTpl">
      <header class="page-head">
        <button type="button" class="back" routerLink="/admin/disputes">
          <mat-icon>arrow_back</mat-icon> Litiges
        </button>
        <div class="head-main" *ngIf="dossier">
          <h1>{{ dossier.mission?.title || 'Dossier litige' }}</h1>
          <p>Arbitrage complet — consultez les apports des deux parties avant de trancher.</p>
        </div>
        <div class="head-actions" *ngIf="dispute && !isClosed">
          <button type="button" class="btn-primary" (click)="openResolve = true">
            <mat-icon>gavel</mat-icon> Trancher
          </button>
        </div>
      </header>

      <div class="error" *ngIf="error">{{ error }}</div>

      <ng-container *ngIf="dossier as d">
        <section class="grid-top">
          <article class="card">
            <h2>Litige</h2>
            <div class="kv"><span>Statut</span><strong>{{ statusLabel(dispute?.status) }}</strong></div>
            <div class="kv"><span>Motif</span><strong>{{ reasonLabel(dispute?.reason) }}</strong></div>
            <div class="kv"><span>Ouvert le</span><strong>{{ dispute?.created_at | date:'medium' }}</strong></div>
            <div class="kv" *ngIf="d.escrow?.status_before_dispute">
              <span>État mission avant litige</span>
              <strong>{{ d.escrow.status_before_dispute }}</strong>
            </div>
            <div class="kv"><span>État mission actuel</span><strong>{{ d.escrow?.current_status || d.mission?.status }}</strong></div>
          </article>

          <article class="card party plaintiff">
            <h2>Plaignant</h2>
            <p class="name">{{ d.parties?.plaintiff?.name }}</p>
            <p class="label">Description</p>
            <p>{{ d.parties?.plaintiff?.claim?.description }}</p>
            <p class="label">Résolution demandée</p>
            <p>{{ d.parties?.plaintiff?.claim?.requested_resolution || '—' }}</p>
            <p class="label">Preuves ({{ d.parties?.plaintiff?.evidence?.length || 0 }})</p>
            <div class="ev" *ngFor="let e of d.parties?.plaintiff?.evidence || []">
              <strong>{{ e.title }}</strong>
              <span>{{ e.evidence_type }} · {{ e.created_at | date:'short' }}</span>
              <a *ngIf="e.file" [href]="e.file" target="_blank" rel="noopener">Ouvrir</a>
            </div>
          </article>

          <article class="card party defendant">
            <h2>Défendeur</h2>
            <p class="name">{{ d.parties?.defendant?.name }}</p>
            <p class="label">Défense écrite</p>
            <p>{{ d.parties?.defendant?.defense || 'Aucune défense soumise pour le moment.' }}</p>
            <p class="muted" *ngIf="d.parties?.defendant?.defended_at">
              Soumise le {{ d.parties?.defendant?.defended_at | date:'medium' }}
            </p>
            <p class="label">Preuves ({{ d.parties?.defendant?.evidence?.length || 0 }})</p>
            <div class="ev" *ngFor="let e of d.parties?.defendant?.evidence || []">
              <strong>{{ e.title }}</strong>
              <span>{{ e.evidence_type }} · {{ e.created_at | date:'short' }}</span>
              <a *ngIf="e.file" [href]="e.file" target="_blank" rel="noopener">Ouvrir</a>
            </div>
          </article>
        </section>

        <section class="grid-mid">
          <article class="card">
            <h2>Mission — détails</h2>
            <div class="kv"><span>Budget</span><strong>{{ d.mission?.budget | number:'1.0-0' }} {{ d.mission?.currency }}</strong></div>
            <div class="kv"><span>Départ</span><strong>{{ d.mission?.pickup_address || '—' }}</strong></div>
            <div class="kv"><span>Arrivée / lieu</span><strong>{{ d.mission?.delivery_address || '—' }}</strong></div>
            <div class="kv"><span>Échéance</span><strong>{{ d.mission?.deadline | date:'medium' }}</strong></div>
            <div class="kv"><span>Blockchain</span><strong>{{ d.escrow?.blockchain_status || '—' }}</strong></div>
            <div class="kv"><span>Tx escrow</span><strong class="mono">{{ d.escrow?.escrow_tx_hash || '—' }}</strong></div>
            <p class="desc" *ngIf="d.mission?.description">{{ d.mission.description }}</p>
          </article>

          <article class="card">
            <h2>Workflow / historique</h2>
            <div class="hist" *ngFor="let h of d.status_history || []">
              <strong>{{ h.old_status }} → {{ h.new_status }}</strong>
              <span>{{ h.reason || '' }}</span>
              <span class="muted">{{ h.changed_by || '' }} · {{ h.created_at | date:'short' }}</span>
            </div>
            <p class="muted" *ngIf="!(d.status_history || []).length">Aucun historique.</p>
          </article>

          <article class="card">
            <h2>Paiements</h2>
            <div class="pay" *ngFor="let p of d.payments || []">
              <strong>{{ p.amount | number:'1.0-0' }} · {{ p.status }}</strong>
              <span>{{ p.payment_method }} {{ p.operator ? '(' + p.operator + ')' : '' }}</span>
              <span class="mono">{{ p.escrow_tx_hash || '—' }}</span>
            </div>
            <p class="muted" *ngIf="!(d.payments || []).length">Aucun paiement enregistré.</p>
          </article>
        </section>

        <section class="grid-bot">
          <article class="card wide">
            <h2>Chat mission ({{ d.chat_messages?.length || 0 }})</h2>
            <div class="chat" *ngFor="let m of d.chat_messages || []">
              <strong>{{ m.sender?.first_name }} {{ m.sender?.last_name }}</strong>
              <span>{{ m.content || m.message }}</span>
              <em>{{ m.created_at | date:'short' }}</em>
            </div>
            <p class="muted" *ngIf="!(d.chat_messages || []).length">Aucun message.</p>
          </article>

          <article class="card">
            <h2>Preuves mission ({{ d.proofs?.length || 0 }})</h2>
            <a class="link" *ngFor="let p of d.proofs || []" [href]="p.file" target="_blank" rel="noopener">
              {{ p.title || p.proof_type }}
            </a>
            <p class="muted" *ngIf="!(d.proofs || []).length">Aucune preuve mission.</p>
          </article>

          <article class="card">
            <h2>Localisation GPS ({{ d.gps_trail?.length || 0 }})</h2>
            <div class="gps" *ngFor="let g of gpsPoints">
              {{ g.latitude }}, {{ g.longitude }}
              <span class="muted">{{ g.recorded_at | date:'short' }}</span>
            </div>
            <p class="muted" *ngIf="!gpsPoints.length">Aucun point GPS.</p>
          </article>
        </section>

        <article class="card" *ngIf="dispute?.decision && dispute?.decision !== 'pending'">
          <h2>Décision rendue</h2>
          <p class="verdict">{{ decisionLabel(dispute?.decision) }}</p>
          <p>{{ dispute?.decision_reason }}</p>
        </article>
      </ng-container>

      <div class="modal" *ngIf="openResolve" (click)="openResolve = false">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3>Rendre une décision</h3>
          <form [formGroup]="resolveForm" *ngIf="resolveForm">
            <label>Verdict *</label>
            <select formControlName="decision">
              <option value="">Choisir…</option>
              <option value="client_wins">Client gagne — remboursement total</option>
              <option value="provider_wins">Prestataire gagne — paiement total</option>
              <option value="split">Partage 50/50</option>
              <option value="partial_client">Remboursement partiel client</option>
              <option value="partial_provider">Paiement partiel prestataire</option>
            </select>
            <label>Justification écrite *</label>
            <textarea formControlName="decision_reason" rows="4"
              placeholder="Expliquez le verdict à partir des preuves et des défenses…"></textarea>
            <div class="amounts">
              <label>Remboursement client<input type="number" formControlName="client_refund_amount" min="0" /></label>
              <label>Paiement prestataire<input type="number" formControlName="provider_payment_amount" min="0" /></label>
              <label>Pénalité caution<input type="number" formControlName="deposit_penalty" min="0" /></label>
            </div>
          </form>
          <div class="modal-actions">
            <button type="button" (click)="openResolve = false">Annuler</button>
            <button type="button" class="btn-primary" [disabled]="!resolveForm?.valid || submitting" (click)="submitResolve()">
              {{ submitting ? 'Envoi…' : 'Confirmer le verdict' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading"><mat-spinner diameter="40"></mat-spinner><p>Chargement du dossier…</p></div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .page-head { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .back { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: #059669; cursor: pointer; font-weight: 600; }
    .head-main { flex: 1; h1 { margin: 0 0 4px; font-size: 22px; } p { margin: 0; color: #6b7280; font-size: 14px; } }
    .btn-primary { display: inline-flex; align-items: center; gap: 6px; background: #059669; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
    .grid-top, .grid-mid, .grid-bot { display: grid; gap: 12px; }
    .grid-top { grid-template-columns: 1fr 1.2fr 1.2fr; }
    .grid-mid { grid-template-columns: 1.2fr 1fr 1fr; }
    .grid-bot { grid-template-columns: 1.4fr 1fr 1fr; }
    @media (max-width: 960px) { .grid-top, .grid-mid, .grid-bot { grid-template-columns: 1fr; } }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.04);
      h2 { margin: 0 0 12px; font-size: 15px; } }
    .party.plaintiff { border-top: 3px solid #dc2626; }
    .party.defendant { border-top: 3px solid #2563eb; }
    .name { font-weight: 700; margin: 0 0 8px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 10px 0 2px; }
    .kv { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 13px; span { color: #6b7280; } }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; word-break: break-all; }
    .muted { color: #9ca3af; font-size: 12px; }
    .desc { margin-top: 10px; color: #374151; line-height: 1.45; }
    .ev, .hist, .pay, .chat, .gps { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .link { display: block; color: #059669; margin-bottom: 6px; }
    .verdict { font-size: 18px; font-weight: 800; color: #059669; }
    .loading { display: flex; flex-direction: column; align-items: center; padding: 80px; gap: 12px; color: #6b7280; }
    .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { background: #fff; border-radius: 14px; padding: 20px; width: min(520px, 100%); display: flex; flex-direction: column; gap: 10px;
      select, textarea, input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; margin-top: 4px; margin-bottom: 8px; }
      label { font-size: 13px; font-weight: 600; }
    }
    .amounts { display: grid; grid-template-columns: 1fr; gap: 6px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `]
})
export class AdminDisputeDetailComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  loading = true;
  error = '';
  disputeId = '';
  dossier: any = null;
  dispute: any = null;
  openResolve = false;
  submitting = false;
  resolveForm: FormGroup | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.disputeId = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  get isClosed(): boolean {
    return ['resolved', 'closed'].includes(this.dispute?.status);
  }

  get gpsPoints(): Array<{ latitude: number; longitude: number; recorded_at?: string }> {
    const trail = (this.dossier?.gps_trail || []) as Array<{ latitude: number; longitude: number; recorded_at?: string }>;
    return trail.slice(0, 40);
  }

  load(): void {
    if (!this.disputeId) return;
    this.loading = true;
    this.http.get(`${this.apiUrl}/disputes/${this.disputeId}/mission-dossier/`, { headers: this.h() }).subscribe({
      next: (data: any) => {
        this.dossier = data;
        this.dispute = data.dispute || null;
        const budget = Number(this.dispute?.mission_budget || data.mission?.budget || 0);
        this.resolveForm = this.fb.group({
          decision: ['', Validators.required],
          decision_reason: ['', [Validators.required, Validators.minLength(10)]],
          client_refund_amount: [0],
          provider_payment_amount: [0],
          deposit_penalty: [0],
        });
        this.resolveForm.get('decision')?.valueChanges.subscribe((decision: string) => {
          if (!this.resolveForm) return;
          if (decision === 'client_wins') {
            this.resolveForm.patchValue({ client_refund_amount: budget, provider_payment_amount: 0 }, { emitEvent: false });
          } else if (decision === 'provider_wins') {
            this.resolveForm.patchValue({ client_refund_amount: 0, provider_payment_amount: budget }, { emitEvent: false });
          } else if (decision === 'split') {
            const half = Math.round(budget / 2);
            this.resolveForm.patchValue({ client_refund_amount: half, provider_payment_amount: budget - half }, { emitEvent: false });
          }
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger le dossier litige.';
        this.loading = false;
      },
    });
  }

  submitResolve(): void {
    if (!this.resolveForm?.valid || !this.disputeId) return;
    this.submitting = true;
    const raw = this.resolveForm.getRawValue();
    this.http.post(`${this.apiUrl}/disputes/${this.disputeId}/resolve/`, {
      decision: raw.decision,
      decision_reason: String(raw.decision_reason || '').trim(),
      client_refund_amount: raw.client_refund_amount || 0,
      provider_payment_amount: raw.provider_payment_amount || 0,
      deposit_penalty: raw.deposit_penalty || 0,
    }, { headers: this.h() }).subscribe({
      next: () => {
        this.submitting = false;
        this.openResolve = false;
        this.snack.open('Décision enregistrée', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.error || err?.error?.details || 'Échec de la résolution';
        this.snack.open(typeof msg === 'string' ? msg : 'Échec de la résolution', 'Fermer', { duration: 5000 });
      },
    });
  }

  statusLabel(s?: string): string {
    const l: any = {
      open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves attendues',
      arbitration: 'Arbitrage', resolved: 'Résolu', appealed: 'En appel', closed: 'Fermé',
    };
    return l[s || ''] || s || '—';
  }

  reasonLabel(r?: string): string {
    const l: any = {
      non_delivery: 'Non livraison', late_delivery: 'Livraison en retard', damaged_item: 'Article endommagé',
      wrong_item: 'Mauvais article', poor_quality: 'Mauvaise qualité', incomplete_work: 'Travail incomplet',
      fake_proof: 'Fausse preuve', payment_issue: 'Problème de paiement', behavior: 'Comportement', other: 'Autre',
    };
    return l[r || ''] || r || '—';
  }

  decisionLabel(d?: string): string {
    const l: any = {
      client_wins: 'Client gagne', provider_wins: 'Prestataire gagne', split: 'Partage 50/50',
      partial_client: 'Remboursement partiel client', partial_provider: 'Paiement partiel prestataire',
    };
    return l[d || ''] || d || '—';
  }
}
