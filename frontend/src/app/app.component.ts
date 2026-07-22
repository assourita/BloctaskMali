import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { SidebarService } from './core/services/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent],
  template: `
    <div class="app-container">
      <app-header *ngIf="showHeader"></app-header>
      <main
        [class.with-header]="showHeader"
        [class.with-sidebar]="showSidebar"
        [class.sidebar-open]="showSidebar && (sidebarService.isOpen$ | async)"
        [class.bare]="!showHeader && !showSidebar"
      >
        <div
          class="sidebar-overlay"
          *ngIf="showSidebar && (sidebarService.isOpen$ | async)"
          (click)="sidebarService.setOpen(false)"
        ></div>
        <app-sidebar *ngIf="showSidebar"></app-sidebar>
        <div class="content" [class.bare-content]="!showHeader && !showSidebar">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }
    
    main {
      flex: 1;
      display: flex;
      position: relative;
    }
    
    main.with-header {
      margin-top: 64px;
    }
    
    main.with-sidebar {
      display: flex;
    }
    
    .content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      min-height: calc(100vh - 64px);
      transition: margin-left 0.3s ease, padding 0.3s ease;
    }

    .content.bare-content {
      padding: 0;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    main.with-sidebar .content {
      margin-left: 0;
      transition: margin-left 0.3s ease, padding 0.3s ease;
    }

    main.with-sidebar.sidebar-open .content {
      margin-left: 280px;
    }

    .sidebar-overlay {
      display: none;
    }
    
    /* Animation de page */
    .content ::ng-deep > * {
      animation: pageEnter 0.4s ease-out;
    }
    
    @keyframes pageEnter {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Mobile First - Mobile (< 768px) */
    @media (max-width: 767px) {
      main.with-header {
        margin-top: 56px; /* Smaller header on mobile */
      }

      .content {
        padding: 12px;
        min-height: calc(100vh - 56px);
        min-width: 0;
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden;
      }

      main.with-sidebar.sidebar-open .content {
        margin-left: 0;
        padding: 12px;
      }

      .sidebar-overlay {
        display: block;
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 99;
        backdrop-filter: blur(2px);
      }

      /* Reduce animation on mobile for better performance */
      .content ::ng-deep > * {
        animation: pageEnterMobile 0.3s ease-out;
      }
      
      @keyframes pageEnterMobile {
        from {
          opacity: 0;
          transform: translateY(15px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    }

    /* Tablet (768px - 1023px) */
    @media (min-width: 768px) and (max-width: 1023px) {
      .content {
        padding: 24px;
      }

      main.with-sidebar.sidebar-open .content {
        margin-left: 260px; /* Slightly smaller sidebar on tablet */
        padding: 24px;
      }

      .sidebar-overlay {
        display: none; /* No overlay on tablet */
      }
    }

    /* Desktop (1024px - 1439px) */
    @media (min-width: 1024px) and (max-width: 1439px) {
      .content {
        padding: 28px;
      }

      main.with-sidebar.sidebar-open .content {
        margin-left: 280px;
        padding: 28px;
      }
    }

    /* Large Desktop (1440px+) */
    @media (min-width: 1440px) {
      .content {
        padding: 32px;
        max-width: 1440px;
        margin-left: auto;
        margin-right: auto;
      }

      main.with-sidebar.sidebar-open .content {
        margin-left: 280px;
        padding: 40px;
        max-width: none;
      }
    }

    /* Small mobile (320px - 374px) */
    @media (max-width: 374px) {
      main.with-header {
        margin-top: 52px;
      }

      .content {
        padding: 12px;
        min-height: calc(100vh - 52px);
      }

      .sidebar-overlay {
        top: 52px;
      }
    }

    /* Landscape mobile */
    @media (max-height: 500px) and (orientation: landscape) {
      main.with-header {
        margin-top: 48px;
      }

      .content {
        padding: 12px 16px;
        min-height: calc(100vh - 48px);
      }

      .sidebar-overlay {
        top: 48px;
      }
    }

    /* High DPI displays */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .content {
        border-right: 0.5px solid rgba(0, 0, 0, 0.05);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .content,
      main.with-sidebar .content,
      main.with-sidebar.sidebar-open .content {
        transition: none;
      }

      .content ::ng-deep > * {
        animation: none;
      }
    }

    /* Print */
    @media print {
      .app-container {
        background: white;
      }

      main.with-header {
        margin-top: 0;
      }

      .content {
        padding: 0;
        overflow: visible;
        min-height: auto;
      }

      main.with-sidebar.sidebar-open .content {
        margin-left: 0;
      }

      .sidebar-overlay {
        display: none !important;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  showHeader = true;
  showSidebar = false;
  
  /** Routes sans header global (landing a sa propre navbar). */
  private noHeaderRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/landing', '/verify-email', '/wallet-connect'];
  private sidebarRoutes = ['/client', '/provider', '/enterprise', '/admin', '/help'];
  
  constructor(
    private router: Router,
    public sidebarService: SidebarService,
  ) {}
  
  ngOnInit(): void {
    this.updateChrome(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateChrome(event.urlAfterRedirects || event.url);
      });
  }

  private updateChrome(url: string): void {
    const path = (url.split('?')[0] || '/').replace(/\/+$/, '') || '/';
    this.showHeader = !this.noHeaderRoutes.some(route =>
      route === '/' ? path === '/' : path === route || path.startsWith(route + '/')
    );
    this.showSidebar = this.sidebarRoutes.some(route =>
      path === route || path.startsWith(route + '/')
    );
  }
}
