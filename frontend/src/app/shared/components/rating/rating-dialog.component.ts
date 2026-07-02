import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface RatingData {
  missionId: string;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserType: 'client' | 'provider';
  missionTitle: string;
}

@Component({
  selector: 'app-rating-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
    MatChipsModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="rating-dialog">
      <h2 mat-dialog-title>
        <mat-icon>star</mat-icon>
        Noter {{ data.ratedUserType === 'client' ? 'le client' : 'le prestataire' }}
      </h2>
      
      <mat-dialog-content>
        <div class="rated-user-info">
          <div class="avatar">
            {{ data.ratedUserName.charAt(0) }}
          </div>
          <div>
            <h4>{{ data.ratedUserName }}</h4>
            <p class="mission-title">{{ data.missionTitle }}</p>
          </div>
        </div>

        <div class="rating-section">
          <label>Note globale</label>
          <div class="stars">
            <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                    (click)="setRating(star)"
                    [class.filled]="star <= rating">
              <mat-icon>{{ star <= rating ? 'star' : 'star_border' }}</mat-icon>
            </button>
          </div>
          <span class="rating-label">{{ getRatingLabel() }}</span>
        </div>

        <div class="criteria" *ngIf="data.ratedUserType === 'provider'">
          <h4>Critères spécifiques</h4>
          
          <div class="criterion">
            <label>Ponctualité</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.punctuality = star"
                      [class.filled]="star <= criteria.punctuality">
                <mat-icon>{{ star <= criteria.punctuality ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="criterion">
            <label>Communication</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.communication = star"
                      [class.filled]="star <= criteria.communication">
                <mat-icon>{{ star <= criteria.communication ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="criterion">
            <label>Service</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.service = star"
                      [class.filled]="star <= criteria.service">
                <mat-icon>{{ star <= criteria.service ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <div class="criteria" *ngIf="data.ratedUserType === 'client'">
          <h4>Critères spécifiques</h4>
          
          <div class="criterion">
            <label>Clarté des instructions</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.clarity = star"
                      [class.filled]="star <= criteria.clarity">
                <mat-icon>{{ star <= criteria.clarity ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="criterion">
            <label>Communication</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.communication = star"
                      [class.filled]="star <= criteria.communication">
                <mat-icon>{{ star <= criteria.communication ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="criterion">
            <label>Paiement</label>
            <div class="stars small">
              <button mat-icon-button *ngFor="let star of [1,2,3,4,5]" 
                      (click)="criteria.payment = star"
                      [class.filled]="star <= criteria.payment">
                <mat-icon>{{ star <= criteria.payment ? 'star' : 'star_border' }}</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <div class="tags-section">
          <label>Points forts (optionnel)</label>
          <mat-chip-listbox multiple [(ngModel)]="selectedTags">
            <mat-chip-option *ngFor="let tag of availableTags" [value]="tag">{{ tag }}</mat-chip-option>
          </mat-chip-listbox>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Votre commentaire</mat-label>
          <textarea matInput [(ngModel)]="comment" rows="4" 
                    placeholder="Partagez votre expérience..."></textarea>
        </mat-form-field>

        <div class="blockchain-info">
          <mat-icon>security</mat-icon>
          <span>Ce rating sera enregistré de manière immuable sur la blockchain</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Annuler</button>
        <button mat-raised-button color="primary" 
                (click)="submitRating()"
                [disabled]="rating === 0 || submitting">
          <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
          <span *ngIf="!submitting">Envoyer l'avis</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .rating-dialog {
      min-width: 400px; max-width: 500px;
      
      h2 {
        display: flex; align-items: center; gap: 12px;
        mat-icon { color: #f59e0b; }
      }
      
      .rated-user-info {
        display: flex; align-items: center; gap: 12px;
        padding: 16px; background: #f9fafb; border-radius: 12px;
        margin-bottom: 24px;
        
        .avatar {
          width: 50px; height: 50px; border-radius: 50%;
          background: linear-gradient(135deg, #6C5CE7, #a29bfe);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 20px; font-weight: 600;
        }
        
        h4 { margin: 0 0 4px; font-size: 16px; }
        .mission-title { margin: 0; font-size: 13px; color: #666; }
      }
      
      .rating-section {
        text-align: center; margin-bottom: 24px;
        label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
        
        .stars {
          display: flex; justify-content: center; gap: 8px;
          button {
            color: #d1d5db;
            mat-icon { font-size: 40px; width: 40px; height: 40px; }
            &.filled { color: #f59e0b; }
            &:hover { transform: scale(1.1); }
          }
          &.small button mat-icon { font-size: 24px; width: 24px; height: 24px; }
        }
        
        .rating-label {
          display: block; margin-top: 8px;
          font-size: 14px; font-weight: 600; color: #374151;
        }
      }
      
      .criteria {
        margin-bottom: 24px;
        h4 { margin: 0 0 16px; font-size: 14px; color: #666; }
        
        .criterion {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
          label { font-size: 14px; color: #374151; }
          .stars button mat-icon { font-size: 20px; width: 20px; height: 20px; }
        }
      }
      
      .tags-section {
        margin-bottom: 20px;
        label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
      }
      
      .full-width { width: 100%; }
      
      .blockchain-info {
        display: flex; align-items: center; gap: 8px;
        background: #e0f2fe; padding: 12px; border-radius: 8px;
        margin-top: 16px; font-size: 13px; color: #0369a1;
        mat-icon { font-size: 18px; }
      }
    }
  `]
})
export class RatingDialogComponent implements OnInit {
  rating = 0;
  comment = '';
  submitting = false;
  
  criteria = {
    punctuality: 0,
    communication: 0,
    service: 0,
    clarity: 0,
    payment: 0
  };
  
  selectedTags: string[] = [];
  
  providerTags = ['Rapide', 'Professionnel', 'Aimable', 'Soigneux', 'Ponctuel', 'Communicant'];
  clientTags = ['Précis', 'Réactif', 'Gentil', 'Paiement rapide', 'Clair', 'Respectueux'];
  
  get availableTags(): string[] {
    return this.data.ratedUserType === 'provider' ? this.providerTags : this.clientTags;
  }

  private apiUrl = environment.apiUrl;

  constructor(
    public dialogRef: MatDialogRef<RatingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RatingData,
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  setRating(value: number): void {
    this.rating = value;
  }

  getRatingLabel(): string {
    const labels = ['', 'Médiocre', 'Passable', 'Bien', 'Très bien', 'Excellent'];
    return labels[this.rating] || '';
  }

  submitRating(): void {
    this.submitting = true;
    
    const payload: any = {
      mission_id: this.data.missionId,
      rated_user_id: this.data.ratedUserId,
      rating: this.rating,
      comment: this.comment,
      tags: this.selectedTags
    };
    
    // Ajouter les critères spécifiques
    if (this.data.ratedUserType === 'provider') {
      payload.punctuality = this.criteria.punctuality || this.rating;
      payload.communication = this.criteria.communication || this.rating;
      payload.service_quality = this.criteria.service || this.rating;
    } else {
      payload.clarity = this.criteria.clarity || this.rating;
      payload.communication = this.criteria.communication || this.rating;
      payload.payment_reliability = this.criteria.payment || this.rating;
    }
    
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    this.http.post(`${this.apiUrl}/ratings/`, payload, { headers }).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Avis enregistré avec succès !', 'Fermer', { 
          duration: 3000,
          panelClass: ['snack-success']
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.error || 'Erreur lors de l\'enregistrement';
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      }
    });
  }
}
