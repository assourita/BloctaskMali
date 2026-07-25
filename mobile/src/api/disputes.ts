import { apiFormRequest, apiRequest } from './client';
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

export const DISPUTE_DECISION_LABELS: Record<string, string> = {
  pending: 'En attente',
  client_wins: 'Client gagne — remboursement total',
  provider_wins: 'Prestataire gagne — paiement total',
  split: 'Partage 50/50',
  partial_client: 'Remboursement partiel client',
  partial_provider: 'Paiement partiel prestataire',
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

export async function submitDisputeDefense(
  disputeId: string,
  defendant_response: string,
): Promise<Dispute> {
  return apiRequest<Dispute>(`/disputes/${disputeId}/submit_defense/`, {
    method: 'POST',
    body: JSON.stringify({ defendant_response }),
  });
}

export async function addDisputeEvidence(
  disputeId: string,
  payload: {
    evidence_type: string;
    title: string;
    description?: string;
    file?: { uri: string; name: string; type: string };
  },
): Promise<unknown> {
  if (payload.file) {
    const formData = new FormData();
    formData.append('evidence_type', payload.evidence_type);
    formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    formData.append('file', {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.type,
    } as unknown as Blob);
    return apiFormRequest(`/disputes/${disputeId}/add_evidence/`, formData);
  }
  return apiRequest(`/disputes/${disputeId}/add_evidence/`, {
    method: 'POST',
    body: JSON.stringify({
      evidence_type: payload.evidence_type,
      title: payload.title,
      description: payload.description || '',
    }),
  });
}
