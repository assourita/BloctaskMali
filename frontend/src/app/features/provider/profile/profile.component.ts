import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Profil Prestataire</mat-card-title>
      </mat-card-header>
    </mat-card>
  `
})
export class ProviderProfileComponent {}
