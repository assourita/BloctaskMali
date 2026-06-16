import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-client-tracking',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Suivi en temps réel</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Carte de suivi GPS...</p>
      </mat-card-content>
    </mat-card>
  `
})
export class ClientTrackingComponent {}
