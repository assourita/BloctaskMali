import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-google-sign-in',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-wrap" *ngIf="enabled">
      <div #googleBtn class="google-btn-host"></div>
      <p class="google-hint" *ngIf="!clientId">Configurez googleClientId dans environment.ts</p>
    </div>
  `,
  styles: [`
    .google-wrap { width: 100%; display: flex; flex-direction: column; align-items: stretch; }
    .google-btn-host { display: flex; justify-content: center; min-height: 44px; }
    .google-hint { font-size: 12px; color: #94a3b8; text-align: center; margin: 8px 0 0; }
  `],
})
export class GoogleSignInButtonComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtn!: ElementRef<HTMLDivElement>;
  @Output() credential = new EventEmitter<string>();
  @Input() text: 'signin_with' | 'signup_with' = 'signin_with';

  clientId = environment.googleClientId || '';
  enabled = !!environment.googleClientId;

  ngAfterViewInit(): void {
    if (!this.clientId) return;
    this.loadScript()
      .then(() => this.renderButton())
      .catch(() => {});
  }

  private loadScript(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-gsi]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['googleGsi'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google GSI script failed'));
      document.head.appendChild(script);
    });
  }

  private renderButton(): void {
    if (!window.google?.accounts?.id || !this.googleBtn?.nativeElement) return;
    window.google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: { credential?: string }) => {
        if (response?.credential) this.credential.emit(response.credential);
      },
    });
    window.google.accounts.id.renderButton(this.googleBtn.nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: this.text,
      width: 320,
      locale: 'fr',
    });
  }
}
