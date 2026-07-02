import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { EnterpriseEmployee } from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

export interface EmployeeDetailDialogData {
  employee: EnterpriseEmployee;
  editing: boolean;
}

export interface EmployeeDetailDialogResult {
  action: 'save' | 'toggle' | 'delete' | 'close';
  payload?: Partial<EnterpriseEmployee>;
}

@Component({
  selector: 'app-employee-detail-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
  ],
  template: `
    <div class="dialog-wrap">
      <div class="dialog-header">
        <div class="avatar">{{ data.employee.first_name[0] }}{{ data.employee.last_name[0] }}</div>
        <div class="header-text">
          <h2>{{ data.employee.first_name }} {{ data.employee.last_name }}</h2>
          <mat-chip [class]="data.employee.is_active ? 'active' : 'inactive'">
            {{ data.employee.is_active ? 'Actif' : 'Inactif' }}
          </mat-chip>
        </div>
        <button mat-icon-button type="button" (click)="close()" aria-label="Fermer">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="dialog-body">
        <ng-container *ngIf="editing; else viewMode">
          <div class="form-grid">
            <input class="field" [(ngModel)]="form.first_name" placeholder="Prénom *" />
            <input class="field" [(ngModel)]="form.last_name" placeholder="Nom *" />
            <input class="field" [(ngModel)]="form.email" placeholder="Email" readonly />
            <input class="field" [(ngModel)]="form.phone" placeholder="Téléphone" />
            <input class="field" [(ngModel)]="form.position" placeholder="Poste" />
            <select class="field" [(ngModel)]="form.role">
              <option value="agent">Agent terrain</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
              <option value="hr">Ressources humaines</option>
              <option value="accountant">Comptable</option>
            </select>
          </div>
        </ng-container>

        <ng-template #viewMode>
          <div class="detail-row">
            <span class="label">Email</span>
            <span>{{ data.employee.email }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Téléphone</span>
            <span>{{ data.employee.phone || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Poste</span>
            <span>{{ data.employee.position || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Rôle</span>
            <span>{{ roleLabel(data.employee.role) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Missions terminées</span>
            <span>{{ data.employee.missions_completed }}</span>
          </div>
        </ng-template>
      </div>

      <mat-divider></mat-divider>

      <div class="dialog-actions">
        <ng-container *ngIf="editing; else actionsView">
          <button mat-button type="button" (click)="editing = false">Annuler</button>
          <button mat-raised-button color="primary" type="button" (click)="save()">
            <mat-icon>save</mat-icon> Enregistrer
          </button>
        </ng-container>
        <ng-template #actionsView>
          <button mat-stroked-button color="warn" type="button" (click)="remove()">
            <mat-icon>delete</mat-icon> Supprimer
          </button>
          <button mat-stroked-button type="button" (click)="toggle()">
            {{ data.employee.is_active ? 'Désactiver' : 'Activer' }}
          </button>
          <button mat-raised-button color="primary" type="button" (click)="editing = true">
            <mat-icon>edit</mat-icon> Modifier
          </button>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrap { width: min(480px, 92vw); }
    .dialog-header {
      display: flex; align-items: flex-start; gap: 14px; padding: 20px 20px 16px;
    }
    .avatar {
      width: 52px; height: 52px; border-radius: 50%; background: #3CB371; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;
    }
    .header-text { flex: 1;
      h2 { margin: 0 0 8px; font-size: 18px; }
    }
    mat-chip.active { background: #d1fae5 !important; color: #065f46 !important; }
    mat-chip.inactive { background: #f3f4f6 !important; color: #6b7280 !important; }
    .dialog-body { padding: 16px 20px; max-height: 50vh; overflow-y: auto; }
    .detail-row {
      display: flex; justify-content: space-between; gap: 12px; padding: 10px 0;
      border-bottom: 1px solid #f3f4f6; font-size: 14px;
    }
    .detail-row .label { color: #6b7280; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field {
      padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;
      grid-column: span 1;
    }
    .field:nth-child(3), .field:nth-child(4) { grid-column: span 2; }
    .dialog-actions {
      display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 16px 20px;
    }
  `],
})
export class EmployeeDetailPanelComponent {
  editing = false;
  form = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    role: 'agent',
  };

  constructor(
    private dialogRef: MatDialogRef<EmployeeDetailPanelComponent, EmployeeDetailDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeDetailDialogData,
  ) {
    this.editing = data.editing;
    this.resetForm();
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  resetForm(): void {
    const e = this.data.employee;
    this.form = {
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      phone: e.phone || '',
      position: e.position || '',
      role: e.role || 'agent',
    };
  }

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  save(): void {
    this.dialogRef.close({ action: 'save', payload: { ...this.form } });
  }

  toggle(): void {
    this.dialogRef.close({ action: 'toggle' });
  }

  remove(): void {
    this.dialogRef.close({ action: 'delete' });
  }
}
