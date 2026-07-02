import { apiRequest } from './client';
import type { Dispute } from '../types';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export const DISPUTE_REASONS: { id: string; label: string }[] = [
  { id: 'non_delivery', label: 'Non livraison' },
  { id: 'late_delivery', label: 'Livraison en retard' },
  { id: 'damaged_item', label: 'Article endommagé' },
  { id: 'wrong_item', label: 'Mauvais article' },
  { id: 'poor_quality', label: 'Mauvaise qualité' },
  { id: 'incomplete_work', label: 'Travail incomplet' },
  { id: 'fake_proof', label: 'Fausse preuve' },
  { id: 'payment_issue', label: 'Problème de paiement' },
  { id: 'behavior', label: 'Comportement inapproprié' },
  { id: 'other', label: 'Autre' },
];

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  under_review: "En cours d'examen",
  pending_evidence: 'Preuves en attente',
  arbitration: 'Arbitrage',
  resolved: 'Résolu',
  appealed: 'En appel',
  closed: 'Fermé',
};

/** Litiges de l'utilisateur courant. */
export async function getMyDisputes(): Promise<Dispute[]> {
  const data = await apiRequest<Dispute[] | { results: Dispute[] }>('/disputes/mine/');
  return unwrap(data);
}

export async function getDispute(id: string): Promise<Dispute> {
  return apiRequest<Dispute>(`/disputes/${id}/`);
}

export interface CreateDisputePayload {
  mission_id: string;
  reason: string;
  description: string;
  requested_resolution?: string;
}

export async function createDispute(payload: CreateDisputePayload): Promise<Dispute> {
  return apiRequest<Dispute>('/disputes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addDisputeEvidence(
  disputeId: string,
  payload: { evidence_type: string; title: string; description?: string },
): Promise<unknown> {
  return apiRequest(`/disputes/${disputeId}/add_evidence/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
