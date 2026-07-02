import { apiRequest } from './client';

export async function sendLocation(
  missionId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await apiRequest('/tracking/locations/', {
    method: 'POST',
    body: JSON.stringify({
      mission: missionId,
      location_type: 'current',
      latitude,
      longitude,
    }),
  });
}
