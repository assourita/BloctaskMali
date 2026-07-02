import { apiRequest } from './client';
import type { MissionSolicitation } from '../types';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

/** Sollicitations reçues (prestataire). */
export async function getMySolicitations(
  scope: 'provider' | 'enterprise' = 'provider',
  status?: string,
): Promise<MissionSolicitation[]> {
  const params = new URLSearchParams({ scope });
  if (status) params.set('status', status);
  const data = await apiRequest<MissionSolicitation[] | { results: MissionSolicitation[] }>(
    `/missions/solicitations/my_solicitations/?${params}`,
  );
  return unwrap(data);
}

/** Sollicitations envoyées (client). */
export async function getSentSolicitations(): Promise<MissionSolicitation[]> {
  const data = await apiRequest<MissionSolicitation[] | { results: MissionSolicitation[] }>(
    '/missions/solicitations/sent/',
  );
  return unwrap(data);
}

export async function acceptSolicitation(
  id: string,
): Promise<{ status: string; mission_id: string }> {
  return apiRequest(`/missions/solicitations/${id}/accept/`, { method: 'POST', body: '{}' });
}

export async function rejectSolicitation(id: string): Promise<unknown> {
  return apiRequest(`/missions/solicitations/${id}/reject/`, { method: 'POST', body: '{}' });
}

export async function cancelSolicitation(id: string): Promise<unknown> {
  return apiRequest(`/missions/solicitations/${id}/cancel/`, { method: 'POST', body: '{}' });
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

export interface SolicitationPreview {
  solicitation: MissionSolicitation;
  mission: import('../types').Mission;
  workflow?: SolicitationWorkflow;
  enterprise_employees?: { id: string; first_name: string; last_name: string; position?: string }[];
  client: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    bio?: string;
    city?: string;
    country?: string;
    identity_verified?: boolean;
  };
  applications: {
    id: string;
    provider?: {
      id: string;
      first_name: string;
      last_name: string;
      reputation_score?: number;
      completed_missions?: number;
      city?: string;
      message?: string;
    };
    message?: string;
    proposed_price?: string | number;
    status: string;
    created_at: string;
  }[];
  other_solicitations: {
    id: string;
    target_type: 'provider' | 'enterprise';
    status: string;
    provider?: { id: string; first_name: string; last_name: string };
    enterprise_name?: string;
    created_at: string;
  }[];
}

export async function getSolicitationPreview(id: string): Promise<SolicitationPreview> {
  return apiRequest(`/missions/solicitations/${id}/preview/`);
}
