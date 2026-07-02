import { ApiError, apiRequest } from './client';

export interface MapMissionLink {
  mission_id: string;
  mission_title: string;
  mission_status: string;
  mission_count: number;
  can_contact: boolean;
  can_navigate: boolean;
  can_see_exact_location: boolean;
}

export interface MapUser {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  user_type: 'client' | 'provider' | 'enterprise';
  latitude: number;
  longitude: number;
  city: string;
  source: 'gps' | 'city';
  location_precision: 'exact' | 'approximate';
  profile_picture?: string | null;
  is_live: boolean;
  mission_link?: MapMissionLink | null;
}

export interface MapPresence {
  center: { lat: number; lng: number };
  users: MapUser[];
  count: number;
}

export async function getMapPresence(search?: string): Promise<MapPresence> {
  let path = '/config/map/presence/';
  if (search?.trim()) {
    path += `?search=${encodeURIComponent(search.trim())}`;
  }
  return apiRequest<MapPresence>(path);
}

export async function getMapUserDetail(userId: string): Promise<MapUser> {
  return apiRequest<MapUser>(`/config/map/users/${userId}/`);
}

export async function updateMapLocation(latitude: number, longitude: number): Promise<void> {
  await apiRequest('/config/map/location/', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export { ApiError };
