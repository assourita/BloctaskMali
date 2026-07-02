import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: 'client' | 'provider' | 'enterprise' | 'admin';
  is_active: boolean;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'not_submitted' | 'not_required';
  created_at: string;
  last_login?: string;
  phone_number?: string;
  wallet_address?: string;
  email_verified: boolean;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  styleUrls: ['./users.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div class="users-container" [class.panel-open]="selectedUser">

      <!-- ===== SIDE PANEL ===== -->
      <div class="side-panel" *ngIf="selectedUser" [@slideIn]>
        <div class="panel-header">
          <div class="panel-avatar">{{getInitials(selectedUser)}}</div>
          <div class="panel-title">
            <h2>{{selectedUser.first_name}} {{selectedUser.last_name}}</h2>
            <span class="badge" [class]="selectedUser.user_type">{{getTypeLabel(selectedUser.user_type)}}</span>
          </div>
          <button class="panel-close" (click)="closePanel()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Tabs: Détails / Modifier -->
        <div class="panel-tabs">
          <button class="panel-tab" [class.active]="panelTab === 'details'" (click)="panelTab = 'details'">
            <mat-icon>info</mat-icon> Détails
          </button>
          <button class="panel-tab" [class.active]="panelTab === 'edit'" (click)="panelTab = 'edit'">
            <mat-icon>edit</mat-icon> Modifier
          </button>
        </div>

        <!-- TAB: Détails -->
        <div class="panel-body" *ngIf="panelTab === 'details'">
          <div class="detail-section">
            <div class="detail-label">Email</div>
            <div class="detail-value">{{selectedUser.email}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Nom d'utilisateur</div>
            <div class="detail-value">&#64;{{selectedUser.username}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Téléphone</div>
            <div class="detail-value">{{selectedUser.phone_number || '—'}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Statut compte</div>
            <div class="detail-value">
              <span class="badge" [class]="selectedUser.is_active ? 'status-active' : 'status-inactive'">
                {{selectedUser.is_active ? 'Actif' : 'Inactif'}}
              </span>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Statut KYC</div>
            <div class="detail-value">
              <span class="badge" [class]="selectedUser.kyc_status">{{getKycLabel(selectedUser.kyc_status)}}</span>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Email vérifié</div>
            <div class="detail-value">{{selectedUser.email_verified ? 'Oui' : 'Non'}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Wallet</div>
            <div class="detail-value wallet-addr">{{selectedUser.wallet_address || '—'}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Inscription</div>
            <div class="detail-value">{{selectedUser.created_at | date:'dd/MM/yyyy HH:mm'}}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Dernière connexion</div>
            <div class="detail-value">{{selectedUser.last_login ? (selectedUser.last_login | date:'dd/MM/yyyy HH:mm') : 'Jamais'}}</div>
          </div>

          <!-- Actions rapides -->
          <div class="panel-actions">
            <button class="action-btn toggle" (click)="toggleUserStatus(selectedUser)">
              <mat-icon>{{selectedUser.is_active ? 'block' : 'check_circle'}}</mat-icon>
              {{selectedUser.is_active ? 'Désactiver' : 'Activer'}}
            </button>
            <button class="action-btn kyc-verify" *ngIf="selectedUser.kyc_status === 'pending'" (click)="verifyUserKyc(selectedUser)">
              <mat-icon>verified_user</mat-icon> Valider KYC
            </button>
            <button class="action-btn kyc-reject" *ngIf="selectedUser.kyc_status === 'pending'" (click)="rejectUserKyc(selectedUser)">
              <mat-icon>cancel</mat-icon> Rejeter KYC
            </button>
            <button class="action-btn danger" (click)="confirmDeleteUser(selectedUser)">
              <mat-icon>delete</mat-icon> Supprimer
            </button>
          </div>
        </div>

        <!-- TAB: Modifier -->
        <div class="panel-body" *ngIf="panelTab === 'edit' && editForm">
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()" class="edit-form">
            <div class="form-row">
              <label>Prénom</label>
              <input formControlName="first_name" class="form-input" />
            </div>
            <div class="form-row">
              <label>Nom</label>
              <input formControlName="last_name" class="form-input" />
            </div>
            <div class="form-row">
              <label>Email</label>
              <input formControlName="email" class="form-input" />
            </div>
            <div class="form-row">
              <label>Téléphone</label>
              <input formControlName="phone_number" class="form-input" />
            </div>
            <div class="form-row">
              <label>Type</label>
              <select formControlName="user_type" class="form-select">
                <option value="client">Client</option>
                <option value="provider">Prestataire</option>
                <option value="enterprise">Entreprise</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-row">
              <label>Statut KYC</label>
              <select formControlName="kyc_status" class="form-select">
                <option value="not_required">Non requis</option>
                <option value="pending">En attente</option>
                <option value="verified">Vérifié</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
            <div class="form-row checkbox-row">
              <label>
                <input type="checkbox" formControlName="is_active" />
                Compte actif
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="panelTab = 'details'">Annuler</button>
              <button type="submit" class="btn-save" [disabled]="editForm.invalid || saving">
                <mat-icon>save</mat-icon>
                {{saving ? 'Enregistrement...' : 'Enregistrer'}}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Overlay pour fermer le panel -->
      <div class="panel-overlay" *ngIf="selectedUser" (click)="closePanel()"></div>

      <!-- ===== MODAL AJOUT UTILISATEUR ===== -->
      <div class="modal-backdrop" *ngIf="showAddModal" (click)="closeAddModal()">
        <div class="modal-box" (click)="$event.stopPropagation()" [@slideIn]>
          <div class="modal-header">
            <div class="modal-title">
              <mat-icon>person_add</mat-icon>
              <h2>Ajouter un utilisateur</h2>
            </div>
            <button class="panel-close" (click)="closeAddModal()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="addForm" (ngSubmit)="submitAddUser()" class="modal-form" *ngIf="addForm">
            <div class="modal-form-grid">
              <div class="form-row">
                <label>Prénom *</label>
                <input formControlName="first_name" class="form-input" placeholder="ex: Kofi" />
              </div>
              <div class="form-row">
                <label>Nom *</label>
                <input formControlName="last_name" class="form-input" placeholder="ex: Asante" />
              </div>
              <div class="form-row">
                <label>Email *</label>
                <input formControlName="email" class="form-input" type="email" placeholder="ex: kofi@email.com" />
              </div>
              <div class="form-row">
                <label>Téléphone</label>
                <input formControlName="phone_number" class="form-input" placeholder="ex: +22507010203" />
              </div>
              <div class="form-row">
                <label>Nom d'utilisateur *</label>
                <input formControlName="username" class="form-input" placeholder="ex: kofiasante" />
              </div>
              <div class="form-row">
                <label>Mot de passe *</label>
                <input formControlName="password" class="form-input" type="password" placeholder="Min. 8 caractères" />
              </div>
              <div class="form-row">
                <label>Confirmer le mot de passe *</label>
                <input formControlName="password_confirm" class="form-input" type="password" placeholder="Répéter le mot de passe" />
              </div>
              <div class="form-row">
                <label>Type *</label>
                <select formControlName="user_type" class="form-select">
                  <option value="client">Client</option>
                  <option value="provider">Prestataire</option>
                  <option value="enterprise">Entreprise</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div class="form-row">
                <label>Statut KYC</label>
                <select formControlName="kyc_status" class="form-select">
                  <option value="not_required">Non requis</option>
                  <option value="pending">En attente</option>
                  <option value="verified">Vérifié</option>
                </select>
              </div>
            </div>
            <div class="form-row checkbox-row" style="margin-top:8px">
              <label>
                <input type="checkbox" formControlName="is_active" />
                Compte actif immédiatement
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeAddModal()">Annuler</button>
              <button type="submit" class="btn-save" [disabled]="addForm.invalid || saving">
                <mat-icon>person_add</mat-icon>
                {{saving ? "Création..." : "Créer l'utilisateur"}}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>Gestion des Utilisateurs</h1>
            <p>
              <strong>{{ dataSource.data.length }}</strong> utilisateurs
              <span *ngIf="isFiltered"> · <em>{{ filteredCount }} affiché(s)</em></span>
              sur la plateforme
            </p>
          </div>
          <div class="header-actions">
            <button class="btn-add" (click)="openAddUserDialog()">
              <mat-icon>add</mat-icon>
              Ajouter un utilisateur
            </button>
            <button class="btn-refresh" (click)="loadUsers()">
              <mat-icon>refresh</mat-icon>
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row" *ngIf="!loading">
        <mat-card class="stat-card total">
          <div class="stat-icon-wrap"><mat-icon>people</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total | number }}</span>
            <span class="stat-label">Total utilisateurs</span>
            <span class="stat-sub">Tous profils confondus</span>
          </div>
        </mat-card>
        <mat-card class="stat-card clients">
          <div class="stat-icon-wrap"><mat-icon>person</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.clients | number }}</span>
            <span class="stat-label">Clients</span>
            <span class="stat-sub">{{ pct(stats.clients, stats.total) }}% du total</span>
          </div>
        </mat-card>
        <mat-card class="stat-card providers">
          <div class="stat-icon-wrap"><mat-icon>work</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.providers | number }}</span>
            <span class="stat-label">Prestataires</span>
            <span class="stat-sub">{{ pct(stats.providers, stats.total) }}% du total</span>
          </div>
        </mat-card>
        <mat-card class="stat-card enterprises">
          <div class="stat-icon-wrap"><mat-icon>business</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.enterprises | number }}</span>
            <span class="stat-label">Entreprises</span>
            <span class="stat-sub">{{ pct(stats.enterprises, stats.total) }}% du total</span>
          </div>
        </mat-card>
        <mat-card class="stat-card pending">
          <div class="stat-icon-wrap"><mat-icon>pending_actions</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pendingKyc | number }}</span>
            <span class="stat-label">KYC en attente</span>
            <span class="stat-sub" [class.warn]="stats.pendingKyc > 0">
              {{ stats.pendingKyc > 0 ? 'Action admin requise' : 'Aucun dossier en attente' }}
            </span>
          </div>
        </mat-card>
      </div>

      <!-- Recherche & filtres -->
      <mat-card class="filters-card" *ngIf="!loading">
        <div class="filters-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Rechercher un utilisateur</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()"
              placeholder="Nom, email, username, téléphone..."/>
            <mat-icon matPrefix>search</mat-icon>
            <button mat-icon-button matSuffix *ngIf="searchTerm" (click)="clearSearch()" type="button">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="filterType" (ngModelChange)="onFilterChange()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="client">Client</mat-option>
              <mat-option value="provider">Prestataire</mat-option>
              <mat-option value="enterprise">Entreprise</mat-option>
              <mat-option value="admin">Admin</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Statut KYC</mat-label>
            <mat-select [(ngModel)]="filterKyc" (ngModelChange)="onFilterChange()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="pending">En attente</mat-option>
              <mat-option value="verified">Vérifié</mat-option>
              <mat-option value="rejected">Rejeté</mat-option>
              <mat-option value="not_required">Non requis</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Compte</mat-label>
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="active">Actif</mat-option>
              <mat-option value="inactive">Inactif</mat-option>
            </mat-select>
          </mat-form-field>
          <button class="reset-btn" type="button" (click)="resetFilters()" *ngIf="isFiltered">
            <mat-icon>filter_alt_off</mat-icon>
            Réinitialiser
          </button>
        </div>
      </mat-card>


      <!-- Charts -->
      <div class="charts-row" *ngIf="!loading && dataSource.data.length > 0">
        <div class="chart-card">
          <div class="chart-title">Répartition des utilisateurs</div>
          <div class="chart-wrap"><canvas id="doughnutChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Statut des comptes</div>
          <div class="chart-wrap"><canvas id="statusChart"></canvas></div>
        </div>
        <div class="chart-card wide">
          <div class="chart-title">Statut KYC</div>
          <div class="chart-wrap"><canvas id="kycChart"></canvas></div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Chargement des utilisateurs...</p>
      </div>

      <!-- Empty State - No data at all -->
      <mat-card class="empty-container" *ngIf="!loading && dataSource.data.length === 0">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>Aucun utilisateur trouvé</h3>
        <p>Essayez de modifier vos critères de recherche ou ajoutez un nouvel utilisateur</p>
        <button mat-raised-button color="primary" (click)="openAddUserDialog()">
          <mat-icon>add</mat-icon>
          Ajouter un utilisateur
        </button>
      </mat-card>

      <!-- Empty State - filtered -->
      <mat-card class="empty-container" *ngIf="!loading && dataSource.data.length > 0 && dataSource.filteredData.length === 0">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>Aucun résultat</h3>
        <p>Aucun utilisateur ne correspond à votre recherche</p>
        <button mat-stroked-button (click)="resetFilters()">Effacer les filtres</button>
      </mat-card>

      <!-- Table -->
      <mat-card class="table-card" *ngIf="!loading && dataSource.filteredData.length > 0">
        <div class="table-header">
          <span class="results-count">{{dataSource.filteredData.length}} résultat(s)</span>
          <div class="table-actions">
            <button mat-icon-button [matMenuTriggerFor]="exportMenu" matTooltip="Exporter">
              <mat-icon>download</mat-icon>
            </button>
            <mat-menu #exportMenu="matMenu">
              <button mat-menu-item (click)="exportToCSV()">
                <mat-icon>description</mat-icon>
                <span>Exporter en CSV</span>
              </button>
              <button mat-menu-item (click)="exportToExcel()">
                <mat-icon>table_chart</mat-icon>
                <span>Exporter en Excel</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <table mat-table [dataSource]="dataSource" matSort class="users-table">
          <!-- Avatar Column -->
          <ng-container matColumnDef="avatar">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let user">
              <div class="user-cell">
                <div class="user-avatar">{{getInitials(user)}}</div>
              </div>
            </td>
          </ng-container>

          <!-- User Info Column -->
          <ng-container matColumnDef="userInfo">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Utilisateur</th>
            <td mat-cell *matCellDef="let user">
              <div class="user-cell">
                <div class="user-avatar">{{getInitials(user)}}</div>
                <div class="user-info">
                  <span class="user-name">{{user.first_name}} {{user.last_name}}</span>
                  <span class="user-email">{{user.email}}</span>
                  <span class="user-username">&#64;{{user.username}}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Type Column -->
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
            <td mat-cell *matCellDef="let user">
              <span class="badge" [class]="user.user_type">{{getTypeLabel(user.user_type)}}</span>
            </td>
          </ng-container>

          <!-- KYC Column -->
          <ng-container matColumnDef="kyc">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>KYC</th>
            <td mat-cell *matCellDef="let user">
              <span class="badge" [class]="user.kyc_status">{{getKycLabel(user.kyc_status)}}</span>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let user">
              <span class="badge" [class]="user.is_active ? 'status-active' : 'status-inactive'">
                {{user.is_active ? 'Actif' : 'Inactif'}}
              </span>
            </td>
          </ng-container>

          <!-- Created At Column -->
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Inscription</th>
            <td mat-cell *matCellDef="let user">
              {{user.created_at | date:'dd/MM/yyyy'}}
            </td>
          </ng-container>

          <!-- Last Login Column -->
          <ng-container matColumnDef="lastLogin">
            <th mat-header-cell *matHeaderCellDef>Dernière connexion</th>
            <td mat-cell *matCellDef="let user">
              {{user.last_login ? (user.last_login | date:'dd/MM/yyyy HH:mm') : 'Jamais'}}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">Actions</th>
            <td mat-cell *matCellDef="let user" class="actions-cell">
              <button class="btn-view" (click)="viewUser(user)" matTooltip="Voir le profil">
                <mat-icon>visibility</mat-icon>
              </button>
              <button class="btn-edit" (click)="editUser(user)" matTooltip="Modifier">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matMenuTriggerFor]="userMenu" class="btn-more" matTooltip="Plus d'actions">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #userMenu="matMenu" class="quick-actions-menu">
                <button mat-menu-item (click)="toggleUserStatus(user)">
                  <mat-icon>{{user.is_active ? 'block' : 'check_circle'}}</mat-icon>
                  <span>{{user.is_active ? 'Désactiver' : 'Activer'}}</span>
                </button>
                <button mat-menu-item (click)="verifyUserKyc(user)" *ngIf="user.kyc_status === 'pending'">
                  <mat-icon color="primary">verified_user</mat-icon>
                  <span>Vérifier KYC</span>
                </button>
                <button mat-menu-item (click)="rejectUserKyc(user)" *ngIf="user.kyc_status === 'pending'">
                  <mat-icon color="warn">cancel</mat-icon>
                  <span>Rejeter KYC</span>
                </button>
                <button mat-menu-item (click)="resetUserPassword(user)">
                  <mat-icon>lock_reset</mat-icon>
                  <span>Réinitialiser le mot de passe</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteUser(user)" class="text-danger">
                  <mat-icon color="warn">delete</mat-icon>
                  <span>Supprimer</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              (click)="openPanel(row)"
              [class.selected-row]="selectedUser?.id === row.id"
              class="clickable-row"></tr>
        </table>

        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
      </mat-card>
    </div>
  `
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<User>([]);
  loading = true;
  displayedColumns = ['userInfo', 'type', 'kyc', 'status', 'createdAt', 'lastLogin', 'actions'];

  selectedUser: User | null = null;
  panelTab: 'details' | 'edit' = 'details';
  editForm: FormGroup | null = null;
  saving = false;

  showAddModal = false;
  addForm: FormGroup | null = null;

  searchTerm = '';
  filterType = '';
  filterKyc = '';
  filterStatus = '';

  stats = {
    total: 0,
    clients: 0,
    providers: 0,
    enterprises: 0,
    pendingKyc: 0,
    admins: 0,
  };

  get filteredCount(): number {
    return this.dataSource.filteredData?.length ?? 0;
  }

  get isFiltered(): boolean {
    return !!(this.searchTerm || this.filterType || this.filterKyc || this.filterStatus);
  }

  private apiUrl = environment.apiUrl;
  private charts: Chart[] = [];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getMockUsers(): User[] {
    return [
      {
        id: '1',
        email: 'admin@blocktask.ci',
        username: 'admin',
        first_name: 'Admin',
        last_name: 'System',
        user_type: 'admin',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-01-15T10:30:00Z',
        last_login: '2024-06-13T15:45:00Z',
        phone_number: '+225 01 02 03 04 05',
        email_verified: true
      },
      {
        id: '2',
        email: 'jean.dupont@email.com',
        username: 'jeandupont',
        first_name: 'Jean',
        last_name: 'Dupont',
        user_type: 'client',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-02-20T14:15:00Z',
        last_login: '2024-06-12T09:20:00Z',
        phone_number: '+225 07 08 09 10 11',
        email_verified: true
      },
      {
        id: '3',
        email: 'marie.martin@email.com',
        username: 'mariemartin',
        first_name: 'Marie',
        last_name: 'Martin',
        user_type: 'provider',
        is_active: true,
        kyc_status: 'pending',
        created_at: '2024-03-10T11:00:00Z',
        last_login: '2024-06-13T08:30:00Z',
        phone_number: '+225 05 06 07 08 09',
        email_verified: true
      },
      {
        id: '4',
        email: 'tech.solutions@entreprise.com',
        username: 'techsolutions',
        first_name: 'Tech',
        last_name: 'Solutions',
        user_type: 'enterprise',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-01-25T09:00:00Z',
        last_login: '2024-06-11T16:00:00Z',
        phone_number: '+225 02 03 04 05 06',
        email_verified: true
      }
    ];
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/users/`, { headers: this.getHeaders() }).subscribe({
      next: (response: any) => {
        const users: User[] = Array.isArray(response) ? response : (response?.results ?? []);
        console.log('Users loaded:', users.length);
        this.dataSource.data = users;
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading users:', err);
        this.dataSource.data = this.getMockUsers();
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
        this.snackBar.open(
          'Données de démonstration chargées (API non disponible)',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  calculateStats(users?: User[]): void {
    const source = users ?? this.dataSource.filteredData ?? this.dataSource.data;
    this.stats = {
      total: source.length,
      clients: source.filter((u) => u.user_type === 'client').length,
      providers: source.filter((u) => u.user_type === 'provider').length,
      enterprises: source.filter((u) => u.user_type === 'enterprise').length,
      pendingKyc: source.filter((u) => u.kyc_status === 'pending').length,
      admins: source.filter((u) => u.user_type === 'admin').length,
    };
    setTimeout(() => this.renderCharts(), 100);
  }

  pct(part: number, total: number): string {
    if (!total) return '0';
    return ((part / total) * 100).toFixed(0);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const users = this.dataSource.filteredData.length
      ? this.dataSource.filteredData
      : this.dataSource.data;

    /* 1. Donut — répartition par type */
    const donutCanvas = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (donutCanvas) {
      this.charts.push(new Chart(donutCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Clients', 'Prestataires', 'Entreprises', 'Admins'],
          datasets: [{
            data: [
              this.stats.clients,
              this.stats.providers,
              this.stats.enterprises,
              users.filter(u => u.user_type === 'admin').length
            ],
            backgroundColor: ['#3CB371', '#4ECDC4', '#6C5CE7', '#FF6B6B'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      }));
    }

    /* 2. Bar — statut actif/inactif */
    const statusCanvas = document.getElementById('statusChart') as HTMLCanvasElement;
    if (statusCanvas) {
      const active   = users.filter(u => u.is_active).length;
      const inactive = users.filter(u => !u.is_active).length;
      this.charts.push(new Chart(statusCanvas, {
        type: 'bar',
        data: {
          labels: ['Actifs', 'Inactifs'],
          datasets: [{
            label: 'Comptes',
            data: [active, inactive],
            backgroundColor: ['#3CB371', '#FF6B6B'],
            borderRadius: 8,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      }));
    }

    /* 3. Bar horizontal — statut KYC */
    const kycCanvas = document.getElementById('kycChart') as HTMLCanvasElement;
    if (kycCanvas) {
      const kycLabels = ['Non requis', 'En attente', 'Vérifié', 'Rejeté', 'Non soumis'];
      const kycKeys   = ['not_required', 'pending', 'verified', 'rejected', 'not_submitted'];
      this.charts.push(new Chart(kycCanvas, {
        type: 'bar',
        data: {
          labels: kycLabels,
          datasets: [{
            label: 'Utilisateurs',
            data: kycKeys.map(k => users.filter(u => u.kyc_status === k).length),
            backgroundColor: ['#94a3b8', '#FFD93D', '#3CB371', '#FF6B6B', '#4ECDC4'],
            borderRadius: 8,
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: 'y' as const,
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      }));
    }
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const filters = JSON.parse(filter);

      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchesSearch =
          data.email.toLowerCase().includes(term) ||
          data.username.toLowerCase().includes(term) ||
          data.first_name.toLowerCase().includes(term) ||
          data.last_name.toLowerCase().includes(term) ||
          (data.phone_number || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (filters.type && data.user_type !== filters.type) return false;
      if (filters.kyc && data.kyc_status !== filters.kyc) return false;
      if (filters.status !== '' && data.is_active !== (filters.status === 'active')) return false;

      return true;
    };

    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm,
      type: this.filterType,
      kyc: this.filterKyc,
      status: this.filterStatus
    });
    this.calculateStats(this.dataSource.filteredData);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterType = '';
    this.filterKyc = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  getInitials(user: User): string {
    const f = user.first_name?.[0] || '';
    const l = user.last_name?.[0] || '';
    return (f + l).toUpperCase() || '?';
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'client': 'Client',
      'provider': 'Prestataire',
      'enterprise': 'Entreprise',
      'admin': 'Admin'
    };
    return labels[type] || type;
  }

  getKycLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'verified': 'Vérifié',
      'rejected': 'Rejeté',
      'not_submitted': 'Non soumis',
      'not_required': 'Non requis'
    };
    return labels[status] || status;
  }

  // CRUD Actions
  openAddUserDialog(): void {
    this.addForm = this.fb.group({
      first_name:   ['', Validators.required],
      last_name:    ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      username:     ['', Validators.required],
      password:         ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', Validators.required],
      phone_number: [''],
      user_type:    ['client', Validators.required],
      kyc_status:   ['not_required'],
      is_active:    [true]
    });
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addForm = null;
  }

  submitAddUser(): void {
    if (!this.addForm || this.addForm.invalid) return;
    this.saving = true;
    const payload = this.addForm.value;
    this.http.post<User>(`${this.apiUrl}/users/register/`, payload, { headers: this.getHeaders() }).subscribe({
      next: (newUser: any) => {
        const user: User = newUser.user ?? newUser;
        this.dataSource.data = [user, ...this.dataSource.data];
        this.calculateStats();
        this.saving = false;
        this.closeAddModal();
        this.snackBar.open(`Utilisateur ${user.first_name} ${user.last_name} créé !`, 'Fermer', { duration: 4000 });
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error ? JSON.stringify(err.error).slice(0, 120) : 'Erreur lors de la création';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  openPanel(user: User): void {
    this.selectedUser = user;
    this.panelTab = 'details';
    this.editForm = this.fb.group({
      first_name:   [user.first_name, Validators.required],
      last_name:    [user.last_name, Validators.required],
      email:        [user.email, [Validators.required, Validators.email]],
      phone_number: [user.phone_number || ''],
      user_type:    [user.user_type, Validators.required],
      kyc_status:   [user.kyc_status, Validators.required],
      is_active:    [user.is_active]
    });
  }

  closePanel(): void {
    this.selectedUser = null;
    this.editForm = null;
  }

  saveEdit(): void {
    if (!this.editForm || !this.selectedUser) return;
    this.saving = true;
    const payload = this.editForm.value;
    this.http.patch(`${this.apiUrl}/users/${this.selectedUser.id}/`, payload, { headers: this.getHeaders() }).subscribe({
      next: (updated: any) => {
        Object.assign(this.selectedUser!, payload);
        this.calculateStats();
        this.saving = false;
        this.panelTab = 'details';
        this.snackBar.open('Modifications enregistrées', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
      }
    });
  }

  confirmDeleteUser(user: User): void {
    if (confirm(`Supprimer définitivement ${user.first_name} ${user.last_name} ?`)) {
      this.http.delete(`${this.apiUrl}/users/${user.id}/`, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.dataSource.data = this.dataSource.data.filter(u => u.id !== user.id);
          this.calculateStats();
          this.closePanel();
          this.snackBar.open('Utilisateur supprimé', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 })
      });
    }
  }

  viewUser(user: User): void { this.openPanel(user); }
  editUser(user: User): void { this.openPanel(user); this.panelTab = 'edit'; }

  toggleUserStatus(user: User): void {
    const newStatus = !user.is_active;
    const action = newStatus ? 'activé' : 'désactivé';

    this.http.patch(`${this.apiUrl}/users/${user.id}/`, { is_active: newStatus }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        user.is_active = newStatus;
        this.snackBar.open(`Utilisateur ${action} avec succès`, 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open(`Erreur lors de l'activation`, 'Fermer', { duration: 3000 });
      }
    });
  }

  verifyUserKyc(user: User): void {
    this.http.patch(`${this.apiUrl}/users/${user.id}/`, { kyc_status: 'verified' }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        user.kyc_status = 'verified';
        this.calculateStats();
        this.snackBar.open('KYC vérifié avec succès', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la vérification KYC', 'Fermer', { duration: 3000 });
      }
    });
  }

  rejectUserKyc(user: User): void {
    const reason = prompt('Motif du rejet KYC (obligatoire) :');
    if (reason === null) return;
    if (!reason.trim()) {
      this.snackBar.open('Le motif de rejet est obligatoire', 'Fermer', { duration: 4000 });
      return;
    }
    this.http.patch(
      `${this.apiUrl}/users/${user.id}/`,
      { kyc_status: 'rejected', kyc_rejection_reason: reason.trim() },
      { headers: this.getHeaders() },
    ).subscribe({
      next: () => {
        user.kyc_status = 'rejected';
        this.snackBar.open('KYC rejeté', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors du rejet KYC', 'Fermer', { duration: 3000 });
      }
    });
  }

  resetUserPassword(user: User): void {
    if (!confirm(`Réinitialiser le mot de passe de ${user.email} ? Un mot de passe temporaire sera généré.`)) return;
    this.http.post<{ temporary_password: string; message: string }>(
      `${this.apiUrl}/users/${user.id}/reset-password/`,
      {},
      { headers: this.getHeaders() },
    ).subscribe({
      next: (res) => {
        prompt(`Mot de passe temporaire pour ${user.email} (copiez-le maintenant) :`, res.temporary_password);
        this.snackBar.open(res.message, 'Fermer', { duration: 5000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la réinitialisation', 'Fermer', { duration: 3000 });
      },
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${user.first_name} ${user.last_name} ? Cette action est irréversible.`)) {
      this.http.delete(`${this.apiUrl}/users/${user.id}/`, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.dataSource.data = this.dataSource.data.filter(u => u.id !== user.id);
          this.applyFilters();
          this.calculateStats();
          this.snackBar.open('Utilisateur supprimé avec succès', 'Fermer', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  exportToCSV(): void {
    const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Username', 'Type', 'Statut', 'KYC', 'Créé le'];
    const rows = this.dataSource.filteredData.map(u => [
      u.id,
      u.last_name,
      u.first_name,
      u.email,
      u.username,
      u.user_type,
      u.is_active ? 'Actif' : 'Inactif',
      u.kyc_status,
      u.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    this.snackBar.open('Export CSV téléchargé', 'Fermer', { duration: 3000 });
  }

  exportToExcel(): void {
    // For now, just export as CSV with .xlsx extension
    this.exportToCSV();
    this.snackBar.open('Export Excel téléchargé', 'Fermer', { duration: 3000 });
  }

}
