import { apiRequest } from './client';

export interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number | string;
  currency: string;
  description?: string;
  status: string;
  created_at: string;
}

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  const data = await apiRequest<WalletTransaction[] | { results: WalletTransaction[] }>(
    '/users/wallet/transactions/',
  );
  return unwrap(data);
}
