import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, AfterViewInit, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, interval } from 'rxjs';
import * as L from 'leaflet';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

interface TrackingData {
  missionId: string;
  providerId: string;
  providerName: string;
  pickup: Location;
  delivery: Location;
  currentPosition?: Location;
  path: Location[];
  status: string;
  estimatedArrival?: string;
}


const BAMAKO_CENTER: L.LatLngExpression = [12.6392, -8.0029];

@Component({
  selector: 'app-gps-tracking',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <div class="tracking-container">
      <!-- Header -->
      <div class="tracking-header">
        <div class="mission-info">
          <h2><mat-icon>gps_fixed</mat-icon> Suivi GPS</h2>
          <p *ngIf="trackingData">Mission: {{ trackingData.missionId }}</p>
        </div>
        <div class="status-badge" *ngIf="trackingData" [class]="trackingData.status">
          {{ getStatusLabel(trackingData.status) }}
        </div>
      </div>

      <!-- Provider Info -->
      <div class="provider-bar" *ngIf="trackingData">
        <div class="provider-info">
          <div class="avatar">
            {{ trackingData.providerName.charAt(0) }}
          </div>
          <div>
            <h4>{{ trackingData.providerName }}</h4>
            <span class="live-badge" *ngIf="isLive">
              <span class="pulse"></span> En direct
            </span>
          </div>
        </div>
        <div class="eta" *ngIf="trackingData.estimatedArrival">
          <mat-icon>schedule</mat-icon>
          <span>Arrivée estimée: {{ trackingData.estimatedArrival }}</span>
        </div>
      </div>

      <!-- Map Container -->
      <div class="map-wrapper">
        <div class="map-container" #mapContainer>
          <div class="map-placeholder" *ngIf="!mapLoaded">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Chargement de la carte...</p>
          </div>
          <div class="map-error" *ngIf="mapError">
            <mat-icon>error_outline</mat-icon>
            <p>Impossible de charger la carte</p>
            <button mat-raised-button color="primary" (click)="initMap()">Réessayer</button>
          </div>
        </div>

        <!-- Map Controls -->
        <div class="map-controls">
          <button mat-icon-button (click)="zoomIn()" matTooltip="Zoom +">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button (click)="zoomOut()" matTooltip="Zoom -">
            <mat-icon>remove</mat-icon>
          </button>
          <button mat-icon-button (click)="centerOnProvider()" matTooltip="Centrer sur le prestataire">
            <mat-icon>my_location</mat-icon>
          </button>
          <button mat-icon-button (click)="centerOnRoute()" matTooltip="Voir tout l'itinéraire">
            <mat-icon>zoom_out_map</mat-icon>
          </button>
        </div>

        <!-- Legend -->
        <div class="map-legend">
          <div class="legend-item">
            <span class="marker pickup"></span> Point de départ
          </div>
          <div class="legend-item">
            <span class="marker delivery"></span> Destination
          </div>
          <div class="legend-item">
            <span class="marker current"></span> Position actuelle
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="tracking-stats" *ngIf="trackingData">
        <div class="stat-item">
          <mat-icon>straighten</mat-icon>
          <div>
            <span class="value">{{ distanceRemaining | number:'1.1-1' }} km</span>
            <span class="label">Distance restante</span>
          </div>
        </div>
        <div class="stat-item">
          <mat-icon>speed</mat-icon>
          <div>
            <span class="value">{{ currentSpeed | number:'1.0-0' }} km/h</span>
            <span class="label">Vitesse actuelle</span>
          </div>
        </div>
        <div class="stat-item">
          <mat-icon>timer</mat-icon>
          <div>
            <span class="value">{{ timeElapsed }}</span>
            <span class="label">Temps écoulé</span>
          </div>
        </div>
        <div class="stat-item">
          <mat-icon>place</mat-icon>
          <div>
            <span class="value">{{ distanceTraveled | number:'1.1-1' }} km</span>
            <span class="label">Distance parcourue</span>
          </div>
        </div>
      </div>

      <!-- Provider Controls (only visible to provider) -->
      <div class="provider-controls" *ngIf="isProvider">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Partager ma position</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="location-sharing">
              <div class="current-coords" *ngIf="currentPosition">
                <span>Lat: {{ currentPosition.latitude | number:'1.6-6' }}</span>
                <span>Lng: {{ currentPosition.longitude | number:'1.6-6' }}</span>
                <span class="accuracy" *ngIf="currentPosition.accuracy">
                  Précision: ±{{ currentPosition.accuracy | number:'1.0-0' }}m
                </span>
              </div>
              <button mat-raised-button color="primary" (click)="startSharing()" *ngIf="!isSharing">
                <mat-icon>location_searching</mat-icon> Démarrer le partage
              </button>
              <button mat-raised-button color="warn" (click)="stopSharing()" *ngIf="isSharing">
                <mat-icon>location_disabled</mat-icon> Arrêter le partage
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    @import 'leaflet/dist/leaflet.css';

    .tracking-container {
      padding: 24px; max-width: 1200px; margin: 0 auto;
      
      .tracking-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
        .mission-info {
          h2 { margin: 0; display: flex; align-items: center; gap: 12px; }
          p { margin: 4px 0 0; color: #666; }
        }
        .status-badge {
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
          &.in_progress { background: #fef3c7; color: #92400e; }
          &.accepted { background: #dbeafe; color: #1e40af; }
          &.completed { background: #d1fae5; color: #065f46; }
        }
      }
      
      .provider-bar {
        display: flex; justify-content: space-between; align-items: center;
        background: #fff; padding: 16px 24px; border-radius: 12px;
        margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        
        .provider-info {
          display: flex; align-items: center; gap: 12px;
          .avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(135deg, #6C5CE7, #a29bfe);
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-weight: 600;
          }
          h4 { margin: 0 0 4px; }
          .live-badge {
            display: flex; align-items: center; gap: 6px;
            font-size: 12px; color: #10b981; font-weight: 500;
            .pulse {
              width: 8px; height: 8px; background: #10b981; border-radius: 50%;
              animation: pulse 2s infinite;
            }
          }
        }
        
        .eta {
          display: flex; align-items: center; gap: 8px;
          color: #666; font-size: 14px;
        }
      }
      
      @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      
      .map-wrapper {
        position: relative; margin-bottom: 20px;
        
        .map-container {
          height: 500px; background: #f5f5f5; border-radius: 16px;
          overflow: hidden; position: relative; z-index: 0;
          
          .map-placeholder, .map-error {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 16px;
            color: #666;
          }
          .map-error mat-icon { font-size: 48px; color: #ef4444; }
        }
        
        .map-controls {
          position: absolute; top: 16px; right: 16px;
          display: flex; flex-direction: column; gap: 8px;
          button {
            background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        }
        
        .map-legend {
          position: absolute; bottom: 16px; left: 16px;
          background: #fff; padding: 12px 16px; border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          
          .legend-item {
            display: flex; align-items: center; gap: 8px;
            font-size: 12px; margin-bottom: 8px;
            &:last-child { margin-bottom: 0; }
            
            .marker {
              width: 12px; height: 12px; border-radius: 50%;
              &.pickup { background: #3b82f6; }
              &.delivery { background: #10b981; }
              &.current { background: #ef4444; border: 2px solid #fff; }
            }
          }
        }
      }
      
      .tracking-stats {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
        
        .stat-item {
          background: #fff; padding: 20px; border-radius: 12px;
          display: flex; align-items: center; gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          
          mat-icon { font-size: 28px; width: 28px; height: 28px; color: #6C5CE7; }
          
          .value { display: block; font-size: 20px; font-weight: 700; color: #1f2937; }
          .label { font-size: 12px; color: #6b7280; }
        }
      }
      
      .provider-controls {
        .location-sharing {
          display: flex; flex-direction: column; gap: 16px;
          
          .current-coords {
            display: flex; gap: 16px; font-size: 13px; color: #666;
            .accuracy { color: #10b981; font-weight: 500; }
          }
          
          button { align-self: flex-start; }
        }
      }
    }
    
    @media (max-width: 768px) {
      .tracking-stats { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class GpsTrackingComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() missionId?: string;
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private apiUrl = environment.apiUrl;
  private wsBase = (environment.wsUrl || environment.apiUrl.replace('/api', '').replace(/^http/, 'ws')).replace(/\/$/, '');
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private pathLine?: L.Polyline;
  private refreshSub?: Subscription;
  private watchId?: number;
  private ws?: WebSocket;
  private lastLocationSentAt = 0;
  private readonly locationSendIntervalMs = 10000;
  private wsFailed = false;
  
  trackingData?: TrackingData;
  mapLoaded = false;
  mapError = false;
  isLive = false;
  isSharing = false;
  isProvider = false;
  
  currentPosition?: Location;
  distanceRemaining = 0;
  currentSpeed = 0;
  timeElapsed = '00:00';
  distanceTraveled = 0;
  
  private startTime?: Date;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isProvider = user?.active_role === 'provider' || user?.user_type === 'provider';
    
    this.route.params.subscribe(params => {
      if (params['missionId']) {
        this.missionId = params['missionId'];
        this.loadTrackingData();
        if (!this.isProvider) {
          this.connectWebSocket();
        }
      }
    });
    
    if (this.missionId) {
      this.loadTrackingData();
    }

    // Rafraîchissement REST (fonctionne sans WebSocket / Redis)
    this.refreshSub = interval(10000).subscribe(() => {
      if (this.missionId) {
        this.loadTrackingData(false);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['missionId']?.currentValue) {
      this.loadTrackingData();
      if (!this.isProvider) {
        this.connectWebSocket();
      }
      if (this.mapLoaded) {
        setTimeout(() => this.map?.invalidateSize(), 100);
      }
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.stopSharing();
    this.ws?.close();
    this.map?.remove();
  }

  private connectWebSocket(): void {
    if (!this.missionId || this.wsFailed || this.isProvider) return;
    const token = this.authService.getToken();
    const wsUrl = `${this.wsBase}/ws/tracking/mission/${this.missionId}/?token=${token}`;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { this.isLive = true; };
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'gps_update' && data.location) {
          this.applyLocationUpdate(data.location);
        }
      };
      this.ws.onerror = () => {
        this.wsFailed = true;
        this.ws?.close();
      };
      this.ws.onclose = () => {
        if (!this.wsFailed) {
          this.wsFailed = true;
        }
      };
    } catch {
      this.wsFailed = true;
    }
  }

  private applyLocationUpdate(location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  }): void {
    this.currentPosition = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || new Date().toISOString(),
    };
    if (this.trackingData) {
      this.trackingData.currentPosition = this.currentPosition;
      this.trackingData.path = [...(this.trackingData.path || []), this.currentPosition];
    }
    this.isLive = true;
    if (this.mapLoaded) this.updateMap();
    this.calculateStats();
  }

  private h(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  initMap(): void {
    if (!this.mapContainer?.nativeElement || this.map) {
      if (this.map) {
        this.map.invalidateSize();
      }
      return;
    }

    try {
      this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView(BAMAKO_CENTER, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);
      this.markersLayer = L.layerGroup().addTo(this.map);

      this.mapLoaded = true;
      this.mapError = false;

      if (this.trackingData) {
        this.updateMap();
      }
    } catch {
      this.mapError = true;
    }
  }

  loadTrackingData(showLoading = true): void {
    if (!this.missionId) return;
    
    this.http.get<any>(`${this.apiUrl}/missions/${this.missionId}/tracking/`, { headers: this.h() }).subscribe({
      next: (data) => {
        this.trackingData = data;
        this.isLive = data.status === 'in_progress';
        
        if (data.currentPosition) {
          this.currentPosition = data.currentPosition;
        }
        
        this.calculateStats();
        
        if (this.mapLoaded) {
          this.updateMap();
        }
      },
      error: () => {
        this.snackBar.open('Erreur chargement tracking', 'Fermer', { duration: 3000 });
      }
    });
  }

  private updateMap(): void {
    if (!this.map || !this.markersLayer || !this.trackingData) return;

    const { pickup, delivery, currentPosition, path } = this.trackingData;
    this.markersLayer.clearLayers();
    if (this.pathLine) {
      this.map.removeLayer(this.pathLine);
      this.pathLine = undefined;
    }

    L.circleMarker([pickup.latitude, pickup.longitude], {
      radius: 8, color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1, weight: 2,
    }).bindTooltip('Départ').addTo(this.markersLayer);

    L.circleMarker([delivery.latitude, delivery.longitude], {
      radius: 8, color: '#047857', fillColor: '#10b981', fillOpacity: 1, weight: 2,
    }).bindTooltip('Arrivée').addTo(this.markersLayer);

    if (currentPosition) {
      L.circleMarker([currentPosition.latitude, currentPosition.longitude], {
        radius: 10, color: '#b91c1c', fillColor: '#ef4444', fillOpacity: 1, weight: 2,
      }).bindTooltip('Position actuelle').addTo(this.markersLayer);
    }

    if (path && path.length > 1) {
      this.pathLine = L.polyline(
        path.map(p => [p.latitude, p.longitude] as L.LatLngExpression),
        { color: '#6C5CE7', weight: 4, opacity: 0.9 },
      ).addTo(this.map);
    }

    this.centerOnRoute();
  }

  private calculateStats(): void {
    if (!this.trackingData || !this.currentPosition) return;
    
    // Distance restante (simplifiée)
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(this.trackingData.delivery.latitude - this.currentPosition.latitude);
    const dLon = toRad(this.trackingData.delivery.longitude - this.currentPosition.longitude);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(this.currentPosition.latitude)) * Math.cos(toRad(this.trackingData.delivery.latitude)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    this.distanceRemaining = R * c;
    
    // Temps écoulé
    if (this.startTime) {
      const diff = Date.now() - this.startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      this.timeElapsed = `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    }
  }

  startSharing(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Géolocalisation non supportée', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.isSharing = true;
    this.startTime = new Date();
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        if (this.missionId) {
          const now = Date.now();
          if (now - this.lastLocationSentAt >= this.locationSendIntervalMs) {
            this.lastLocationSentAt = now;
            const speedKmh = position.coords.speed != null
              ? Math.round(position.coords.speed * 3.6)
              : undefined;
            this.http.post<Location>(`${this.apiUrl}/missions/${this.missionId}/location/`, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: speedKmh,
              timestamp: new Date().toISOString(),
            }, { headers: this.h() }).subscribe({
              next: (loc) => {
                if (loc?.latitude != null) {
                  this.applyLocationUpdate(loc);
                }
              },
              error: (err) => {
                const msg = err.error?.error || err.error?.timestamp?.[0] || 'Erreur envoi position';
                this.snackBar.open(msg, 'Fermer', { duration: 4000 });
              },
            });
          }
        }
        
        if (this.mapLoaded) {
          this.updateMap();
        }
        this.calculateStats();
      },
      (error) => {
        this.snackBar.open(`Erreur GPS: ${error.message}`, 'Fermer', { duration: 3000 });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    
    this.snackBar.open('Partage de position démarré', 'Fermer', { duration: 2000 });
  }

  stopSharing(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
    this.isSharing = false;
    this.snackBar.open('Partage de position arrêté', 'Fermer', { duration: 2000 });
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  centerOnProvider(): void {
    if (this.map && this.currentPosition) {
      this.map.setView([this.currentPosition.latitude, this.currentPosition.longitude], 16);
    }
  }

  centerOnRoute(): void {
    if (!this.map || !this.trackingData) return;

    const points: L.LatLngExpression[] = [
      [this.trackingData.pickup.latitude, this.trackingData.pickup.longitude],
      [this.trackingData.delivery.latitude, this.trackingData.delivery.longitude],
    ];
    if (this.currentPosition) {
      points.push([this.currentPosition.latitude, this.currentPosition.longitude]);
    }
    this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      accepted: 'En attente',
      in_progress: 'En cours',
      submitted: 'Prêtes à livrer',
      completed: 'Terminée'
    };
    return labels[status] || status;
  }
}
