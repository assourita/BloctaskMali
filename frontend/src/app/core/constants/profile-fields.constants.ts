export const PROFILE_FIELD_LABELS: Record<string, string> = {
  phone_number: 'Téléphone',
  city: 'Ville',
  address: 'Adresse',
  nina: 'NINA / ID nationale',
  id_card_front: 'Pièce d\'identité (recto)',
  id_card_back: 'Pièce d\'identité (verso)',
  selfie_verification: 'Photo d\'identité (selfie)',
  phone_verified: 'Téléphone vérifié via NINA',
  skills: 'Compétences',
  categories: 'Catégories de missions',
  payment_method: 'Méthode de paiement Mobile Money',
  provider_profile: 'Profil prestataire',
  company_name: 'Nom de l\'entreprise',
  company_phone: 'Téléphone entreprise',
  rccm: 'RCCM',
  ifu: 'IFU',
};

export function profileFieldLabel(field: string): string {
  return PROFILE_FIELD_LABELS[field] || field;
}
