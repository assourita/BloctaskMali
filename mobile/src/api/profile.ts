import { apiFormRequest, apiRequest } from './client';
import type { User } from '../types';

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  gps_tracking_enabled?: boolean;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return apiRequest<User>('/users/me/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export interface UserStats {
  active_missions?: number;
  completed_missions?: number;
  total_spent?: number;
  total_earned?: number;
  reputation_score?: number;
  [key: string]: number | undefined;
}

export async function getUserStats(): Promise<UserStats> {
  return apiRequest<UserStats>('/users/stats/');
}

export async function toggleAvailability(): Promise<unknown> {
  return apiRequest('/users/toggle-availability/', { method: 'POST', body: '{}' });
}

/** Soumission KYC (NINA + photos pièce identité + selfie). */
export async function submitKyc(payload: {
  nina: string;
  idFront?: { uri: string; name: string; type: string };
  idBack?: { uri: string; name: string; type: string };
  selfie?: { uri: string; name: string; type: string };
}): Promise<User> {
  const formData = new FormData();
  formData.append('nina', payload.nina);
  if (payload.idFront) {
    formData.append('id_card_front', {
      uri: payload.idFront.uri,
      name: payload.idFront.name,
      type: payload.idFront.type,
    } as unknown as Blob);
  }
  if (payload.idBack) {
    formData.append('id_card_back', {
      uri: payload.idBack.uri,
      name: payload.idBack.name,
      type: payload.idBack.type,
    } as unknown as Blob);
  }
  if (payload.selfie) {
    formData.append('selfie_verification', {
      uri: payload.selfie.uri,
      name: payload.selfie.name,
      type: payload.selfie.type,
    } as unknown as Blob);
  }
  return apiFormRequest<User>('/users/kyc/submit/', formData, true, 'PATCH');
}

export async function updateProviderProfile(payload: {
  skills?: string[];
  categories?: string[];
  vehicle_type?: string;
}): Promise<unknown> {
  return apiRequest('/users/provider/profile/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(email: string): Promise<{ detail?: string }> {
  return apiRequest('/users/password/reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}): Promise<unknown> {
  return apiRequest('/users/password/change/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface PublicProviderProfile {
  id: string;
  first_name: string;
  last_name: string;
  city?: string;
  bio?: string;
  profile_picture?: string;
  reputation_score?: number;
  level?: string;
  total_missions_completed?: number;
  skills?: string[];
  identity_verified?: boolean;
  is_available?: boolean;
}

export async function getProviderPublicProfile(id: string): Promise<PublicProviderProfile> {
  return apiRequest<PublicProviderProfile>(`/users/providers/${id}/public/`);
}
