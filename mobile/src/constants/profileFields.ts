export const PROFILE_FIELD_LABELS: Record<string, string> = {
  phone_number: 'Téléphone',
  city: 'Ville',
  address: 'Adresse',
  nina: 'NINA / ID nationale',
  id_card_front: "Pièce d'identité (recto)",
  id_card_back: "Pièce d'identité (verso)",
  selfie_verification: "Photo d'identité (selfie)",
  phone_verified: 'Téléphone vérifié via NINA',
  skills: 'Compétences',
  categories: 'Catégories de missions',
  payment_method: 'Méthode de paiement Mobile Money',
  provider_profile: 'Profil prestataire',
  company_name: "Nom de l'entreprise",
  company_phone: 'Téléphone entreprise',
};

export function profileFieldLabel(field: string): string {
  return PROFILE_FIELD_LABELS[field] || field;
}

export interface SkillOption {
  value: string;
  label: string;
}

export const PROVIDER_SKILL_OPTIONS: SkillOption[] = [
  { value: 'livraison', label: 'Livraison & coursier' },
  { value: 'courses', label: 'Courses & achats' },
  { value: 'demenagement', label: 'Déménagement' },
  { value: 'transport', label: 'Transport de personnes' },
  { value: 'menage', label: 'Ménage & nettoyage' },
  { value: 'bricolage', label: 'Bricolage & montage' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'peinture', label: 'Peinture' },
  { value: 'jardinage', label: 'Jardinage' },
  { value: 'garde-enfants', label: "Garde d'enfants" },
  { value: 'aide-domicile', label: 'Aide à domicile' },
  { value: 'cuisine', label: 'Cuisine & traiteur' },
  { value: 'informatique', label: 'Informatique & tech' },
  { value: 'mecanique', label: 'Mécanique auto' },
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'esthetique', label: 'Esthétique & beauté' },
  { value: 'photographie', label: 'Photographie' },
  { value: 'securite', label: 'Sécurité & gardiennage' },
  { value: 'administratif', label: 'Services administratifs' },
];

// Champs gérés directement dans l'écran de complétion (hors KYC, géré à part).
export const KYC_FIELDS = ['nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'phone_verified'];
