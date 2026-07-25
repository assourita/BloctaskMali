import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, Subscription, interval, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EnterpriseService,
  EnterpriseEmployee,
  EmployeeAvailability,
  LiveGpsLocation,
} from '../../../core/services/enterprise.service';

const BAMAKO_CENTER: L.LatLngExpression = [12.6392, -8.0029];

type PositionSource = 'live' | 'availability' | 'estimated';

interface MapEmployee {
  id: string;
  userId?: string | null;
  name: string;
  position: string;
  status: string;
  missionTitle: string;
  latitude: number;
  longitude: number;
  source: PositionSource;
  recordedAt?: string | null;
  hasRealPosition: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  on_mission: 'En mission',
  on_break: 'En pause',
  offline: 'Hors ligne',
  vacation: 'En congé',
  active: 'Actif',
};

@Component({
  selector: 'app-enterprise-tracking',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Terrain</p>
          <h1>Carte GPS</h1>
          <p class="sub">Tous les employés de l’entreprise — positions live et dernières connues</p>
        </div>
        <div class="header-actions">
          <span class="pill ok" *ngIf="wsConnected"><span class="dot"></span> Temps réel</span>
          <span class="pill" *ngIf="!wsConnected">Polling 10 s</span>
          <span class="pill">{{ employees.length }} employé(s)</span>
          <span class="pill muted">{{ withPositionCount }} position(s)</span>
          <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
        </div>
      </header>

      <div class="layout">
        <div class="map-panel">
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
          <div class="legend">
            <span><i class="swatch live"></i> GPS live</span>
            <span><i class="swatch known"></i> Dernière position</span>
            <span><i class="swatch estimated"></i> Position estimée</span>
          </div>
        </div>

        <aside class="side-panel">
          <div class="side-head">
            <h2>Employés</h2>
            <div class="filters">
              <button type="button" [class.active]="filter === 'all'" (click)="filter = 'all'">Tous</button>
              <button type="button" [class.active]="filter === 'live'" (click)="filter = 'live'">Live</button>
              <button type="button" [class.active]="filter === 'offline'" (click)="filter = 'offline'">Hors ligne</button>
            </div>
          </div>

          <div class="loading" *ngIf="loading && !employees.length">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <div class="emp-list" *ngIf="filteredEmployees.length; else emptyList">
            <button type="button" class="emp-row" *ngFor="let e of filteredEmployees" (click)="focusEmployee(e)">
              <span class="avatar">{{ initials(e.name) }}</span>
              <div class="emp-info">
                <strong>{{ e.name }}</strong>
                <span class="meta">{{ e.position || '—' }} · {{ statusLabel(e.status) }}</span>
                <span class="meta" *ngIf="e.missionTitle">{{ e.missionTitle }}</span>
                <span class="meta coords" *ngIf="e.hasRealPosition">
                  {{ e.latitude | number:'1.4-4' }}, {{ e.longitude | number:'1.4-4' }}
                </span>
              </div>
              <span class="badge" [attr.data-source]="e.source">
                {{ sourceLabel(e.source) }}
              </span>
            </button>
          </div>
          <ng-template #emptyList>
            <p class="empty" *ngIf="!loading">Aucun employé dans ce filtre.</p>
          </ng-template>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    @import 'leaflet/dist/leaflet.css';

    .page {
      max-width: 1200px; margin: 0 auto; padding: 28px 24px 56px; color: #0f172a;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap; margin-bottom: 18px;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sub { margin: 0; color: #64748b; font-size: 14px; max-width: 480px; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; color: #475569;
      border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; padding: 6px 10px;
      &.ok { color: #166534; border-color: #bbf7d0; background: #f0fdf4; }
      &.muted { color: #94a3b8; }
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%; background: #16a34a;
    }

    .layout {
      display: grid; grid-template-columns: 1.4fr 0.9fr; gap: 16px; align-items: stretch;
    }
    .map-panel, .side-panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; overflow: hidden;
    }
    .map-wrapper { position: relative; }
    .map-container { height: 520px; z-index: 0; }
    .map-placeholder, .map-error {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px; color: #64748b; background: #f8fafc;
    }
    .map-error mat-icon { color: #991b1b; }
    .legend {
      display: flex; flex-wrap: wrap; gap: 14px; padding: 10px 14px;
      border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;
      .swatch {
        display: inline-block; width: 10px; height: 10px; border-radius: 50%;
        margin-right: 6px; border: 2px solid #fff; box-shadow: 0 0 0 1px #cbd5e1;
        &.live { background: #16a34a; }
        &.known { background: #0f172a; }
        &.estimated { background: #94a3b8; }
      }
    }

    .side-panel { display: flex; flex-direction: column; max-height: 580px; }
    .side-head {
      padding: 14px 16px; border-bottom: 1px solid #f1f5f9;
      h2 { margin: 0 0 10px; font-size: 15px; font-weight: 650; }
    }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
      &.active { background: #0f172a; border-color: #0f172a; color: #fff; }
    }
    .loading { display: flex; justify-content: center; padding: 32px; }
    .emp-list { overflow: auto; flex: 1; }
    .emp-row {
      width: 100%; display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border: 0; border-bottom: 1px solid #f1f5f9;
      background: #fff; text-align: left; cursor: pointer;
      &:hover { background: #f8fafc; }
    }
    .avatar {
      width: 32px; height: 32px; border-radius: 8px; background: #0f172a; color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .emp-info { flex: 1; min-width: 0;
      strong { display: block; font-size: 13px; font-weight: 650; }
      .meta { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
      .coords { font-family: ui-monospace, monospace; font-size: 11px; }
    }
    .badge {
      font-size: 10px; font-weight: 700; padding: 3px 7px; border-radius: 4px;
      background: #f1f5f9; color: #64748b; white-space: nowrap;
      &[data-source="live"] { background: #ecfdf5; color: #166534; }
      &[data-source="availability"] { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; }
      &[data-source="estimated"] { background: #f1f5f9; color: #94a3b8; }
    }
    .empty { margin: 0; padding: 28px 16px; text-align: center; color: #94a3b8; font-size: 13px; }

    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .map-container { height: 360px; }
      .side-panel { max-height: none; }
      h1 { font-size: 22px; }
      .page { padding: 16px 16px 40px; }
    }
  `],
})
export class EnterpriseTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  employees: MapEmployee[] = [];
  filter: 'all' | 'live' | 'offline' = 'all';
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
  private liveByUser = new Map<string, LiveGpsLocation>();

  get filteredEmployees(): MapEmployee[] {
    if (this.filter === 'live') return this.employees.filter((e) => e.source === 'live');
    if (this.filter === 'offline') return this.employees.filter((e) => e.source !== 'live');
    return this.employees;
  }

  get withPositionCount(): number {
    return this.employees.filter((e) => e.hasRealPosition).length;
  }

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
    forkJoin({
      employees: this.enterpriseService.getEmployees().pipe(catchError(() => of([] as EnterpriseEmployee[]))),
      availability: this.enterpriseService.getAvailability().pipe(catchError(() => of([] as EmployeeAvailability[]))),
      live: this.enterpriseService.getLiveLocations().pipe(catchError(() => of([] as LiveGpsLocation[]))),
    }).subscribe({
      next: ({ employees, availability, live }) => {
        this.liveByUser.clear();
        for (const loc of live || []) {
          const uid = loc.user?.id;
          if (uid) this.liveByUser.set(String(uid), loc);
        }
        const availByEmp = new Map<string, EmployeeAvailability>();
        for (const a of availability || []) {
          availByEmp.set(String(a.employee), a);
        }

        const active = (employees || []).filter((e) => e.is_active);
        this.employees = active.map((emp, index) => this.mergeEmployee(emp, availByEmp.get(emp.id), index));
        this.loading = false;
        if (this.mapLoaded) this.updateMarkers();
      },
      error: () => { this.loading = false; },
    });
  }

  focusEmployee(emp: MapEmployee): void {
    const marker = this.markers.get(emp.id);
    if (marker && this.map) {
      this.map.setView(marker.getLatLng(), emp.hasRealPosition ? 15 : 12);
      marker.openPopup();
    }
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status || '—';
  }

  sourceLabel(source: PositionSource): string {
    if (source === 'live') return 'Live';
    if (source === 'availability') return 'Connue';
    return 'Estimée';
  }

  private mergeEmployee(
    emp: EnterpriseEmployee,
    avail: EmployeeAvailability | undefined,
    index: number,
  ): MapEmployee {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employé';
    const userId = emp.user ? String(emp.user) : null;
    const live = userId ? this.liveByUser.get(userId) : undefined;

    if (live?.latitude != null && live?.longitude != null) {
      return {
        id: emp.id,
        userId,
        name,
        position: emp.position || '',
        status: avail?.status || 'on_mission',
        missionTitle: live.mission_title || avail?.mission_title || '',
        latitude: live.latitude,
        longitude: live.longitude,
        source: 'live',
        recordedAt: live.timestamp,
        hasRealPosition: true,
      };
    }

    if (
      avail?.current_latitude != null
      && avail?.current_longitude != null
      && !Number.isNaN(Number(avail.current_latitude))
      && !Number.isNaN(Number(avail.current_longitude))
    ) {
      return {
        id: emp.id,
        userId,
        name,
        position: emp.position || '',
        status: avail.status || 'offline',
        missionTitle: avail.mission_title || '',
        latitude: Number(avail.current_latitude),
        longitude: Number(avail.current_longitude),
        source: 'availability',
        recordedAt: avail.location_updated_at || null,
        hasRealPosition: true,
      };
    }

    // Position estimée autour de Bamako pour rester visibles sur la carte
    const [baseLat, baseLng] = BAMAKO_CENTER as [number, number];
    const angle = (index * 47) % 360;
    const radius = 0.012 + (index % 5) * 0.004;
    const lat = baseLat + Math.cos((angle * Math.PI) / 180) * radius;
    const lng = baseLng + Math.sin((angle * Math.PI) / 180) * radius;

    return {
      id: emp.id,
      userId,
      name,
      position: emp.position || '',
      status: avail?.status || 'offline',
      missionTitle: avail?.mission_title || '',
      latitude: lat,
      longitude: lng,
      source: 'estimated',
      recordedAt: null,
      hasRealPosition: false,
    };
  }

  private connectWebSocket(): void {
    if (this.wsFailed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.ws?.close();
    this.ws = undefined;

    const token = this.authService.getToken();
    if (!token) return;

    const wsUrl = `${this.wsBase}/ws/tracking/enterprise/?token=${token}`;
    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;
      socket.onopen = () => {
        if (this.ws === socket) this.wsConnected = true;
      };
      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'gps_update' && data.location) {
            this.applyLiveUpdate(data.location as LiveGpsLocation);
          }
        } catch {
          /* ignore */
        }
      };
      socket.onerror = () => {
        this.wsFailed = true;
        this.wsConnected = false;
        try { socket.close(); } catch { /* noop */ }
        if (this.ws === socket) this.ws = undefined;
      };
      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = undefined;
          this.wsConnected = false;
          this.wsFailed = true;
        }
      };
    } catch {
      this.wsFailed = true;
    }
  }

  private applyLiveUpdate(raw: LiveGpsLocation): void {
    const userId = raw.user?.id ? String(raw.user.id) : null;
    if (userId) this.liveByUser.set(userId, raw);

    const idx = this.employees.findIndex(
      (e) => (userId && e.userId === userId),
    );
    if (idx < 0 || raw.latitude == null || raw.longitude == null) return;

    const prev = this.employees[idx];
    this.employees = [
      ...this.employees.slice(0, idx),
      {
        ...prev,
        latitude: raw.latitude,
        longitude: raw.longitude,
        source: 'live',
        hasRealPosition: true,
        missionTitle: raw.mission_title || prev.missionTitle,
        recordedAt: raw.timestamp,
        status: prev.status === 'offline' ? 'on_mission' : prev.status,
      },
      ...this.employees.slice(idx + 1),
    ];
    if (this.mapLoaded) this.updateMarkers();
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

  private markerColor(source: PositionSource): string {
    if (source === 'live') return '#16a34a';
    if (source === 'availability') return '#0f172a';
    return '#94a3b8';
  }

  private updateMarkers(): void {
    if (!this.map) return;

    const activeIds = new Set(this.employees.map((e) => e.id));
    for (const [id, marker] of this.markers) {
      if (!activeIds.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    const bounds: L.LatLngExpression[] = [];
    for (const emp of this.employees) {
      const latLng: L.LatLngExpression = [emp.latitude, emp.longitude];
      bounds.push(latLng);
      const color = this.markerColor(emp.source);
      const icon = L.divIcon({
        className: 'agent-marker',
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const status = this.statusLabel(emp.status);
      const source = this.sourceLabel(emp.source);
      const popup = `
        <strong>${emp.name}</strong><br>
        ${emp.position || ''}<br>
        ${status} · ${source}
        ${emp.missionTitle ? `<br>${emp.missionTitle}` : ''}
        ${!emp.hasRealPosition ? '<br><em>Position estimée (GPS absent)</em>' : ''}
      `;
      const existing = this.markers.get(emp.id);
      if (existing) {
        existing.setLatLng(latLng).setIcon(icon).setPopupContent(popup);
      } else {
        const marker = L.marker(latLng, { icon }).bindPopup(popup).addTo(this.map!);
        this.markers.set(emp.id, marker);
      }
    }

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 13 });
    }
  }
}
