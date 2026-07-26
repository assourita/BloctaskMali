import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import type { LandingCategory } from '../../../core/services/landing.service';
import { AuthService } from '../../../core/services/auth.service';

export interface ServiceCategoryDialogData {
  category: LandingCategory;
  accent?: string;
}

interface CategoryRuleInfo {
  slug?: string;
  label?: string;
  mission_type?: string;
  requires_deposit?: boolean;
  deposit_mode?: string;
  deposit_percent?: number;
  deposit_fixed?: number;
  deposit_floor?: number;
  deposit_cap?: number | null;
  deposit_reason?: string;
  requires_merchandise_value?: boolean;
  client_funds_purchase?: boolean;
  requires_vehicle?: boolean;
  requires_photo?: boolean;
  requires_signature?: boolean;
  requires_id_verification?: boolean;
  requires_gps_tracking?: boolean;
  requires_qr_validation?: boolean;
  enterprise_only?: boolean;
  min_reputation_score?: number;
  requires_pickup?: boolean;
  requires_delivery?: boolean;
  show_contacts?: boolean;
  location_label?: string;
  date_label?: string;
  show_time_range?: boolean;
  requirement_labels?: string[];
  custom_fields?: Array<{ key?: string; label?: string; help_text?: string; required?: boolean; field_type?: string }>;
}

interface CategorySchema {
  category?: { name?: string; description?: string; icon?: string; slug?: string };
  rule?: CategoryRuleInfo;
  deposit_policy?: CategoryRuleInfo;
  enabled_blocks?: Array<{ key?: string; label?: string; description?: string }>;
  custom_fields?: CategoryRuleInfo['custom_fields'];
}

@Component({
  selector: 'app-service-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-wrap">
      <button mat-icon-button class="close-btn" (click)="close()" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>

      <div class="hero" [style.background]="data.accent || '#16a34a'">
        <div class="hero-icon">
          <mat-icon>{{ data.category.icon || 'category' }}</mat-icon>
        </div>
        <div>
          <h2>{{ data.category.name }}</h2>
          <p>{{ data.category.description || 'Service disponible sur BlockTask' }}</p>
        </div>
      </div>

      <div class="body" *ngIf="!loading; else loadingTpl">
        <div class="stats">
          <div class="stat">
            <strong>{{ data.category.open_mission_count || 0 }}</strong>
            <span>mission(s) ouverte(s)</span>
          </div>
          <div class="stat" *ngIf="data.category.provider_count != null">
            <strong>{{ data.category.provider_count }}</strong>
            <span>prestataire(s)</span>
          </div>
        </div>

        <section *ngIf="rule">
          <h3><mat-icon>info</mat-icon> Pour le client</h3>
          <ul class="info-list">
            <li>
              <mat-icon>place</mat-icon>
              <span>{{ rule.location_label || 'Lieu' }} à renseigner à la création</span>
            </li>
            <li>
              <mat-icon>event</mat-icon>
              <span>{{ rule.date_label || 'Date / échéance' }}{{ rule.show_time_range ? ' (avec plage horaire)' : '' }}</span>
            </li>
            <li *ngIf="rule.requires_pickup">
              <mat-icon>trip_origin</mat-icon>
              <span>Adresse de départ / prise en charge requise</span>
            </li>
            <li *ngIf="rule.requires_delivery">
              <mat-icon>flag</mat-icon>
              <span>Adresse de destination / livraison requise</span>
            </li>
            <li *ngIf="rule.show_contacts">
              <mat-icon>contact_phone</mat-icon>
              <span>Contacts échangés après acceptation et cautions</span>
            </li>
            <li *ngIf="rule.enterprise_only">
              <mat-icon>business</mat-icon>
              <span>Catégorie réservée aux comptes entreprise</span>
            </li>
          </ul>
        </section>

        <section *ngIf="(rule?.requirement_labels?.length || 0) > 0 || rule">
          <h3><mat-icon>engineering</mat-icon> Pour le prestataire</h3>
          <ul class="chips">
            <li *ngFor="let label of rule?.requirement_labels || []">{{ label }}</li>
            <li *ngIf="rule?.requires_vehicle && !(rule?.requirement_labels || []).length">Véhicule</li>
            <li *ngIf="rule?.requires_photo">Preuves photo</li>
            <li *ngIf="rule?.requires_signature">Signature</li>
            <li *ngIf="rule?.requires_gps_tracking">Suivi GPS</li>
            <li *ngIf="rule?.requires_id_verification">Identité vérifiée</li>
            <li *ngIf="rule?.requires_qr_validation">Validation QR</li>
            <li *ngIf="(rule?.min_reputation_score || 0) > 0">
              Réputation min. {{ rule?.min_reputation_score }}
            </li>
          </ul>
        </section>

        <section *ngIf="rule">
          <h3><mat-icon>security</mat-icon> Caution & escrow</h3>
          <div class="deposit-box" *ngIf="rule.requires_deposit; else noDeposit">
            <p class="deposit-mode">{{ depositModeLabel }}</p>
            <p *ngIf="rule.deposit_reason">{{ rule.deposit_reason }}</p>
            <ul class="info-list compact">
              <li *ngIf="rule.deposit_percent">
                <mat-icon>percent</mat-icon>
                <span>{{ rule.deposit_percent }}% {{ rule.deposit_mode === 'merchandise_or_budget' ? 'de la valeur marchandise (sinon budget)' : 'du budget mission' }}</span>
              </li>
              <li *ngIf="rule.deposit_fixed">
                <mat-icon>payments</mat-icon>
                <span>Montant fixe : {{ rule.deposit_fixed | number:'1.0-0' }} XOF</span>
              </li>
              <li *ngIf="rule.deposit_floor">
                <mat-icon>vertical_align_bottom</mat-icon>
                <span>Plancher : {{ rule.deposit_floor | number:'1.0-0' }} XOF</span>
              </li>
              <li *ngIf="rule.deposit_cap">
                <mat-icon>vertical_align_top</mat-icon>
                <span>Plafond : {{ rule.deposit_cap | number:'1.0-0' }} XOF</span>
              </li>
              <li *ngIf="rule.requires_merchandise_value">
                <mat-icon>inventory_2</mat-icon>
                <span>Le client doit indiquer la valeur de la marchandise</span>
              </li>
              <li *ngIf="rule.client_funds_purchase">
                <mat-icon>shopping_cart</mat-icon>
                <span>Le client bloque aussi le montant des courses (remboursé au prestataire à la livraison)</span>
              </li>
            </ul>

            <div class="preview">
              <p class="preview-title">Simulateur rapide</p>
              <div class="preview-fields">
                <label>
                  Budget mission (XOF)
                  <input type="number" [(ngModel)]="budgetPreview" (ngModelChange)="refreshPreview()" min="0" />
                </label>
                <label *ngIf="rule.requires_merchandise_value">
                  Valeur marchandise (XOF)
                  <input type="number" [(ngModel)]="merchandisePreview" (ngModelChange)="refreshPreview()" min="0" />
                </label>
              </div>
              <p class="preview-result" *ngIf="estimatedDeposit != null">
                Caution estimée :
                <strong>{{ estimatedDeposit | number:'1.0-0' }} XOF</strong>
              </p>
            </div>
          </div>
          <ng-template #noDeposit>
            <p class="muted">Aucune caution prestataire requise pour cette catégorie (paiement escrow client inchangé).</p>
          </ng-template>
        </section>

        <section *ngIf="(customFields?.length || 0) > 0">
          <h3><mat-icon>checklist</mat-icon> Champs demandés à la création</h3>
          <ul class="fields">
            <li *ngFor="let field of customFields">
              <strong>{{ field.label || field.key }}</strong>
              <span *ngIf="field.required" class="req">obligatoire</span>
              <p *ngIf="field.help_text">{{ field.help_text }}</p>
            </li>
          </ul>
        </section>

        <section *ngIf="(enabledBlocks?.length || 0) > 0">
          <h3><mat-icon>view_module</mat-icon> Blocs du formulaire</h3>
          <ul class="chips">
            <li *ngFor="let block of enabledBlocks">{{ block.label || block.key }}</li>
          </ul>
        </section>

        <p class="error" *ngIf="error">{{ error }}</p>
      </div>

      <ng-template #loadingTpl>
        <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
      </ng-template>

      <div class="actions">
        <button mat-stroked-button (click)="browseMissions()">Voir les missions</button>
        <button mat-raised-button color="primary" (click)="createMission()">
          Créer une mission
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrap { position: relative; max-height: 90vh; display: flex; flex-direction: column; }
    .close-btn { position: absolute; top: 8px; right: 8px; z-index: 2; color: #fff; }
    .hero {
      display: flex; gap: 14px; align-items: center;
      padding: 22px 48px 22px 20px; color: #fff;
      border-radius: 12px 12px 0 0;
    }
    .hero-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hero h2 { margin: 0 0 4px; font-size: 1.35rem; }
    .hero p { margin: 0; opacity: 0.92; font-size: 0.9rem; line-height: 1.4; }
    .body { padding: 18px 20px; overflow-y: auto; }
    .stats { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat {
      flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 12px; display: flex; flex-direction: column; gap: 2px;
    }
    .stat strong { font-size: 1.25rem; color: #15803d; }
    .stat span { font-size: 0.78rem; color: #64748b; }
    section { margin-bottom: 18px; }
    h3 {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 10px; font-size: 0.95rem; color: #0f172a;
    }
    h3 mat-icon { font-size: 20px; width: 20px; height: 20px; color: #16a34a; }
    .info-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .info-list li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.9rem; color: #334155; }
    .info-list mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; margin-top: 1px; }
    .info-list.compact li { font-size: 0.85rem; }
    .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .chips li {
      background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0;
      border-radius: 999px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600;
    }
    .deposit-box {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px;
    }
    .deposit-mode { margin: 0 0 8px; font-weight: 700; color: #92400e; }
    .deposit-box > p { margin: 0 0 10px; color: #78350f; font-size: 0.88rem; line-height: 1.45; }
    .preview { margin-top: 12px; padding-top: 12px; border-top: 1px solid #fcd34d; }
    .preview-title { margin: 0 0 8px; font-weight: 700; font-size: 0.85rem; color: #92400e; }
    .preview-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .preview-fields label {
      display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; color: #78350f; font-weight: 600;
    }
    .preview-fields input {
      border: 1px solid #fcd34d; border-radius: 8px; padding: 8px 10px; font-size: 0.9rem;
    }
    .preview-result { margin: 10px 0 0; color: #166534; font-size: 0.9rem; }
    .fields { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .fields li { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
    .fields strong { color: #0f172a; }
    .req { margin-left: 8px; font-size: 0.72rem; color: #b45309; font-weight: 700; text-transform: uppercase; }
    .fields p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }
    .muted { color: #64748b; font-size: 0.9rem; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .error { color: #b91c1c; font-size: 0.88rem; }
    .actions {
      display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
      padding: 14px 20px; border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 560px) {
      .preview-fields { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
      .actions button { width: 100%; }
    }
  `],
})
export class ServiceCategoryDialogComponent implements OnInit {
  loading = true;
  error = '';
  rule: CategoryRuleInfo | null = null;
  customFields: CategoryRuleInfo['custom_fields'] = [];
  enabledBlocks: Array<{ key?: string; label?: string; description?: string }> = [];
  budgetPreview = 25000;
  merchandisePreview = 50000;
  estimatedDeposit: number | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ServiceCategoryDialogData,
    private dialogRef: MatDialogRef<ServiceCategoryDialogComponent>,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
  ) {}

  get depositModeLabel(): string {
    const mode = this.rule?.deposit_mode || '';
    const map: Record<string, string> = {
      percent_budget: 'Caution = pourcentage du budget',
      merchandise_value: 'Caution = valeur marchandise',
      merchandise_or_budget: 'Caution liée à la valeur marchandise',
      fixed: 'Caution à montant fixe',
      none: 'Sans caution',
      percent: 'Caution proportionnelle',
    };
    return map[mode] || (this.rule?.requires_deposit ? 'Caution requise' : 'Sans caution');
  }

  ngOnInit(): void {
    const slug = this.data.category.slug;
    if (!slug) {
      this.loading = false;
      this.error = 'Catégorie indisponible.';
      return;
    }
    this.http.get<CategorySchema>(`${environment.apiUrl}/categories/${slug}/schema/`).subscribe({
      next: (schema) => {
        this.rule = schema.rule || schema.deposit_policy || null;
        this.customFields = schema.custom_fields || schema.rule?.custom_fields || [];
        this.enabledBlocks = schema.enabled_blocks || [];
        this.loading = false;
        this.refreshPreview();
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les détails de cette catégorie.';
      },
    });
  }

  refreshPreview(): void {
    if (!this.rule?.requires_deposit || !this.data.category.slug) {
      this.estimatedDeposit = null;
      return;
    }
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      const params = new URLSearchParams({
        budget: String(this.budgetPreview || 0),
        merchandise_value: String(this.merchandisePreview || 0),
      });
      this.http
        .get<{ estimated_deposit?: number }>(
          `${environment.apiUrl}/categories/${this.data.category.slug}/deposit_preview/?${params}`,
        )
        .subscribe({
          next: (res) => {
            this.estimatedDeposit = Number(res.estimated_deposit ?? 0);
          },
          error: () => {
            this.estimatedDeposit = null;
          },
        });
    }, 280);
  }

  browseMissions(): void {
    this.close();
    this.router.navigate(['/'], { fragment: 'missions' });
  }

  createMission(): void {
    this.close();
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.router.navigate(['/register'], {
        queryParams: { category: this.data.category.slug },
      });
      return;
    }
    const role = user.active_role || user.user_type;
    if (role === 'enterprise') {
      this.router.navigate(['/enterprise/missions/create'], {
        queryParams: { category: this.data.category.slug },
      });
      return;
    }
    this.router.navigate(['/client/missions/create'], {
      queryParams: { category: this.data.category.slug },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
