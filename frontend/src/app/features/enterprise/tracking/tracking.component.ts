import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, interval } from 'rxjs';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EnterpriseService, LiveGpsLocation } from '../../../core/services/enterprise.service';

const BAMAKO_CENTER: L.LatLngExpression = [12.6392, -8.0029];

interface DisplayLocation extends LiveGpsLocation {
  user_name: string;
  mission_title: string;
  recorded_at: string;
  is_active: boolean;
}

@Component({
  selector: 'app-enterprise-tracking',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>my_location</mat-icon> Carte GPS</h1>
          <p>Positions en direct de vos agents — WebSocket + secours REST</p>
        </div>
        <div class="header-actions">
          <span class="live-indicator ws" *ngIf="wsConnected">
            <span class="pulse"></span> Temps réel actif
          </span>
          <span class="live-indicator poll" *ngIf="!wsConnected && locations.length">
            <mat-icon>sync</mat-icon> Polling 10 s
          </span>
          <span class="agent-count" *ngIf="locations.length">{{ locations.length }} agent(s)</span>
          <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
        </div>
      </div>

      <div class="map-wrapper">
        <div #mapContainer class="map-container"></div>
        <div class="map-placeholder" *ngIf="!mapLoaded && !mapError">
          <mat-spinner diameter="36"></mat-spinner>
          <p>Chargement de la carte…</p>
        </div>
        <div class="map-error" *ngIf="mapError">
          <mat-icon>error_outline</mat-icon>
          <p>Impossible de charger la carte</p>
        </div>
      </div>

      <div class="loading" *ngIf="loading && !locations.length"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="loc-list" *ngIf="locations.length">
        <mat-card class="loc-card" *ngFor="let loc of locations" (click)="focusMarker(loc)">
          <mat-icon class="loc-icon">person_pin_circle</mat-icon>
          <div class="loc-info">
            <strong>{{ loc.user_name }}</strong>
            <span>{{ loc.mission_title }}</span>
            <span class="coords">{{ loc.latitude | number:'1.5-5' }}, {{ loc.longitude | number:'1.5-5' }}</span>
            <span class="time">{{ loc.recorded_at | date:'short' }}</span>
          </div>
          <mat-chip class="live">En direct</mat-chip>
        </mat-card>
      </div>
      <p class="empty" *ngIf="!loading && !locations.length">Aucune position GPS active sur vos missions</p>
    </div>
  `,
  styles: [`
    @import 'leaflet/dist/leaflet.css';

    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .live-indicator, .agent-count {
      display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
    }
    .live-indicator.ws { color: #059669; }
    .live-indicator.poll { color: #6b7280; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .agent-count { color: #374151; }
    .pulse {
      width: 8px; height: 8px; background: #10b981; border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .map-wrapper {
      position: relative; margin-bottom: 24px;
      .map-container { height: 420px; border-radius: 16px; overflow: hidden; z-index: 0; }
      .map-placeholder, .map-error {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 12px; color: #6b7280;
        background: #f3f4f6; border-radius: 16px;
      }
      .map-error mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ef4444; }
    }
    .loading { display: flex; justify-content: center; padding: 24px; }
    .loc-card {
      padding: 16px; display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
      cursor: pointer; transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    }
    .loc-icon { color: #3CB371; font-size: 32px; width: 32px; height: 32px; }
    .loc-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
      strong { font-size: 15px; } span { font-size: 13px; color: #6b7280; }
      .coords { font-family: monospace; font-size: 12px; }
    }
    mat-chip.live { background: #d1fae5 !important; color: #065f46 !important; }
    .empty { text-align: center; color: #9ca3af; padding: 32px; }
  `],
})
export class EnterpriseTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  locations: DisplayLocation[] = [];
  loading = true;
  mapLoaded = false;
  mapError = false;
  wsConnected = false;

  private map?: L.Map;
  private markers = new Map<string, L.Marker>();
  private refreshSub?: Subscription;
  private ws?: WebSocket;
  private wsFailed = false;
  private readonly wsBase = environment.wsUrl;

  constructor(
    private enterpriseService: EnterpriseService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.connectWebSocket();
    this.refreshSub = interval(10000).subscribe(() => {
      if (!this.wsConnected) this.load(false);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.ws?.close();
    this.map?.remove();
  }

  load(showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.enterpriseService.getLiveLocations().subscribe({
      next: (rows) => {
        this.locations = rows.map((r) => this.toDisplay(r));
        this.loading = false;
        if (this.mapLoaded) this.updateMarkers();
      },
      error: () => { this.loading = false; },
    });
  }

  focusMarker(loc: DisplayLocation): void {
    const marker = this.markers.get(loc.id);
    if (marker && this.map) {
      this.map.setView(marker.getLatLng(), 15);
      marker.openPopup();
    }
  }

  private connectWebSocket(): void {
    if (this.wsFailed) return;
    const token = this.authService.getToken();
    if (!token) return;

    const wsUrl = `${this.wsBase}/ws/tracking/enterprise/?token=${token}`;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { this.wsConnected = true; };
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'gps_update' && data.location) {
          this.applyLiveUpdate(data.location as LiveGpsLocation);
        }
      };
      this.ws.onerror = () => {
        this.wsFailed = true;
        this.wsConnected = false;
        this.ws?.close();
      };
      this.ws.onclose = () => {
        this.wsConnected = false;
      };
    } catch {
      this.wsFailed = true;
    }
  }

  private applyLiveUpdate(raw: LiveGpsLocation): void {
    const incoming = this.toDisplay(raw);
    const userId = raw.user?.id;
    const idx = this.locations.findIndex(
      (l) => l.id === incoming.id || (userId && l.user?.id === userId),
    );
    if (idx >= 0) {
      this.locations = [
        ...this.locations.slice(0, idx),
        incoming,
        ...this.locations.slice(idx + 1),
      ];
    } else {
      this.locations = [...this.locations, incoming];
    }
    if (this.mapLoaded) this.updateMarkers();
  }

  private toDisplay(r: LiveGpsLocation): DisplayLocation {
    const userName = r.user_name
      || [r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ')
      || 'Agent';
    return {
      ...r,
      user_name: userName,
      mission_title: r.mission_title || 'Mission',
      recorded_at: r.timestamp,
      is_active: true,
    };
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement || this.map) return;
    try {
      this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true }).setView(BAMAKO_CENTER, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);
      this.mapLoaded = true;
      this.updateMarkers();
    } catch {
      this.mapError = true;
    }
  }

  private updateMarkers(): void {
    if (!this.map) return;

    const activeIds = new Set(this.locations.map((l) => l.id));
    for (const [id, marker] of this.markers) {
      if (!activeIds.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    const icon = L.divIcon({
      className: 'agent-marker',
      html: '<div style="background:#3CB371;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const bounds: L.LatLngExpression[] = [];
    for (const loc of this.locations) {
      const latLng: L.LatLngExpression = [loc.latitude, loc.longitude];
      bounds.push(latLng);
      const popup = `<strong>${loc.user_name}</strong><br>${loc.mission_title}`;
      const existing = this.markers.get(loc.id);
      if (existing) {
        existing.setLatLng(latLng).setPopupContent(popup);
      } else {
        const marker = L.marker(latLng, { icon }).bindPopup(popup).addTo(this.map!);
        this.markers.set(loc.id, marker);
      }
    }

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }
}
