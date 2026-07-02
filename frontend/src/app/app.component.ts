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
      >
        <div
          class="sidebar-overlay"
          *ngIf="showSidebar && (sidebarService.isOpen$ | async)"
          (click)="sidebarService.setOpen(false)"
        ></div>
        <app-sidebar *ngIf="showSidebar"></app-sidebar>
        <div class="content">
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
      transition: margin-left 0.3s ease;
    }
    
    main.with-sidebar .content {
      margin-left: 0;
      transition: margin-left 0.3s ease;
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
    
    @media (max-width: 768px) {
      main.with-sidebar.sidebar-open .content {
        margin-left: 0;
        padding: 20px;
      }

      .sidebar-overlay {
        display: block;
        position: fixed;
        top: 64px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 99;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  showHeader = true;
  showSidebar = false;
  
  private noHeaderRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/landing'];
  private sidebarRoutes = ['/client', '/provider', '/enterprise', '/admin', '/help'];
  
  constructor(
    private router: Router,
    public sidebarService: SidebarService,
  ) {}
  
  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.url;
        this.showHeader = !this.noHeaderRoutes.some(route => url.startsWith(route));
        this.showSidebar = this.sidebarRoutes.some(route => url.startsWith(route));
      });
  }
}
