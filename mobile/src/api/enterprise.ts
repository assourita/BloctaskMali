import { apiRequest } from './client';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export interface EnterpriseProfile {
  id: string;
  company_name: string;
  rccm?: string;
  ifu?: string;
  company_email?: string;
  company_phone?: string;
  website?: string;
  address?: string;
  city?: string;
  deposit_balance?: number;
  deposit_locked?: number;
  total_employees?: number;
  total_missions_posted?: number;
  total_spent?: number;
  reputation_score?: number;
  is_verified?: boolean;
}

export interface EnterpriseEmployee {
  id: string;
  user?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  role: string;
  missions_completed?: number;
  is_active: boolean;
  hired_at?: string;
  pay_weight?: number | string;
  pay_phone?: string;
}

export interface EmployeeAssignment {
  id: string;
  mission: string;
  mission_title?: string;
  employee: string;
  employee_name?: string;
  assignment_status?: string;
  assignment_type?: string;
  is_lead?: boolean;
  assigned_at: string;
  accepted_at?: string | null;
}

export interface EnterpriseFinancesSummary {
  mission_spent_total: number;
  mission_committed_total: number;
  missions_count: number;
  total_invoiced: number;
  pending_invoices: number;
  missions: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    currency: string;
    created_at: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    status: string;
    due_date: string;
  }>;
  contracts: Array<{
    id: string;
    contract_type: string;
    status: string;
    monthly_fee: number;
  }>;
}

export interface EnterpriseAnalytics {
  scope?: string;
  missions_total?: number;
  missions_active?: number;
  missions_completed?: number;
  spent_total?: number;
  spent_this_month?: number;
  employees_count?: number;
}

export interface LiveGpsLocation {
  id: string;
  mission: string;
  mission_title?: string;
  user_name?: string;
  user?: { id?: string; first_name?: string; last_name?: string; email?: string };
  latitude: number;
  longitude: number;
  timestamp: string;
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

export async function getEnterpriseProfile(): Promise<EnterpriseProfile | null> {
  try {
    return await apiRequest<EnterpriseProfile>('/users/enterprise/profile/');
  } catch {
    return null;
  }
}

export async function updateEnterpriseProfile(
  data: Partial<EnterpriseProfile>,
): Promise<EnterpriseProfile> {
  return apiRequest<EnterpriseProfile>('/users/enterprise/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fundEnterpriseDeposit(payload: {
  amount: number;
  phone_number: string;
  operator: string;
  otp?: string;
}): Promise<{
  deposit_balance: number;
  deposit_locked: number;
  message: string;
  transaction_id?: string;
}> {
  return apiRequest('/escrow/deposits/fund/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEmployees(): Promise<EnterpriseEmployee[]> {
  const data = await apiRequest<EnterpriseEmployee[] | { results: EnterpriseEmployee[] }>(
    '/users/enterprise/employees/',
  );
  return unwrap(data).map((e) => ({
    ...e,
    first_name: (e.first_name || '').replace(/[-–—]+$/g, '').trim(),
    last_name: (e.last_name || '').replace(/[-–—]+$/g, '').trim(),
  }));
}

export async function getEmployee(id: string): Promise<EnterpriseEmployee> {
  return apiRequest<EnterpriseEmployee>(`/users/enterprise/employees/${id}/`);
}

export async function createEmployee(payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  role?: string;
}): Promise<EnterpriseEmployee & { temporary_password?: string; message?: string }> {
  return apiRequest('/users/enterprise/employees/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(
  id: string,
  payload: Partial<Pick<EnterpriseEmployee, 'first_name' | 'last_name' | 'email' | 'phone' | 'position' | 'role' | 'is_active' | 'pay_weight' | 'pay_phone'>>,
): Promise<EnterpriseEmployee> {
  return apiRequest(`/users/enterprise/employees/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateEmployee(id: string): Promise<void> {
  await apiRequest(`/users/enterprise/employees/${id}/`, { method: 'DELETE' });
}

export async function getAssignments(): Promise<EmployeeAssignment[]> {
  const data = await apiRequest<EmployeeAssignment[] | { results: EmployeeAssignment[] }>(
    '/enterprises/assignments/',
  );
  return unwrap(data);
}

export async function createAssignment(payload: {
  mission: string;
  employee?: string;
  team?: string;
  lead_employee?: string;
  is_lead?: boolean;
  notes?: string;
}): Promise<EmployeeAssignment | EmployeeAssignment[]> {
  return apiRequest<EmployeeAssignment | EmployeeAssignment[]>('/enterprises/assignments/', {
    method: 'POST',
    body: JSON.stringify({ ...payload, assignment_type: 'manual' }),
  });
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
}

export async function getTeams(): Promise<EnterpriseTeam[]> {
  const data = await apiRequest<EnterpriseTeam[] | { results: EnterpriseTeam[] }>(
    '/enterprises/teams/',
  );
  return unwrap(data).map((team) => ({
    ...team,
    members: (team.members || []).map((m) => ({
      ...m,
      employee_id: String(
        m.employee_id
        || (m as { employee?: string }).employee
        || '',
      ),
      first_name: (m.first_name || '').replace(/[-–—]+$/g, '').trim(),
      last_name: (m.last_name || '').replace(/[-–—]+$/g, '').trim(),
    })),
  }));
}

export async function createTeam(payload: {
  name: string;
  description?: string;
  manager?: string | null;
  members_payload?: Array<{ employee_id: string; category?: string }>;
}): Promise<EnterpriseTeam> {
  return apiRequest('/enterprises/teams/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTeam(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    manager: string | null;
    is_active: boolean;
    members_payload: Array<{ employee_id: string; category?: string }>;
  }>,
): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  await apiRequest(`/enterprises/teams/${id}/`, { method: 'DELETE' });
}

export async function addTeamMember(
  teamId: string,
  employeeId: string,
  category?: string,
): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${teamId}/members/`, {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, category: category || '' }),
  });
}

export async function removeTeamMember(teamId: string, employeeId: string): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${teamId}/members/${employeeId}/remove/`, {
    method: 'POST',
    body: '{}',
  });
}

export async function setTeamManager(teamId: string, employeeId: string): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${teamId}/set-manager/`, {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  });
}

export async function getFinancesSummary(): Promise<EnterpriseFinancesSummary> {
  return apiRequest<EnterpriseFinancesSummary>('/enterprises/finances/summary/');
}

export async function getEnterpriseAnalytics(): Promise<EnterpriseAnalytics> {
  return apiRequest<EnterpriseAnalytics>('/analytics/dashboard/');
}

export async function getLiveGpsLocations(): Promise<LiveGpsLocation[]> {
  const data = await apiRequest<LiveGpsLocation[] | { results: LiveGpsLocation[] }>(
    '/tracking/locations/live/',
  );
  return unwrap(data);
}

export async function getAvailability(): Promise<EmployeeAvailability[]> {
  const data = await apiRequest<EmployeeAvailability[] | { results: EmployeeAvailability[] }>(
    '/enterprises/availability/',
  );
  return unwrap(data);
}

export async function getPublicEnterpriseProfile(id: string): Promise<EnterpriseProfile & {
  logo?: string | null;
}> {
  return apiRequest(`/users/enterprises/${id}/public/`);
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

export async function inviteProvider(payload: {
  email: string;
  role?: string;
  position?: string;
  message?: string;
}): Promise<EnterpriseInvite> {
  return apiRequest('/users/enterprise/employees/invite/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listEnterpriseInvites(status = 'pending'): Promise<EnterpriseInvite[]> {
  const data = await apiRequest<EnterpriseInvite[] | { results: EnterpriseInvite[] }>(
    `/users/enterprise/invites/?status=${encodeURIComponent(status)}`,
  );
  return unwrap(data);
}

export async function cancelEnterpriseInvite(id: string): Promise<EnterpriseInvite> {
  return apiRequest(`/users/enterprise/invites/${id}/cancel/`, { method: 'POST', body: '{}' });
}

export async function getMyEnterpriseInvites(status = 'pending'): Promise<EnterpriseInvite[]> {
  const data = await apiRequest<EnterpriseInvite[] | { results: EnterpriseInvite[] }>(
    `/users/me/enterprise-invites/?status=${encodeURIComponent(status)}`,
  );
  return unwrap(data);
}

export async function acceptEnterpriseInvite(
  id: string,
): Promise<{ invite: EnterpriseInvite; membership: ProviderEnterpriseMembership }> {
  return apiRequest(`/users/me/enterprise-invites/${id}/accept/`, { method: 'POST', body: '{}' });
}

export async function rejectEnterpriseInvite(id: string): Promise<EnterpriseInvite> {
  return apiRequest(`/users/me/enterprise-invites/${id}/reject/`, { method: 'POST', body: '{}' });
}

export async function getMyEnterprises(): Promise<ProviderEnterpriseMembership[]> {
  const data = await apiRequest<ProviderEnterpriseMembership[] | { results: ProviderEnterpriseMembership[] }>(
    '/users/me/enterprises/',
  );
  return unwrap(data);
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

export async function getMyEnterpriseDetail(enterpriseId: string): Promise<ProviderEnterpriseDetail> {
  return apiRequest(`/users/me/enterprises/${enterpriseId}/`);
}

export async function getMyEnterprisePayroll(enterpriseId: string): Promise<ProviderEnterprisePayroll> {
  return apiRequest(`/users/me/enterprises/${enterpriseId}/payroll/`);
}

export async function updateMyEnterprisePayroll(
  enterpriseId: string,
  data: { pay_phone?: string },
): Promise<ProviderEnterprisePayroll> {
  return apiRequest(`/users/me/enterprises/${enterpriseId}/payroll/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/* ─── Paie employés (entreprise) ─── */

export interface EnterprisePayrollSettings {
  is_enabled: boolean;
  frequency: 'weekly' | 'monthly' | string;
  payment_mode: 'automatic' | 'manual' | string;
  employee_pool_percent: string | number;
  lead_weight_multiplier: string | number;
  notes?: string;
  updated_at?: string;
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
  created_at?: string;
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
  periods: Array<{
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
  }>;
  pending_by_employee: Array<{
    employee_id: string;
    first_name: string;
    last_name: string;
    missions_count: number;
    solo_missions: number;
    team_missions: number;
    total_amount: string;
  }>;
}

export interface PayrollEmployeeDetail {
  employee: PayrollEmployeeStats;
  earnings: Array<{
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
  }>;
  payments: Array<{
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
  }>;
  assignments: Array<{
    id: string;
    mission_id: string;
    mission_title: string;
    mission_status: string;
    is_lead: boolean;
    assigned_at?: string | null;
    completed_at?: string | null;
    rejected_at?: string | null;
  }>;
}

export interface ProviderEnterprisePayroll extends PayrollEmployeeDetail {
  enterprise?: { id: string; company_name: string };
  membership_id?: string;
}

export async function getPayrollDashboard(): Promise<PayrollDashboard> {
  return apiRequest('/enterprises/payroll/dashboard/');
}

export async function getPayrollSettings(): Promise<EnterprisePayrollSettings> {
  return apiRequest('/enterprises/payroll/settings/');
}

export async function updatePayrollSettings(
  data: Partial<EnterprisePayrollSettings>,
): Promise<EnterprisePayrollSettings> {
  return apiRequest('/enterprises/payroll/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetPayrollSettings(): Promise<EnterprisePayrollSettings> {
  return apiRequest('/enterprises/payroll/settings/', { method: 'DELETE' });
}

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const data = await apiRequest<PayrollPeriod[] | { results: PayrollPeriod[] }>(
    '/enterprises/payroll/periods/',
  );
  return unwrap(data);
}

export async function generatePayrollPeriod(data?: {
  frequency?: string;
  period_start?: string;
  period_end?: string;
  payment_mode?: string;
}): Promise<PayrollPeriod> {
  return apiRequest('/enterprises/payroll/periods/', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function updatePayrollPeriod(
  id: string,
  data: {
    period_start?: string;
    period_end?: string;
    frequency?: string;
    payment_mode?: string;
    notes?: string;
  },
): Promise<PayrollPeriod> {
  return apiRequest(`/enterprises/payroll/periods/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function approvePayrollPeriod(id: string): Promise<PayrollPeriod> {
  return apiRequest(`/enterprises/payroll/periods/${id}/approve/`, {
    method: 'POST',
    body: '{}',
  });
}

export async function payPayrollPeriod(id: string): Promise<PayrollPeriod> {
  return apiRequest(`/enterprises/payroll/periods/${id}/pay/`, {
    method: 'POST',
    body: '{}',
  });
}

export async function deletePayrollPeriod(
  id: string,
  force = false,
): Promise<{ deleted: boolean; cancelled: boolean; id: string }> {
  const suffix = force ? '?force=true' : '';
  return apiRequest(`/enterprises/payroll/periods/${id}/${suffix}`, { method: 'DELETE' });
}

export async function getPayrollEmployeeDetail(employeeId: string): Promise<PayrollEmployeeDetail> {
  return apiRequest(`/enterprises/payroll/employees/${employeeId}/`);
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

export async function listEnterpriseRecruitmentCalls(status = 'all'): Promise<RecruitmentCall[]> {
  const data = await apiRequest<RecruitmentCall[] | { results: RecruitmentCall[] }>(
    `/users/enterprise/recruitment-calls/?status=${encodeURIComponent(status)}`,
  );
  return unwrap(data);
}

export async function createRecruitmentCall(payload: {
  title: string;
  description: string;
  role?: string;
  position?: string;
  city?: string;
  requirements?: string;
  days_valid?: number;
}): Promise<RecruitmentCall> {
  return apiRequest('/users/enterprise/recruitment-calls/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRecruitmentCall(
  id: string,
  payload: Partial<{ status: string; title: string; description: string; position: string; city: string; requirements: string; role: string }>,
): Promise<RecruitmentCall> {
  return apiRequest(`/users/enterprise/recruitment-calls/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listRecruitmentApplications(callId: string, status = 'all'): Promise<RecruitmentApplication[]> {
  const data = await apiRequest<RecruitmentApplication[] | { results: RecruitmentApplication[] }>(
    `/users/enterprise/recruitment-calls/${callId}/applications/?status=${encodeURIComponent(status)}`,
  );
  return unwrap(data);
}

export async function reviewRecruitmentApplication(
  applicationId: string,
  action: 'accept' | 'reject',
): Promise<RecruitmentApplication | { application: RecruitmentApplication; employee_id: string }> {
  return apiRequest(`/users/enterprise/recruitment-applications/${applicationId}/review/`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function listOpenRecruitmentCalls(city?: string): Promise<RecruitmentCall[]> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : '';
  const data = await apiRequest<RecruitmentCall[] | { results: RecruitmentCall[] }>(
    `/users/recruitment-calls/open/${qs}`,
  );
  return unwrap(data);
}

export async function applyToRecruitmentCall(callId: string, message = ''): Promise<RecruitmentApplication> {
  return apiRequest(`/users/recruitment-calls/${callId}/apply/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getMyRecruitmentApplications(status = 'all'): Promise<RecruitmentApplication[]> {
  const data = await apiRequest<RecruitmentApplication[] | { results: RecruitmentApplication[] }>(
    `/users/me/recruitment-applications/?status=${encodeURIComponent(status)}`,
  );
  return unwrap(data);
}
