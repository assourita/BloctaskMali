import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface LogoPreviewDialogData {
  src?: string;
  title?: string;
}

@Component({
  selector: 'app-logo-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="wrap">
      <button mat-icon-button class="close" type="button" (click)="close()" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="src" [alt]="title" class="logo-full" />
      <p class="caption">{{ title }}</p>
    </div>
  `,
  styles: [`
    .wrap {
      position: relative;
      padding: 28px 24px 20px;
      text-align: center;
      background: #0b1220;
      min-width: min(92vw, 420px);
    }
    .close {
      position: absolute;
      top: 6px;
      right: 6px;
      color: #fff;
    }
    .logo-full {
      width: min(78vw, 340px);
      height: auto;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 18px;
      display: block;
      margin: 0 auto;
      background: transparent;
    }
    .caption {
      margin: 14px 0 0;
      color: #e2e8f0;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 0.95rem;
    }
  `],
})
export class LogoPreviewDialogComponent {
  src: string;
  title: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: LogoPreviewDialogData,
    private dialogRef: MatDialogRef<LogoPreviewDialogComponent>,
  ) {
    this.src = data?.src || 'assets/images/logo-blocktask-header.png';
    this.title = data?.title || 'BlockTask';
  }

  close(): void {
    this.dialogRef.close();
  }
}
