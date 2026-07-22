import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  order: number;
  is_active: boolean;
  mission_count?: number;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1>Catégories de missions</h1>
          <p>Gérez les catégories visibles pour les clients et prestataires</p>
        </div>
        <button mat-raised-button color="primary" (click)="startCreate()" *ngIf="!editing">
          <mat-icon>add</mat-icon> Nouvelle catégorie
        </button>
      </div>

      <mat-card class="form-card" *ngIf="editing">
        <h3>{{ form.id ? 'Modifier' : 'Créer' }} une catégorie</h3>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput [(ngModel)]="form.name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Icône Material</mat-label>
            <input matInput [(ngModel)]="form.icon" placeholder="cleaning_services" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="2" [(ngModel)]="form.description"></textarea>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ordre</mat-label>
            <input matInput type="number" [(ngModel)]="form.order" />
          </mat-form-field>
          <div class="toggle-row">
            <mat-slide-toggle [(ngModel)]="form.is_active">Active</mat-slide-toggle>
          </div>
        </div>
        <div class="form-actions">
          <button mat-button type="button" (click)="cancelEdit()">Annuler</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving || !form.name">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </mat-card>

      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="list" *ngIf="!loading">
        <mat-card class="cat-card" *ngFor="let c of categories">
          <div class="cat-main">
            <div class="cat-icon"><mat-icon>{{ c.icon || 'category' }}</mat-icon></div>
            <div>
              <h3>{{ c.name }} <span class="slug">{{ c.slug }}</span></h3>
              <p>{{ c.description || 'Aucune description' }}</p>
              <div class="meta">
                <span>{{ c.mission_count || 0 }} mission(s)</span>
                <span>· ordre {{ c.order }}</span>
                <span class="badge" [class.off]="!c.is_active">{{ c.is_active ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
          </div>
          <div class="cat-actions">
            <button mat-stroked-button type="button" (click)="edit(c)"><mat-icon>edit</mat-icon></button>
            <button mat-stroked-button type="button" (click)="toggleActive(c)">
              <mat-icon>{{ c.is_active ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 8px 0 32px; }
    .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
    .header h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .header p { margin: 0; color: #64748b; }
    .form-card { padding: 20px; margin-bottom: 20px; border-radius: 12px; }
    .form-card h3 { margin: 0 0 12px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .form-grid .full { grid-column: 1 / -1; }
    .toggle-row { display: flex; align-items: center; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .cat-card { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 16px; border-radius: 12px; }
    .cat-main { display: flex; gap: 14px; align-items: flex-start; min-width: 0; }
    .cat-icon { width: 44px; height: 44px; border-radius: 10px; background: #ecfdf5; color: #15803d; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cat-main h3 { margin: 0 0 4px; font-size: 1rem; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
    .slug { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    .cat-main p { margin: 0 0 6px; color: #64748b; font-size: 0.875rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; color: #64748b; }
    .badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .badge.off { background: #fee2e2; color: #991b1b; }
    .cat-actions { display: flex; gap: 8px; flex-shrink: 0; }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .cat-card { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class AdminCategoriesComponent implements OnInit {
  categories: CategoryRow[] = [];
  loading = true;
  saving = false;
  editing = false;
  form: Partial<CategoryRow> = { name: '', icon: 'category', description: '', order: 0, is_active: true };

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/missions/categories/`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.categories = Array.isArray(res) ? res : (res?.results ?? []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Impossible de charger les catégories', 'Fermer', { duration: 3000 });
      }
    });
  }

  startCreate(): void {
    this.editing = true;
    this.form = { name: '', icon: 'category', description: '', order: this.categories.length, is_active: true };
  }

  edit(c: CategoryRow): void {
    this.editing = true;
    this.form = { ...c };
  }

  cancelEdit(): void {
    this.editing = false;
    this.form = { name: '', icon: 'category', description: '', order: 0, is_active: true };
  }

  save(): void {
    this.saving = true;
    const payload = {
      name: this.form.name,
      icon: this.form.icon || 'category',
      description: this.form.description || '',
      order: Number(this.form.order) || 0,
      is_active: !!this.form.is_active,
    };
    const req = this.form.slug
      ? this.http.patch(`${this.apiUrl}/missions/categories/${this.form.slug}/`, payload, { headers: this.headers() })
      : this.http.post(`${this.apiUrl}/missions/categories/`, payload, { headers: this.headers() });

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.load();
        this.snack.open('Catégorie enregistrée', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err?.error?.error || 'Erreur enregistrement', 'Fermer', { duration: 3500 });
      }
    });
  }

  toggleActive(c: CategoryRow): void {
    this.http.patch(`${this.apiUrl}/missions/categories/${c.slug}/`, { is_active: !c.is_active }, { headers: this.headers() }).subscribe({
      next: () => this.load(),
      error: () => this.snack.open('Erreur mise à jour', 'Fermer', { duration: 3000 }),
    });
  }
}
