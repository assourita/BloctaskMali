import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface EnterpriseRow {
  id: string;
  user_id: string;
  company_name: string;
  email: string;
  phone?: string;
  city?: string;
  is_verified: boolean;
  is_active: boolean;
  total_employees: number;
  total_missions_posted: number;
  created_at?: string;
}

@Component({
  selector: 'app-admin-enterprises',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1>Entreprises</h1>
          <p>{{ enterprises.length }} entreprise(s) — vérifier et suivre les partenaires B2B</p>
        </div>
        <button mat-stroked-button type="button" (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search">
          <mat-label>Rechercher</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="search" (ngModelChange)="load()" placeholder="Nom, ville, email" />
        </mat-form-field>
        <select class="select" [(ngModel)]="verifiedFilter" (ngModelChange)="load()">
          <option value="">Toutes</option>
          <option value="true">Vérifiées</option>
          <option value="false">Non vérifiées</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="row" *ngFor="let e of enterprises">
          <div class="main">
            <div class="logo"><mat-icon>business</mat-icon></div>
            <div class="info">
              <h3>
                {{ e.company_name || 'Sans nom' }}
                <mat-icon class="ok" *ngIf="e.is_verified">verified</mat-icon>
              </h3>
              <p>{{ e.email }} · {{ e.city || '—' }}</p>
              <div class="meta">
                <span>{{ e.total_employees }} employé(s)</span>
                <span>{{ e.total_missions_posted }} mission(s)</span>
                <span class="chip" [class.off]="!e.is_active">{{ e.is_active ? 'Compte actif' : 'Inactif' }}</span>
              </div>
            </div>
          </div>
          <div class="actions">
            <button mat-raised-button color="primary" type="button" *ngIf="!e.is_verified" (click)="setVerified(e, true)" [disabled]="busyId === e.id">
              <mat-icon>verified</mat-icon> Vérifier
            </button>
            <button mat-stroked-button type="button" *ngIf="e.is_verified" (click)="setVerified(e, false)" [disabled]="busyId === e.id">
              Retirer vérif.
            </button>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!enterprises.length">
          <mat-icon>business_center</mat-icon>
          <p>Aucune entreprise trouvée.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 8px 0 32px; }
    .header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .header h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .header p { margin: 0; color: #64748b; }
    .filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .search { flex: 1; min-width: 220px; }
    .select { height: 48px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; background: #fff; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 16px; border-radius: 12px; }
    .main { display: flex; gap: 14px; min-width: 0; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: #ede9fe; color: #6d28d9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .info h3 { margin: 0 0 4px; display: flex; align-items: center; gap: 6px; font-size: 1rem; }
    .ok { color: #16a34a; font-size: 18px; width: 18px; height: 18px; }
    .info p { margin: 0 0 6px; color: #64748b; font-size: 0.85rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.75rem; color: #64748b; }
    .chip { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .chip.off { background: #fee2e2; color: #991b1b; }
    .actions { flex-shrink: 0; }
    .empty { text-align: center; padding: 48px; color: #94a3b8; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; }
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class AdminEnterprisesComponent implements OnInit {
  enterprises: EnterpriseRow[] = [];
  loading = true;
  search = '';
  verifiedFilter = '';
  busyId = '';

  private apiUrl = environment.apiUrl;
  private searchTimer: any;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetch(), 250);
  }

  private fetch(): void {
    this.loading = true;
    let params = new HttpParams();
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.verifiedFilter) params = params.set('verified', this.verifiedFilter);
    this.http.get<any>(`${this.apiUrl}/users/admin/enterprises/`, { headers: this.headers(), params }).subscribe({
      next: (res) => {
        this.enterprises = res?.results ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Impossible de charger les entreprises', 'Fermer', { duration: 3000 });
      }
    });
  }

  setVerified(e: EnterpriseRow, is_verified: boolean): void {
    this.busyId = e.id;
    this.http.post(`${this.apiUrl}/users/admin/enterprises/${e.id}/verify/`, { is_verified }, { headers: this.headers() }).subscribe({
      next: () => {
        this.busyId = '';
        e.is_verified = is_verified;
        this.snack.open(is_verified ? 'Entreprise vérifiée' : 'Vérification retirée', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busyId = '';
        this.snack.open('Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }
}
