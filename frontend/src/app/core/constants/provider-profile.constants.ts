export interface SelectOption {
  value: string;
  label: string;
}

export const PROVIDER_SKILL_OPTIONS: SelectOption[] = [
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
  { value: 'garde-enfants', label: 'Garde d\'enfants' },
  { value: 'aide-domicile', label: 'Aide à domicile' },
  { value: 'cuisine', label: 'Cuisine & traiteur' },
  { value: 'informatique', label: 'Informatique & tech' },
  { value: 'mecanique', label: 'Mécanique auto' },
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'esthetique', label: 'Esthétique & beauté' },
  { value: 'photographie', label: 'Photographie' },
  { value: 'securite', label: 'Sécurité & gardiennage' },
  { value: 'administratif', label: 'Services administratifs' },
  { value: 'traduction', label: 'Traduction & rédaction' },
  { value: 'evenementiel', label: 'Événementiel & animation' },
];

export const VEHICLE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'moto', label: 'Moto' },
  { value: 'voiture', label: 'Voiture' },
  { value: 'velo', label: 'Vélo' },
  { value: 'camionnette', label: 'Camionnette' },
  { value: 'camion', label: 'Camion' },
  { value: 'pieton', label: 'À pied (sans véhicule)' },
  { value: 'autre', label: 'Autre' },
];
