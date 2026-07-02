import { apiRequest } from './client';

export interface ProviderDeposit {
  id: string;
  amount: number | string;
  status: string;
  deposit_tx_hash?: string;
  created_at: string;
  locked_for_mission?: string;
}

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export async function getDeposits(): Promise<ProviderDeposit[]> {
  const data = await apiRequest<ProviderDeposit[] | { results: ProviderDeposit[] }>('/escrow/deposits/');
  return unwrap(data);
}

export interface DepositFundPayload {
  amount: number;
  phone_number: string;
  operator: string;
  otp?: string;
}

export async function fundDeposit(payload: DepositFundPayload): Promise<{
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

export interface ProviderProfile {
  skills?: string[];
  categories?: string[];
  level?: string;
  reputation_score?: number;
  is_available?: boolean;
  deposit_balance?: number;
  deposit_locked?: number;
  total_missions_completed?: number;
  total_earnings?: number;
  average_rating?: number;
}

export async function getProviderProfile(): Promise<ProviderProfile | null> {
  const user = await apiRequest<{ provider_profile?: ProviderProfile | null }>('/users/me/');
  return user.provider_profile || null;
}
