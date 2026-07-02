import { apiRequest } from './client';
import type { MissionApplication } from '../types';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

/** Candidatures reçues pour une mission donnée (client). */
export async function getMissionApplications(missionId: string): Promise<MissionApplication[]> {
  const data = await apiRequest<MissionApplication[] | { results: MissionApplication[] }>(
    `/missions/${missionId}/applications/`,
  );
  return unwrap(data);
}

/** Mes candidatures (prestataire) ou celles de mes missions (client). */
export async function getMyApplications(
  scope: 'provider' | 'client' = 'provider',
): Promise<MissionApplication[]> {
  const data = await apiRequest<MissionApplication[] | { results: MissionApplication[] }>(
    `/missions/applications/my_applications/?scope=${scope}`,
  );
  return unwrap(data);
}

export async function acceptApplication(
  missionId: string,
  applicationId: string,
): Promise<unknown> {
  return apiRequest(`/missions/${missionId}/accept_application/`, {
    method: 'POST',
    body: JSON.stringify({ application_id: applicationId }),
  });
}

export async function rejectApplication(applicationId: string): Promise<unknown> {
  return apiRequest(`/missions/applications/${applicationId}/reject/`, {
    method: 'POST',
    body: '{}',
  });
}

export async function withdrawApplication(applicationId: string): Promise<unknown> {
  return apiRequest(`/missions/applications/${applicationId}/withdraw/`, {
    method: 'POST',
    body: '{}',
  });
}
