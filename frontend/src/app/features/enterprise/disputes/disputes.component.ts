import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import {
  EnterpriseService,
  EnterpriseDispute,
  EnterpriseMission,
} from '../../../core/services/enterprise.service';

interface DisputeDetail extends EnterpriseDispute {
  mission_budget?: number;
  mission_currency?: string;
  decision?: string;
  decision_reason?: string;
  requested_resolution?: string;
  client_refund_amount?: number;
  provider_payment_amount?: number;
  evidence?: Array<{
    id: string;
    evidence_type: string;
    title: string;
    description?: string;
    file?: string | null;
    created_at: string;
  }>;
  messages?: Array<{
    id: string;
    message: string;
    sender: { first_name: string; last_name: string };
    created_at: string;
  }>;
}

@Component({
  selector: 'app-enterprise-disputes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule,
    MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>gavel</mat-icon> Litiges</h1>
          <p>Consultez les litiges liés aux missions de l'entreprise</p>
        </div>
        <button mat-stroked-button type="button" (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Mission</mat-label>
          <mat-select [(ngModel)]="missionFilter" (selectionChange)="load()">
            <mat-option value="">Toutes les missions</mat-option>
            <mat-option *ngFor="let m of missions" [value]="m.id">{{ m.title }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Statut</mat-label>
          <mat-select [(ngModel)]="statusFilter" (selectionChange)="load()">
            <mat-option value="">Tous</mat-option>
            <mat-option value="open">Ouvert</mat-option>
            <mat-option value="under_review">En examen</mat-option>
            <mat-option value="pending_evidence">Preuves en attente</mat-option>
            <mat-option value="arbitration">Arbitrage</mat-option>
            <mat-option value="resolved">Résolu</mat-option>
            <mat-option value="closed">Fermé</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

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
              <div class="head">
                <h3>{{ d.mission_title }}</h3>
                <mat-chip [class]="'st-' + d.status">{{ statusLabel(d.status) }}</mat-chip>
              </div>
              <p class="reason">{{ reasonLabel(d.reason) }}</p>
              <p class="desc">{{ d.description | slice:0:140 }}{{ (d.description || '').length > 140 ? '…' : '' }}</p>
              <div class="card-footer">
                <span class="date">{{ d.created_at | date:'medium' }}</span>
                <button mat-button color="primary" type="button" (click)="openDispute(d); $event.stopPropagation()">
                  Consulter <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </mat-card>
            <p class="empty" *ngIf="!disputes.length">Aucun litige pour ces critères</p>
          </div>
        </div>

        <aside class="detail-col" *ngIf="selected">
          <div class="detail-panel">
            <div class="panel-header">
              <h2>Détail du litige</h2>
              <button mat-icon-button type="button" (click)="selected = null"><mat-icon>close</mat-icon></button>
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
                <span class="lbl">Décision</span>
                <strong>{{ decisionLabel(selected.decision) }}</strong>
                <p *ngIf="selected.decision_reason">{{ selected.decision_reason }}</p>
              </div>
              <mat-divider></mat-divider>
              <section class="section">
                <h3>Preuves ({{ (selected.evidence || []).length }})</h3>
                <div *ngFor="let e of selected.evidence || []" class="evidence-item">
                  <div>
                    <strong>{{ e.title }}</strong>
                    <span class="sub">{{ e.evidence_type }} · {{ e.created_at | date:'short' }}</span>
                  </div>
                  <a *ngIf="e.file" [href]="e.file" target="_blank" rel="noopener" mat-stroked-button>Voir</a>
                </div>
                <p class="empty-inline" *ngIf="!(selected.evidence || []).length">Aucune preuve.</p>
              </section>
            </ng-container>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .filters {
      display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
      mat-form-field { min-width: 220px; flex: 1; }
    }
    .layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .layout.with-detail { grid-template-columns: 1fr 1fr; }
    @media (max-width: 900px) { .layout.with-detail { grid-template-columns: 1fr; } }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .dispute-card { padding: 16px 18px; margin-bottom: 12px; cursor: pointer; border: 1px solid transparent;
      &:hover, &.active { border-color: #16a34a; box-shadow: 0 4px 12px rgba(22,163,74,0.12); }
    }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      h3 { margin: 0; font-size: 16px; }
    }
    .reason { font-weight: 600; font-size: 14px; margin: 8px 0 4px; }
    .desc { font-size: 14px; color: #6b7280; margin: 0 0 8px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .date { font-size: 11px; color: #9ca3af; }
    .detail-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; position: sticky; top: 16px; max-height: calc(100vh - 100px); overflow: auto; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
      h2 { margin: 0; font-size: 18px; }
    }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .info-block { margin-bottom: 14px;
      .lbl { display: block; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
      strong { display: block; margin-top: 2px; }
      p { margin: 4px 0 0; font-size: 14px; color: #374151; }
    }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .decision-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .section h3 { margin: 0 0 10px; font-size: 15px; }
    .evidence-item { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6;
      .sub { display: block; font-size: 12px; color: #9ca3af; }
    }
    .empty, .empty-inline { text-align: center; color: #9ca3af; padding: 24px 8px; font-size: 14px; }
    .st-open, .st-under_review, .st-pending_evidence, .st-arbitration {
      background: #fee2e2 !important; color: #991b1b !important;
    }
    .st-resolved, .st-closed { background: #d1fae5 !important; color: #065f46 !important; }
  `]
})
export class EnterpriseDisputesComponent implements OnInit {
  disputes: EnterpriseDispute[] = [];
  missions: EnterpriseMission[] = [];
  selected: DisputeDetail | null = null;
  loading = true;
  detailLoading = false;
  statusFilter = '';
  missionFilter = '';
  private apiUrl = environment.apiUrl;

  constructor(
    private enterpriseService: EnterpriseService,
    private http: HttpClient,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.enterpriseService.getMissions().subscribe({
      next: (m) => { this.missions = m; },
      error: () => {},
    });
    this.load();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getDisputes({
      status: this.statusFilter || undefined,
      mission: this.missionFilter || undefined,
    }).subscribe({
      next: (d) => { this.disputes = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openDispute(d: EnterpriseDispute): void {
    this.selected = d as DisputeDetail;
    this.detailLoading = true;
    this.http.get<DisputeDetail>(`${this.apiUrl}/disputes/${d.id}/`, { headers: this.h() }).subscribe({
      next: (full) => { this.selected = full; this.detailLoading = false; },
      error: () => {
        this.detailLoading = false;
        this.snack.open('Impossible de charger le litige', 'Fermer', { duration: 4000 });
      },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves en attente',
      arbitration: 'Arbitrage', resolved: 'Résolu', closed: 'Fermé',
    };
    return m[s] || s;
  }

  reasonLabel(r: string): string {
    const m: Record<string, string> = {
      non_delivery: 'Non-livraison', poor_quality: 'Qualité', damage: 'Dommages', fraud: 'Fraude', other: 'Autre',
      late_delivery: 'Retard', damaged_item: 'Endommagé', incomplete_work: 'Incomplet',
    };
    return m[r] || r;
  }

  decisionLabel(d: string): string {
    const m: Record<string, string> = {
      client_wins: 'Client gagne', provider_wins: 'Prestataire gagne', split: 'Partage 50/50',
      partial_client: 'Remb. partiel client', partial_provider: 'Paiement partiel prestataire',
    };
    return m[d] || d;
  }
}
