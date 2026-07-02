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
  employee: string;
  notes?: string;
}): Promise<EmployeeAssignment> {
  return apiRequest<EmployeeAssignment>('/enterprises/assignments/', {
    method: 'POST',
    body: JSON.stringify({ ...payload, assignment_type: 'manual' }),
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
