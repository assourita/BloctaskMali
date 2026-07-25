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
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  role: string;
  missions_completed?: number;
  is_active: boolean;
  hired_at?: string;
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
  latitude: number;
  longitude: number;
  timestamp: string;
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
  return unwrap(data);
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
  payload: Partial<Pick<EnterpriseEmployee, 'first_name' | 'last_name' | 'email' | 'phone' | 'position' | 'role' | 'is_active'>>,
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
  return unwrap(data);
}

export async function createTeam(payload: {
  name: string;
  description?: string;
  manager?: string | null;
}): Promise<EnterpriseTeam> {
  return apiRequest('/enterprises/teams/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTeam(
  id: string,
  payload: Partial<{ name: string; description: string; manager: string | null; is_active: boolean }>,
): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  await apiRequest(`/enterprises/teams/${id}/`, { method: 'DELETE' });
}

export async function addTeamMember(teamId: string, employeeId: string): Promise<EnterpriseTeam> {
  return apiRequest(`/enterprises/teams/${teamId}/members/`, {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
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
