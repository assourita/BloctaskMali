import { apiFormRequest, apiRequest } from './client';

export type ProofType =
  | 'photo_before'
  | 'photo_during'
  | 'photo_after'
  | 'signature_client'
  | 'receipt'
  | 'video';

export interface MissionProof {
  id: string;
  mission: string;
  proof_type: string;
  title?: string;
  file: string;
  verification_status: string;
  created_at: string;
}

export interface ProofChecklist {
  pickup_photo_done: boolean;
  delivery_photo_done: boolean;
  signature_done: boolean;
  qr_code_done: boolean;
  receipt_done: boolean;
  is_complete: boolean;
  completion_percentage: number;
}

export const PROOF_LABELS: Record<ProofType, string> = {
  photo_before: 'Photo avant',
  photo_during: 'Photo pendant',
  photo_after: 'Photo après',
  signature_client: 'Signature client',
  receipt: 'Reçu',
  video: 'Vidéo',
};

export async function getProofs(missionId: string): Promise<MissionProof[]> {
  const data = await apiRequest<MissionProof[] | { results: MissionProof[] }>(
    `/proofs/proofs/?mission=${missionId}`,
  );
  return Array.isArray(data) ? data : data.results || [];
}

export async function getChecklist(missionId: string): Promise<ProofChecklist | null> {
  const data = await apiRequest<ProofChecklist[] | { results: ProofChecklist[] }>(
    `/proofs/checklists/?mission=${missionId}`,
  );
  const list = Array.isArray(data) ? data : data.results || [];
  return list[0] || null;
}

export async function uploadProof(
  missionId: string,
  proofType: ProofType,
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<MissionProof> {
  const formData = new FormData();
  formData.append('mission', missionId);
  formData.append('proof_type', proofType);
  formData.append('title', PROOF_LABELS[proofType]);
  formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);

  return apiFormRequest<MissionProof>('/proofs/proofs/', formData);
}
