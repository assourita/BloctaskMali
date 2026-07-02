import { apiRequest } from './client';

export interface SubmitRatingPayload {
  mission_id: string;
  rated_user_id?: string;
  rating: number;
  comment?: string;
}

export async function submitRating(payload: SubmitRatingPayload): Promise<unknown> {
  return apiRequest('/ratings/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
