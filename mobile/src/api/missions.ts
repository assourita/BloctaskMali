import { ApiError, apiRequest } from './client';
import type { Mission, MissionStats, UserRole } from '../types';

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export type MissionScope = 'ordered' | 'received';

export async function getMyMissions(
  role: UserRole,
  scope?: MissionScope,
): Promise<Mission[]> {
  const params = new URLSearchParams({ role });
  if (role === 'enterprise' && scope === 'received') {
    params.set('scope', 'received');
  }
  const data = await apiRequest<Mission[] | { results: Mission[] }>(
    `/missions/my_missions/?${params}`,
  );
  return unwrapList(data);
}

export async function getAvailableMissions(
  lat?: number,
  lng?: number,
  asEnterprise = false,
): Promise<Mission[]> {
  const params = new URLSearchParams({
    role: asEnterprise ? 'enterprise' : 'provider',
    page_size: '25',
  });
  if (lat != null && lng != null) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
    params.set('radius', '15');
  }
  const data = await apiRequest<Mission[] | { results: Mission[] }>(
    `/missions/available/?${params}`,
  );
  return unwrapList(data);
}

export async function getMission(id: string): Promise<Mission> {
  return apiRequest<Mission>(`/missions/${id}/`);
}

export async function getStats(role?: UserRole): Promise<MissionStats> {
  const q = role ? `?role=${role}` : '';
  const raw = await apiRequest<Record<string, number | null>>(`/missions/stats/${q}`);
  return {
    active_missions: Number(raw.in_progress_missions ?? 0),
    pending_missions: Number(raw.funded_missions ?? 0),
    completed_missions: Number(raw.completed_missions ?? 0),
    total_spent: Number(raw.total_spent ?? 0),
    total_earned: Number(raw.total_earned ?? 0),
  };
}

export interface CreateMissionPayload {
  title: string;
  description: string;
  budget: number;
  currency?: string;
  pickup_address?: string;
  delivery_address?: string;
  deadline?: string;
  category?: string;
}

export async function createMission(payload: CreateMissionPayload): Promise<Mission> {
  return apiRequest<Mission>('/missions/', {
    method: 'POST',
    body: JSON.stringify({ ...payload, currency: payload.currency || 'XOF' }),
  });
}

export interface CreateMissionWithPaymentPayload extends CreateMissionPayload {
  payment_method: string;
  phone_number: string;
  operator: string;
  escrow_amount: number;
  platform_fee: number;
  country_code?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  requires_vehicle?: boolean;
  requires_photo?: boolean;
  requires_signature?: boolean;
  requires_id_verification?: boolean;
  merchandise_value?: number;
  special_instructions?: string;
  estimated_duration?: number;
  start_time?: string | null;
  end_time?: string | null;
}

/** Crée une mission ET le paiement associé (renvoie payment_id à confirmer). */
export async function createMissionWithPayment(
  payload: CreateMissionWithPaymentPayload,
): Promise<Mission> {
  return apiRequest<Mission>('/missions/', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      currency: payload.currency || 'XOF',
      country_code: payload.country_code || '+223',
      escrow_enabled: true,
    }),
  });
}

export interface TrackingData {
  mission_id?: string;
  status?: string;
  provider_location?: { latitude: number; longitude: number; timestamp?: string } | null;
  pickup?: { latitude?: number; longitude?: number; address?: string } | null;
  delivery?: { latitude?: number; longitude?: number; address?: string } | null;
  locations?: Array<{ latitude: number; longitude: number; recorded_at?: string }>;
}

export async function getTracking(missionId: string): Promise<TrackingData> {
  return apiRequest<TrackingData>(`/missions/${missionId}/tracking/`);
}

export async function solicitProvider(
  missionId: string,
  providerId: string,
  message = '',
): Promise<unknown> {
  return apiRequest(`/missions/${missionId}/solicit/`, {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId, message }),
  });
}

export async function solicitEnterprise(
  missionId: string,
  enterpriseId: string,
  message = '',
): Promise<unknown> {
  return apiRequest(`/missions/${missionId}/solicit/`, {
    method: 'POST',
    body: JSON.stringify({ enterprise_id: enterpriseId, message }),
  });
}

export async function applyToMission(id: string, message = ''): Promise<unknown> {
  return apiRequest(`/missions/${id}/apply/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function startMission(id: string): Promise<unknown> {
  return apiRequest(`/missions/${id}/start/`, { method: 'POST', body: '{}' });
}

export async function submitProof(id: string): Promise<unknown> {
  return apiRequest(`/missions/${id}/submit_proof/`, { method: 'POST', body: '{}' });
}

export async function validateMission(id: string): Promise<unknown> {
  return apiRequest(`/missions/${id}/validate/`, { method: 'POST', body: '{}' });
}

export async function cancelMission(id: string, reason?: string): Promise<unknown> {
  return apiRequest(`/missions/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function expireMissionDecision(
  id: string,
  action: 'continue' | 'cancel',
  opts?: { new_deadline?: string; reason?: string },
): Promise<Mission> {
  const body: Record<string, string> = { action };
  if (opts?.new_deadline) body.new_deadline = opts.new_deadline;
  if (opts?.reason) body.reason = opts.reason;
  const data = await apiRequest<Mission | { mission: Mission }>(`/missions/${id}/expire_decision/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return 'mission' in data && data.mission ? data.mission : (data as Mission);
}

export async function payDeposit(id: string, amount?: number): Promise<unknown> {
  return apiRequest(`/missions/${id}/pay_deposit/`, {
    method: 'POST',
    body: JSON.stringify(amount != null ? { amount } : {}),
  });
}

/**
 * Bloque la caution mission depuis le solde déjà alimenté via Mobile Money.
 * Si le solde est insuffisant, alimentez d'abord la caution (écran Caution / Finances).
 */
export async function payDepositSmart(id: string): Promise<{ toppedUp: number }> {
  await payDeposit(id);
  return { toppedUp: 0 };
}
