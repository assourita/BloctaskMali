import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MissionProof {
  id: string;
  mission: string;
  proof_type: string;
  title?: string;
  file: string;
  verification_status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ProofService {
  private apiUrl = `${environment.apiUrl}/proofs`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  uploadProof(
    missionId: string,
    file: File,
    proofType: string,
    title?: string
  ): Observable<MissionProof> {
    const formData = new FormData();
    formData.append('mission', missionId);
    formData.append('proof_type', proofType);
    formData.append('file', file);
    if (title) formData.append('title', title);
    return this.http.post<MissionProof>(`${this.apiUrl}/proofs/`, formData, {
      headers: this.headers()
    });
  }

  getProofs(missionId: string): Observable<MissionProof[]> {
    return this.http.get<MissionProof[]>(
      `${this.apiUrl}/proofs/?mission=${missionId}`,
      { headers: this.headers() }
    );
  }
}
