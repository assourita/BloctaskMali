import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LandingStats {
  total_providers: number;
  total_enterprises: number;
  total_missions: number;
  open_missions: number;
  completed_missions: number;
}

export interface LandingCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  open_mission_count: number;
  provider_count: number;
}

export interface LandingProvider {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  profile_picture: string | null;
  skills: string[];
  level: string;
  reputation_score: number;
  completed_missions: number;
  review_count: number;
  avg_rating: number | null;
  identity_verified: boolean;
  is_available?: boolean;
}

export interface LandingEnterprise {
  id: string;
  company_name: string;
  city: string;
  website: string;
  total_employees: number;
  total_missions_posted: number;
  reputation_score: number;
  is_verified: boolean;
  logo: string | null;
}

export interface LandingMission {
  id: string;
  title: string;
  category_name: string;
  category_icon: string;
  budget: number;
  currency: string;
  pickup_address: string;
  deadline: string | null;
  application_count: number;
  created_at: string;
}

export interface LandingData {
  stats: LandingStats;
  categories: LandingCategory[];
  featured_providers: LandingProvider[];
  featured_enterprises: LandingEnterprise[];
  featured_missions: LandingMission[];
  popular_categories: string[];
}

@Injectable({ providedIn: 'root' })
export class LandingService {
  private apiUrl = `${environment.apiUrl}/config`;

  constructor(private http: HttpClient) {}

  getLandingData(search?: string, providersLimit = 8, enterprisesLimit = 9): Observable<LandingData> {
    let params = new HttpParams()
      .set('providers_limit', String(providersLimit))
      .set('enterprises_limit', String(enterprisesLimit));
    if (search?.trim()) {
      params = params.set('q', search.trim());
    }
    return this.http.get<LandingData>(`${this.apiUrl}/landing/`, { params });
  }

  getAllProviders(): Observable<LandingProvider[]> {
    return new Observable((observer) => {
      this.getLandingData(undefined, 100).subscribe({
        next: (data) => {
          observer.next(data.featured_providers);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  getAllEnterprises(): Observable<LandingEnterprise[]> {
    return new Observable((observer) => {
      this.http.get<LandingData>(`${this.apiUrl}/landing/`, {
        params: new HttpParams().set('enterprises_limit', '100'),
      }).subscribe({
        next: (data) => {
          observer.next(data.featured_enterprises || []);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}
