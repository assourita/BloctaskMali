import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Mission {
  id: string;
  title: string;
  description?: string;
  status: string;
  budget: number;
  final_price?: number;
  currency: string;
  pickup_address?: string;
  delivery_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  deadline?: string;
  expected_duration?: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  category?: { id: string; name: string; icon?: string; slug?: string };
  provider?: { id: string; first_name: string; last_name: string; profile_picture?: string; phone_number?: string };
  client?: { id: string; first_name: string; last_name: string; profile_picture?: string; city?: string };
  application_count?: number;
  applications_count?: number;
  mission_contract_id?: number;
  blockchain_status?: string;
  escrow_tx_hash?: string;
  deposit_amount?: number;
  required_deposit?: number;
  deposit_paid?: boolean;
  deposit_deadline?: string;
  deposit_tx_hash?: string;
  expiry_decision_pending?: boolean;
  expiry_decision_due_at?: string;
  is_applied?: boolean;
  can_apply?: boolean;
  apply_block_reason?: string | null;
  applications_open?: boolean;
  pending_applications_count?: number;
  assigned_enterprise_id?: string | null;
  requires_verified_provider?: boolean;
  requires_gps_tracking?: boolean;
  enterprise_only?: boolean;
  executing_employee?: { id: string; first_name: string; last_name: string; position?: string };
  min_reputation_score?: number;
  priority?: string;
  deposit_policy?: {
    requires_deposit: boolean;
    required_deposit: number;
    deposit_paid?: boolean;
    deposit_mode?: string;
    deposit_reason?: string;
    merchandise_value?: number;
  };
  category_rule?: Record<string, unknown>;
  counterparty?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
    profile_picture?: string;
    city?: string;
    country?: string;
    bio?: string;
    reputation_score?: number;
    completed_missions?: number;
    identity_verified?: boolean;
    enterprise_name?: string;
  };
  can_view_counterparty?: boolean;
  deposit_required?: boolean;
  requirement_labels?: string[];
  category_slug?: string;
  requirements?: Record<string, unknown>;
  status_history?: Array<{
    id: string;
    old_status: string;
    new_status: string;
    reason?: string;
    created_at: string;
  }>;
  payment_id?: string;
  payment_status?: string;
}

export interface MissionStats {
  active_missions?: number;
  pending_missions?: number;
  completed_missions?: number;
  total_spent?: number;
  spent_this_month?: number;
  total_earned?: number;
  earned_this_month?: number;
  reputation_score?: number;
  reputation_level?: string;
}

@Injectable({ providedIn: 'root' })
export class MissionService {
  private apiUrl = `${environment.apiUrl}/missions`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`
    });
  }

  getMyMissions(asRole?: 'client' | 'provider' | 'enterprise', scope?: 'ordered' | 'received'): Observable<Mission[]> {
    let params = new HttpParams();
    if (asRole) params = params.set('role', asRole);
    if (scope) params = params.set('scope', scope);
    return this.http.get<Mission[] | { results: Mission[] }>(
      `${this.apiUrl}/my_missions/`,
      { headers: this.headers(), params }
    ).pipe(map(r => Array.isArray(r) ? r : (r.results || [])));
  }

  getMyMissionsByStatuses(statuses: string[], asRole?: 'client' | 'provider'): Observable<Mission[]> {
    return this.getMyMissions(asRole).pipe(
      map(missions => missions.filter(m => statuses.includes(m.status)))
    );
  }

  getAvailable(lat?: number, lng?: number, radius = 15): Observable<Mission[]> {
    let params = new HttpParams();
    if (lat != null) params = params.set('lat', String(lat));
    if (lng != null) params = params.set('lng', String(lng));
    params = params.set('radius', String(radius));
    return this.http.get<Mission[] | { results: Mission[] }>(
      `${this.apiUrl}/available/`,
      { headers: this.headers(), params }
    ).pipe(map(r => Array.isArray(r) ? r : (r.results || [])));
  }

  listFunded(page = 1, pageSize = 12, asEnterprise = false): Observable<{ count: number; results: Mission[] }> {
    let params = new HttpParams()
      .set('role', asEnterprise ? 'enterprise' : 'provider')
      .set('page', String(page))
      .set('page_size', String(pageSize));
    return this.http.get<{ count: number; results: Mission[] } | Mission[]>(
      `${this.apiUrl}/available/`,
      { headers: this.headers(), params }
    ).pipe(map((r) => {
      if (Array.isArray(r)) {
        return { count: r.length, results: r };
      }
      return { count: r.count ?? (r.results?.length ?? 0), results: r.results ?? [] };
    }));
  }

  getStats(): Observable<MissionStats> {
    return this.http.get<MissionStats>(`${this.apiUrl}/stats/`, { headers: this.headers() });
  }

  getDashboardStats(asRole?: 'client' | 'provider'): Observable<MissionStats> {
    let params = new HttpParams();
    if (asRole) params = params.set('role', asRole);
    return this.http.get<MissionStats>(
      `${environment.apiUrl}/analytics/dashboard/`,
      { headers: this.headers(), params }
    );
  }

  getMission(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/${id}/`, { headers: this.headers() });
  }

  validateMission(id: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/validate/`, {}, { headers: this.headers() });
  }

  cancelMission(id: string, reason?: string): Observable<unknown> {
    const body = reason ? { reason } : {};
    return this.http.post(`${this.apiUrl}/${id}/cancel/`, body, { headers: this.headers() });
  }

  expireMissionDecision(
    id: string,
    action: 'continue' | 'cancel',
    opts?: { new_deadline?: string; reason?: string },
  ): Observable<{ status: string; deadline?: string; mission?: Mission }> {
    const body: Record<string, string> = { action };
    if (opts?.new_deadline) body['new_deadline'] = opts.new_deadline;
    if (opts?.reason) body['reason'] = opts.reason;
    return this.http.post<{ status: string; deadline?: string; mission?: Mission }>(
      `${this.apiUrl}/${id}/expire_decision/`,
      body,
      { headers: this.headers() },
    );
  }

  submitProof(id: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/submit_proof/`, {}, { headers: this.headers() });
  }

  startMission(id: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/start/`, {}, { headers: this.headers() });
  }

  payDeposit(
    missionId: string,
    payload: {
      amount?: number;
      phone_number?: string;
      operator?: string;
      otp?: string;
      auto_start?: boolean;
      gps_consent?: boolean;
    } = {},
  ): Observable<{
    status: string;
    deposit_paid?: boolean;
    required_deposit?: number;
    deposit_deadline?: string;
    mission_started?: boolean;
    error?: string;
  }> {
    return this.http.post<{
      status: string;
      deposit_paid?: boolean;
      required_deposit?: number;
      deposit_deadline?: string;
      mission_started?: boolean;
      error?: string;
    }>(`${this.apiUrl}/${missionId}/pay_deposit/`, payload, { headers: this.headers() });
  }

  applyToMission(id: string, message = ''): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/apply/`, { message }, { headers: this.headers() });
  }

  getMyApplications(scope?: 'provider' | 'client'): Observable<Array<{
    id: string;
    mission: string;
    mission_title: string;
    mission_budget: string;
    mission_currency: string;
    message: string;
    status: string;
    created_at: string;
  }>> {
    let params = new HttpParams();
    if (scope) params = params.set('scope', scope);
    return this.http.get<Array<{
      id: string;
      mission: string;
      mission_title: string;
      mission_budget: string;
      mission_currency: string;
      message: string;
      status: string;
      created_at: string;
    }>>(`${this.apiUrl}/applications/my_applications/`, { headers: this.headers(), params });
  }

  acceptApplication(missionId: string, applicationId: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/${missionId}/accept_application/`,
      { application_id: applicationId },
      { headers: this.headers() }
    );
  }

  solicitProvider(missionId: string, providerId: string, message = ''): Observable<MissionSolicitation> {
    return this.solicitMission(missionId, { provider_id: providerId, message });
  }

  solicitEnterprise(missionId: string, enterpriseId: string, message = ''): Observable<MissionSolicitation> {
    return this.solicitMission(missionId, { enterprise_id: enterpriseId, message });
  }

  solicitMission(
    missionId: string,
    payload: { provider_id?: string; enterprise_id?: string; message?: string },
  ): Observable<MissionSolicitation> {
    return this.http.post<MissionSolicitation>(
      `${this.apiUrl}/${missionId}/solicit/`,
      payload,
      { headers: this.headers() }
    );
  }

  getMySolicitations(status?: string, scope: 'provider' | 'enterprise' = 'provider'): Observable<MissionSolicitation[]> {
    let params = new HttpParams().set('scope', scope);
    if (status) params = params.set('status', status);
    return this.http.get<MissionSolicitation[]>(
      `${this.apiUrl}/solicitations/my_solicitations/`,
      { headers: this.headers(), params }
    ).pipe(map(r => Array.isArray(r) ? r : []));
  }

  getSentSolicitations(): Observable<MissionSolicitation[]> {
    return this.http.get<MissionSolicitation[]>(
      `${this.apiUrl}/solicitations/sent/`,
      { headers: this.headers() }
    ).pipe(map(r => Array.isArray(r) ? r : []));
  }

  acceptSolicitation(solicitationId: string): Observable<{
    status: string;
    mission_id: string;
    next_step?: string;
    deposit_required?: boolean;
    required_deposit?: number;
    deposit_deadline?: string;
  }> {
    return this.http.post<{
      status: string;
      mission_id: string;
      next_step?: string;
      deposit_required?: boolean;
      required_deposit?: number;
      deposit_deadline?: string;
    }>(
      `${this.apiUrl}/solicitations/${solicitationId}/accept/`,
      {},
      { headers: this.headers() }
    );
  }

  rejectSolicitation(solicitationId: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/solicitations/${solicitationId}/reject/`,
      {},
      { headers: this.headers() }
    );
  }

  cancelSolicitation(solicitationId: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/solicitations/${solicitationId}/cancel/`,
      {},
      { headers: this.headers() }
    );
  }

  getSolicitationPreview(solicitationId: string): Observable<SolicitationPreview> {
    return this.http.get<SolicitationPreview>(
      `${this.apiUrl}/solicitations/${solicitationId}/preview/`,
      { headers: this.headers() }
    );
  }
}

export interface SolicitationPreview {
  solicitation: MissionSolicitation;
  mission: Mission;
  client: ClientPreview;
  applications: MissionApplicationItem[];
  other_solicitations: OtherSolicitationItem[];
  workflow?: SolicitationWorkflow;
  enterprise_employees?: { id: string; first_name: string; last_name: string; position?: string }[];
}

export interface SolicitationWorkflow {
  current_step: 'accept' | 'deposit' | 'assign_employee' | 'start' | 'started';
  solicitation_accepted: boolean;
  deposit_required: boolean;
  deposit_paid: boolean;
  required_deposit: number;
  deposit_deadline?: string;
  employee_assigned: boolean;
  can_start: boolean;
  deposit_balance?: number;
  is_enterprise: boolean;
}

export interface ClientPreview {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  bio?: string;
  city?: string;
  country?: string;
  identity_verified?: boolean;
}

export interface MissionApplicationItem {
  id: string;
  mission: string;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    reputation_score?: number;
    completed_missions?: number;
    level?: string;
    city?: string;
    skills?: string[];
    identity_verified?: boolean;
  };
  proposed_price?: string | number;
  message?: string;
  status: string;
  created_at: string;
}

export interface OtherSolicitationItem {
  id: string;
  target_type: 'provider' | 'enterprise';
  status: string;
  provider?: { id: string; first_name: string; last_name: string };
  enterprise_name?: string;
  created_at: string;
}

export interface MissionSolicitation {
  id: string;
  mission: string;
  mission_title: string;
  mission_budget: string | number;
  mission_currency: string;
  mission_status?: string;
  pickup_address?: string;
  deadline?: string;
  target_type?: 'provider' | 'enterprise';
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  responded_at?: string;
  created_at: string;
  enterprise_id?: string;
  enterprise_name?: string;
  enterprise_city?: string;
  enterprise_logo?: string | null;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    reputation_score?: number;
    completed_missions?: number;
    level?: string;
    city?: string;
    identity_verified?: boolean;
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
}
