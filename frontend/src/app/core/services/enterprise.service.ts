import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EnterpriseProfile {
  id: string;
  company_name: string;
  rccm?: string;
  ifu?: string;
  company_email?: string;
  company_phone?: string;
  website?: string;
  address: string;
  city: string;
  total_employees?: number;
  total_missions_posted?: number;
  total_spent?: number;
  reputation_score?: number;
  is_verified?: boolean;
  deposit_balance?: number;
  deposit_locked?: number;
}

export interface EnterpriseEmployee {
  id: string;
  user?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  role: string;
  missions_completed: number;
  is_active: boolean;
  hired_at: string;
  pay_weight?: number | string;
  pay_phone?: string;
}

export interface EnterprisePayrollSettings {
  is_enabled: boolean;
  frequency: 'weekly' | 'monthly';
  payment_mode: 'automatic' | 'manual';
  employee_pool_percent: string | number;
  lead_weight_multiplier: string | number;
  notes?: string;
  updated_at?: string;
}

export interface PayrollPreviewEmployee {
  employee_id: string;
  first_name: string;
  last_name: string;
  missions_count: number;
  solo_missions: number;
  team_missions: number;
  total_amount: string;
}

export interface PayrollPreview {
  settings: EnterprisePayrollSettings;
  suggested_period: { start: string; end: string; frequency: string };
  pending_earnings_count: number;
  pending_total: string;
  by_employee: PayrollPreviewEmployee[];
}

export interface PayrollLine {
  id: string;
  employee_id: string;
  employee_name: string;
  missions_count: number;
  solo_missions: number;
  team_missions: number;
  lead_missions: number;
  gross_amount: string | number;
  adjustment: string | number;
  net_amount: string | number;
  status: string;
  paid_at?: string | null;
  payment_reference?: string;
}

export interface PayrollPeriod {
  id: string;
  company_name?: string;
  frequency: string;
  payment_mode: string;
  period_start: string;
  period_end: string;
  status: string;
  employees_count: number;
  missions_count: number;
  total_amount: string | number;
  approved_at?: string | null;
  paid_at?: string | null;
  notes?: string;
  created_at: string;
  lines: PayrollLine[];
}

export interface PayrollEmployeeStats {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  role: string;
  is_active: boolean;
  pay_weight: string | number;
  pay_phone: string;
  missions_completed_profile: number;
  missions_assigned: number;
  missions_completed_assignments: number;
  earnings_total: string | number;
  earnings_paid: string | number;
  earnings_pending: string | number;
  earnings_count: number;
  solo_missions: number;
  team_missions: number;
  lead_missions: number;
  last_earning_at?: string | null;
  last_paid_at?: string | null;
}

export interface PayrollPaymentHistoryItem {
  id: string;
  employee_id: string;
  employee_name: string;
  period_id: string;
  period_start: string;
  period_end: string;
  frequency: string;
  missions_count: number;
  solo_missions: number;
  team_missions: number;
  net_amount: string | number;
  paid_at?: string | null;
  payment_reference?: string;
  status: string;
}

export interface PayrollDashboard {
  settings: EnterprisePayrollSettings;
  suggested_period: { start: string; end: string; frequency: string };
  summary: {
    employees_count: number;
    active_employees: number;
    pending_total: string | number;
    pending_earnings_count: number;
    paid_total: string | number;
    lifetime_total: string | number;
    periods_count: number;
  };
  employees: PayrollEmployeeStats[];
  payment_history: PayrollPaymentHistoryItem[];
  periods: {
    id: string;
    period_start: string;
    period_end: string;
    frequency: string;
    payment_mode: string;
    status: string;
    employees_count: number;
    missions_count: number;
    total_amount: string | number;
    paid_at?: string | null;
  }[];
  pending_by_employee: PayrollPreviewEmployee[];
}

export interface PayrollEmployeeDetail {
  employee: PayrollEmployeeStats;
  earnings: {
    id: string;
    mission_id: string;
    mission_title: string;
    mission_price: string | number;
    amount: string | number;
    is_team: boolean;
    is_lead: boolean;
    team_size: number;
    share_ratio: string | number;
    status: string;
    accrued_at?: string | null;
    paid_at?: string | null;
  }[];
  payments: {
    id: string;
    period_id: string;
    period_start: string;
    period_end: string;
    frequency: string;
    missions_count: number;
    solo_missions: number;
    team_missions: number;
    lead_missions: number;
    gross_amount: string | number;
    net_amount: string | number;
    status: string;
    paid_at?: string | null;
    payment_reference?: string;
  }[];
  assignments: {
    id: string;
    mission_id: string;
    mission_title: string;
    mission_status: string;
    is_lead: boolean;
    assigned_at?: string | null;
    completed_at?: string | null;
    rejected_at?: string | null;
  }[];
}

export interface EnterpriseTeamMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  category?: string;
  is_active?: boolean;
  is_lead?: boolean;
  is_manager?: boolean;
  joined_at?: string;
}

export interface EnterpriseTeam {
  id: string;
  name: string;
  description?: string;
  manager?: string | null;
  manager_name?: string | null;
  is_active: boolean;
  members?: EnterpriseTeamMember[];
  members_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EnterpriseAnalytics {
  scope: string;
  missions_total: number;
  missions_active: number;
  missions_completed: number;
  missions_completed_today?: number;
  spent_total?: number;
  spent_this_month?: number;
  employees_count?: number;
}

export interface EnterpriseMission {
  id: string;
  title: string;
  status: string;
  budget: number;
  currency: string;
  created_at: string;
  pickup_city?: string;
  delivery_city?: string;
  provider_name?: string;
}

export interface EmployeeAssignment {
  id: string;
  mission: string;
  mission_title?: string;
  employee: string;
  employee_name?: string;
  assignment_status: string;
  assignment_type?: string;
  is_lead?: boolean;
  notes?: string;
  assigned_at: string;
  accepted_at?: string | null;
  rejected_at?: string | null;
}

export interface EmployeeAvailability {
  employee: string;
  employee_name?: string;
  status: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
  location_updated_at?: string | null;
  mission_title?: string | null;
  current_mission?: string | null;
}

export interface EnterpriseContract {
  id: string;
  contract_type: string;
  status: string;
  monthly_fee: number;
  start_date: string;
  end_date: string;
  company_name?: string;
}

export interface EnterpriseInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

export interface LiveGpsLocation {
  id: string;
  mission: string;
  mission_title?: string;
  user_name?: string;
  user?: { id?: string; first_name: string; last_name: string; email?: string };
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface EnterpriseMissionTrends {
  daily: { day: string | null; created: number; completed: number }[];
  by_status: { status: string; count: number }[];
}

export interface EnterpriseDispute {
  id: string;
  mission_id?: string;
  mission_title: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  plaintiff: { first_name: string; last_name: string };
  defendant: { first_name: string; last_name: string };
}

export interface EnterpriseFinancesSummary {
  mission_spent_total: number;
  mission_committed_total: number;
  mission_pending_total: number;
  missions_count: number;
  missions: {
    id: string;
    title: string;
    status: string;
    budget: number;
    currency: string;
    created_at: string;
    deadline: string;
  }[];
  invoices: EnterpriseInvoice[];
  contracts: EnterpriseContract[];
  total_invoiced: number;
  pending_invoices: number;
}

@Injectable({ providedIn: 'root' })
export class EnterpriseService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private unwrap<T>(response: T[] | { results: T[] }): T[] {
    return Array.isArray(response) ? response : (response?.results ?? []);
  }

  getProfile(): Observable<EnterpriseProfile> {
    return this.http.get<EnterpriseProfile>(`${this.apiUrl}/users/enterprise/profile/`);
  }

  updateProfile(data: Partial<EnterpriseProfile>): Observable<EnterpriseProfile> {
    return this.http.patch<EnterpriseProfile>(`${this.apiUrl}/users/enterprise/profile/`, data);
  }

  getEmployees(): Observable<EnterpriseEmployee[]> {
    return new Observable((observer) => {
      this.http.get<EnterpriseEmployee[] | { results: EnterpriseEmployee[] }>(
        `${this.apiUrl}/users/enterprise/employees/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  getEmployee(id: string): Observable<EnterpriseEmployee> {
    return this.http.get<EnterpriseEmployee>(`${this.apiUrl}/users/enterprise/employees/${id}/`);
  }

  createEmployee(data: Partial<EnterpriseEmployee>): Observable<EnterpriseEmployee & { temporary_password?: string; message?: string }> {
    return this.http.post<EnterpriseEmployee & { temporary_password?: string; message?: string }>(
      `${this.apiUrl}/users/enterprise/employees/`,
      data,
    );
  }

  updateEmployee(id: string, data: Partial<EnterpriseEmployee>): Observable<EnterpriseEmployee> {
    return this.http.patch<EnterpriseEmployee>(`${this.apiUrl}/users/enterprise/employees/${id}/`, data);
  }

  deactivateEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/enterprise/employees/${id}/`);
  }

  getAnalytics(): Observable<EnterpriseAnalytics> {
    return this.http.get<EnterpriseAnalytics>(`${this.apiUrl}/analytics/dashboard/`);
  }

  getMissions(scope: 'ordered' | 'received' = 'ordered'): Observable<EnterpriseMission[]> {
    let params = new HttpParams();
    if (scope === 'received') {
      params = params.set('scope', 'received');
    }
    return new Observable((observer) => {
      this.http.get<EnterpriseMission[] | { results: EnterpriseMission[] }>(
        `${this.apiUrl}/missions/my_missions/`,
        { params },
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  getReceivedMissions(): Observable<EnterpriseMission[]> {
    return this.getMissions('received');
  }

  fundEnterpriseDeposit(
    amount: number,
    mobileMoney?: { phone_number: string; operator: string; otp?: string },
  ): Observable<{
    deposit_balance: number;
    deposit_locked?: number;
    message: string;
    transaction_id?: string;
  }> {
    return this.http.post<{
      deposit_balance: number;
      deposit_locked?: number;
      message: string;
      transaction_id?: string;
    }>(
      `${this.apiUrl}/escrow/deposits/fund/`,
      { amount, ...mobileMoney },
    );
  }

  getAssignments(): Observable<EmployeeAssignment[]> {
    return new Observable((observer) => {
      this.http.get<EmployeeAssignment[] | { results: EmployeeAssignment[] }>(
        `${this.apiUrl}/enterprises/assignments/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  createAssignment(data: {
    mission: string;
    employee?: string;
    team?: string;
    lead_employee?: string;
    is_lead?: boolean;
    notes?: string;
  }): Observable<EmployeeAssignment | EmployeeAssignment[]> {
    return this.http.post<EmployeeAssignment | EmployeeAssignment[]>(`${this.apiUrl}/enterprises/assignments/`, {
      ...data,
      assignment_type: 'manual',
    });
  }

  getTeams(): Observable<EnterpriseTeam[]> {
    return new Observable((observer) => {
      this.http.get<EnterpriseTeam[] | { results: EnterpriseTeam[] }>(
        `${this.apiUrl}/enterprises/teams/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  createTeam(data: {
    name: string;
    description?: string;
    manager?: string | null;
    is_active?: boolean;
    members_payload?: Array<{ employee_id: string; category?: string }>;
  }): Observable<EnterpriseTeam> {
    return this.http.post<EnterpriseTeam>(`${this.apiUrl}/enterprises/teams/`, data);
  }

  updateTeam(id: string, data: Partial<EnterpriseTeam> & {
    members_payload?: Array<{ employee_id: string; category?: string }>;
  }): Observable<EnterpriseTeam> {
    return this.http.patch<EnterpriseTeam>(`${this.apiUrl}/enterprises/teams/${id}/`, data);
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/enterprises/teams/${id}/`);
  }

  addTeamMember(teamId: string, employeeId: string, category?: string): Observable<EnterpriseTeam> {
    return this.http.post<EnterpriseTeam>(`${this.apiUrl}/enterprises/teams/${teamId}/members/`, {
      employee_id: employeeId,
      category: category || '',
    });
  }

  removeTeamMember(teamId: string, employeeId: string): Observable<EnterpriseTeam> {
    return this.http.post<EnterpriseTeam>(
      `${this.apiUrl}/enterprises/teams/${teamId}/members/${employeeId}/remove/`,
      {},
    );
  }

  setTeamManager(teamId: string, employeeId: string): Observable<EnterpriseTeam> {
    return this.http.post<EnterpriseTeam>(`${this.apiUrl}/enterprises/teams/${teamId}/set-manager/`, {
      employee_id: employeeId,
    });
  }

  acceptAssignment(id: string): Observable<EmployeeAssignment> {
    return this.http.post<EmployeeAssignment>(`${this.apiUrl}/enterprises/assignments/${id}/accept/`, {});
  }

  getAvailability(): Observable<EmployeeAvailability[]> {
    return new Observable((observer) => {
      this.http.get<EmployeeAvailability[] | { results: EmployeeAvailability[] }>(
        `${this.apiUrl}/enterprises/availability/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  getContracts(): Observable<EnterpriseContract[]> {
    return new Observable((observer) => {
      this.http.get<EnterpriseContract[] | { results: EnterpriseContract[] }>(
        `${this.apiUrl}/enterprises/contracts/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  getInvoices(): Observable<EnterpriseInvoice[]> {
    return new Observable((observer) => {
      this.http.get<EnterpriseInvoice[] | { results: EnterpriseInvoice[] }>(
        `${this.apiUrl}/enterprises/invoices/`,
      ).subscribe({
        next: (r) => { observer.next(this.unwrap(r)); observer.complete(); },
        error: (e) => observer.error(e),
      });
    });
  }

  getLiveLocations(): Observable<LiveGpsLocation[]> {
    return this.http.get<LiveGpsLocation[]>(`${this.apiUrl}/tracking/locations/live/`);
  }

  getMissionTrends(): Observable<EnterpriseMissionTrends> {
    return this.http.get<EnterpriseMissionTrends>(`${this.apiUrl}/analytics/enterprise-trends/`);
  }

  getDisputes(params?: { status?: string; mission?: string; search?: string }): Observable<EnterpriseDispute[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.mission) q.set('mission', params.mission);
    if (params?.search) q.set('search', params.search);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return this.http.get<EnterpriseDispute[]>(`${this.apiUrl}/disputes/mine/${suffix}`);
  }

  getFinancesSummary(): Observable<EnterpriseFinancesSummary> {
    return this.http.get<EnterpriseFinancesSummary>(`${this.apiUrl}/enterprises/finances/summary/`);
  }

  getPayrollSettings(): Observable<EnterprisePayrollSettings> {
    return this.http.get<EnterprisePayrollSettings>(`${this.apiUrl}/enterprises/payroll/settings/`);
  }

  updatePayrollSettings(data: Partial<EnterprisePayrollSettings>): Observable<EnterprisePayrollSettings> {
    return this.http.patch<EnterprisePayrollSettings>(`${this.apiUrl}/enterprises/payroll/settings/`, data);
  }

  resetPayrollSettings(): Observable<EnterprisePayrollSettings> {
    return this.http.delete<EnterprisePayrollSettings>(`${this.apiUrl}/enterprises/payroll/settings/`);
  }

  getPayrollPreview(): Observable<PayrollPreview> {
    return this.http.get<PayrollPreview>(`${this.apiUrl}/enterprises/payroll/preview/`);
  }

  getPayrollPeriods(): Observable<PayrollPeriod[]> {
    return this.http.get<PayrollPeriod[]>(`${this.apiUrl}/enterprises/payroll/periods/`);
  }

  getPayrollDashboard(): Observable<PayrollDashboard> {
    return this.http.get<PayrollDashboard>(`${this.apiUrl}/enterprises/payroll/dashboard/`);
  }

  getPayrollEmployeeDetail(employeeId: string): Observable<PayrollEmployeeDetail> {
    return this.http.get<PayrollEmployeeDetail>(
      `${this.apiUrl}/enterprises/payroll/employees/${employeeId}/`,
    );
  }

  generatePayrollPeriod(data?: {
    frequency?: string;
    period_start?: string;
    period_end?: string;
    payment_mode?: string;
  }): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.apiUrl}/enterprises/payroll/periods/`, data || {});
  }

  approvePayrollPeriod(id: string): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.apiUrl}/enterprises/payroll/periods/${id}/approve/`, {});
  }

  payPayrollPeriod(id: string): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.apiUrl}/enterprises/payroll/periods/${id}/pay/`, {});
  }

  updatePayrollPeriod(id: string, data: {
    period_start?: string;
    period_end?: string;
    frequency?: string;
    payment_mode?: string;
    notes?: string;
  }): Observable<PayrollPeriod> {
    return this.http.patch<PayrollPeriod>(`${this.apiUrl}/enterprises/payroll/periods/${id}/`, data);
  }

  deletePayrollPeriod(id: string, force = false): Observable<{ deleted: boolean; cancelled: boolean; id: string }> {
    const suffix = force ? '?force=true' : '';
    return this.http.delete<{ deleted: boolean; cancelled: boolean; id: string }>(
      `${this.apiUrl}/enterprises/payroll/periods/${id}/${suffix}`,
    );
  }

  inviteProvider(data: {
    email: string;
    role?: string;
    position?: string;
    message?: string;
  }): Observable<EnterpriseInvite> {
    return this.http.post<EnterpriseInvite>(
      `${this.apiUrl}/users/enterprise/employees/invite/`,
      data,
    );
  }

  listEnterpriseInvites(status: string = 'pending'): Observable<EnterpriseInvite[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<EnterpriseInvite[]>(`${this.apiUrl}/users/enterprise/invites/`, { params });
  }

  cancelEnterpriseInvite(id: string): Observable<EnterpriseInvite> {
    return this.http.post<EnterpriseInvite>(
      `${this.apiUrl}/users/enterprise/invites/${id}/cancel/`,
      {},
    );
  }

  getMyEnterpriseInvites(status: string = 'pending'): Observable<EnterpriseInvite[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<EnterpriseInvite[]>(`${this.apiUrl}/users/me/enterprise-invites/`, { params });
  }

  acceptEnterpriseInvite(id: string): Observable<{ invite: EnterpriseInvite; membership: ProviderEnterpriseMembership }> {
    return this.http.post<{ invite: EnterpriseInvite; membership: ProviderEnterpriseMembership }>(
      `${this.apiUrl}/users/me/enterprise-invites/${id}/accept/`,
      {},
    );
  }

  rejectEnterpriseInvite(id: string): Observable<EnterpriseInvite> {
    return this.http.post<EnterpriseInvite>(
      `${this.apiUrl}/users/me/enterprise-invites/${id}/reject/`,
      {},
    );
  }

  getMyEnterprises(): Observable<ProviderEnterpriseMembership[]> {
    return this.http.get<ProviderEnterpriseMembership[]>(`${this.apiUrl}/users/me/enterprises/`);
  }

  getMyEnterpriseDetail(enterpriseId: string): Observable<ProviderEnterpriseDetail> {
    return this.http.get<ProviderEnterpriseDetail>(
      `${this.apiUrl}/users/me/enterprises/${enterpriseId}/`,
    );
  }

  getMyEnterprisePayroll(enterpriseId: string): Observable<ProviderEnterprisePayroll> {
    return this.http.get<ProviderEnterprisePayroll>(
      `${this.apiUrl}/users/me/enterprises/${enterpriseId}/payroll/`,
    );
  }

  updateMyEnterprisePayroll(
    enterpriseId: string,
    data: { pay_phone?: string },
  ): Observable<ProviderEnterprisePayroll> {
    return this.http.patch<ProviderEnterprisePayroll>(
      `${this.apiUrl}/users/me/enterprises/${enterpriseId}/payroll/`,
      data,
    );
  }

  listEnterpriseRecruitmentCalls(status: string = 'all'): Observable<RecruitmentCall[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<RecruitmentCall[]>(`${this.apiUrl}/users/enterprise/recruitment-calls/`, { params });
  }

  createRecruitmentCall(data: {
    title: string;
    description: string;
    role?: string;
    position?: string;
    city?: string;
    requirements?: string;
    days_valid?: number;
  }): Observable<RecruitmentCall> {
    return this.http.post<RecruitmentCall>(`${this.apiUrl}/users/enterprise/recruitment-calls/`, data);
  }

  updateRecruitmentCall(id: string, data: Partial<{
    title: string;
    description: string;
    role: string;
    position: string;
    city: string;
    requirements: string;
    status: string;
  }>): Observable<RecruitmentCall> {
    return this.http.patch<RecruitmentCall>(`${this.apiUrl}/users/enterprise/recruitment-calls/${id}/`, data);
  }

  listRecruitmentApplications(callId: string, status: string = 'all'): Observable<RecruitmentApplication[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<RecruitmentApplication[]>(
      `${this.apiUrl}/users/enterprise/recruitment-calls/${callId}/applications/`,
      { params },
    );
  }

  reviewRecruitmentApplication(
    applicationId: string,
    action: 'accept' | 'reject',
  ): Observable<RecruitmentApplication | { application: RecruitmentApplication; employee_id: string }> {
    return this.http.post<RecruitmentApplication | { application: RecruitmentApplication; employee_id: string }>(
      `${this.apiUrl}/users/enterprise/recruitment-applications/${applicationId}/review/`,
      { action },
    );
  }

  listOpenRecruitmentCalls(city?: string): Observable<RecruitmentCall[]> {
    let params = new HttpParams();
    if (city) params = params.set('city', city);
    return this.http.get<RecruitmentCall[]>(`${this.apiUrl}/users/recruitment-calls/open/`, { params });
  }

  applyToRecruitmentCall(callId: string, message?: string): Observable<RecruitmentApplication> {
    return this.http.post<RecruitmentApplication>(
      `${this.apiUrl}/users/recruitment-calls/${callId}/apply/`,
      { message: message || '' },
    );
  }

  getMyRecruitmentApplications(status: string = 'all'): Observable<RecruitmentApplication[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<RecruitmentApplication[]>(`${this.apiUrl}/users/me/recruitment-applications/`, { params });
  }
}

export interface EnterpriseInviteSummary {
  id: string;
  user_id: string;
  company_name: string;
  city?: string;
  country?: string;
  address?: string;
  website?: string;
  description?: string;
  company_email?: string;
  company_phone?: string;
  logo?: string | null;
  is_verified?: boolean;
  reputation_score?: number;
  total_employees?: number;
  total_missions_posted?: number;
  member_since?: string;
}

export interface EnterpriseInvite {
  id: string;
  email: string;
  status: string;
  role: string;
  position: string;
  message?: string;
  expires_at?: string;
  created_at?: string;
  responded_at?: string;
  enterprise_id: string;
  enterprise_name: string;
  enterprise?: EnterpriseInviteSummary | null;
  user_exists?: boolean;
  invited_by_name?: string;
}

export interface ProviderEnterpriseMembership {
  id: string;
  enterprise_id: string;
  enterprise_name: string;
  enterprise?: EnterpriseInviteSummary | null;
  role: string;
  position: string;
  is_active: boolean;
  hired_at?: string;
}

export interface ProviderEnterpriseTeam {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  category?: string;
  is_manager?: boolean;
  is_lead?: boolean;
  manager_name?: string | null;
  members_count?: number;
}

export interface ProviderEnterpriseMission {
  id: string;
  title: string;
  status: string;
  bucket: 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'other';
  budget?: string | null;
  currency?: string;
  category?: string | null;
  location?: string;
  is_lead?: boolean;
  assigned_at?: string | null;
  assignment_status?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
}

export interface ProviderEnterpriseDetail {
  membership: ProviderEnterpriseMembership;
  teams: ProviderEnterpriseTeam[];
  missions: ProviderEnterpriseMission[];
  stats: {
    teams_count: number;
    missions_total: number;
    missions_in_progress: number;
    missions_completed: number;
  };
  payroll?: PayrollEmployeeDetail | null;
}

export interface ProviderEnterprisePayroll extends PayrollEmployeeDetail {
  enterprise?: { id: string; company_name: string };
  membership_id?: string;
}

export interface RecruitmentCall {
  id: string;
  title: string;
  description: string;
  role: string;
  position: string;
  city?: string;
  requirements?: string;
  status: string;
  is_open?: boolean;
  expires_at?: string;
  created_at?: string;
  applications_count?: number;
  pending_applications_count?: number;
  enterprise_id: string;
  enterprise_name: string;
  enterprise?: EnterpriseInviteSummary | null;
  my_application?: RecruitmentApplication | null;
}

export interface RecruitmentApplication {
  id: string;
  status: string;
  message?: string;
  created_at?: string;
  reviewed_at?: string;
  provider_id?: string;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    profile_picture?: string | null;
    city?: string;
  };
  call_id?: string;
  call?: {
    id: string;
    title: string;
    position?: string;
    role?: string;
    enterprise_name?: string;
    enterprise_id?: string;
  };
}
