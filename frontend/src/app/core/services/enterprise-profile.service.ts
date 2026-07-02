import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicEnterpriseProfile {
  id: string;
  company_name: string;
  city: string;
  country: string;
  address: string;
  website: string;
  description: string;
  logo: string | null;
  total_employees: number;
  total_missions_posted: number;
  reputation_score: number;
  is_verified: boolean;
  member_since: string;
  company_email?: string;
  company_phone?: string;
}

@Injectable({ providedIn: 'root' })
export class EnterpriseProfileService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getPublicProfile(enterpriseUserId: string): Observable<PublicEnterpriseProfile> {
    return this.http.get<PublicEnterpriseProfile>(
      `${this.apiUrl}/enterprises/${enterpriseUserId}/public/`,
    );
  }
}
