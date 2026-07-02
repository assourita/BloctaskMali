import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicProviderProfile {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  country: string;
  bio: string;
  profile_picture: string | null;
  skills: string[];
  categories: string[];
  level: string;
  reputation_score: number;
  completed_missions: number;
  review_count: number;
  avg_rating: number | null;
  identity_verified: boolean;
  is_available: boolean;
  member_since: string;
  vehicle_type: string;
}

@Injectable({ providedIn: 'root' })
export class ProviderProfileService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getPublicProfile(providerId: string): Observable<PublicProviderProfile> {
    return this.http.get<PublicProviderProfile>(`${this.apiUrl}/providers/${providerId}/public/`);
  }
}
