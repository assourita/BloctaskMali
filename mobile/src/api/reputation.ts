import { apiRequest } from './client';
import type { ReputationScore, ReputationHistoryItem } from '../types';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

/** Score de réputation de l'utilisateur courant (le backend renvoie une liste filtrée). */
export async function getMyReputation(): Promise<ReputationScore | null> {
  const data = await apiRequest<ReputationScore[] | { results: ReputationScore[] }>(
    '/reputation/scores/',
  );
  const list = unwrap(data);
  return list[0] || null;
}

export async function getReputationHistory(scoreId: string): Promise<ReputationHistoryItem[]> {
  try {
    const data = await apiRequest<ReputationHistoryItem[]>(
      `/reputation/scores/${scoreId}/history/`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const REPUTATION_LEVEL_LABELS: Record<string, string> = {
  platinum: 'Platine',
  gold: 'Or',
  silver: 'Argent',
  bronze: 'Bronze',
};

export const REPUTATION_LEVEL_COLORS: Record<string, string> = {
  platinum: '#7c3aed',
  gold: '#f59e0b',
  silver: '#94a3b8',
  bronze: '#b45309',
};
