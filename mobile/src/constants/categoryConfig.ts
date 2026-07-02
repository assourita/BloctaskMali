import type { Category } from '../api/categories';

export type CategoryType = 'delivery' | 'home_service' | 'other';

export interface CategoryConfig {
  type: CategoryType;
  requiresPickup: boolean;
  requiresDelivery: boolean;
  showContacts: boolean;
  locationLabel: string;
  requirements: string[];
  dateLabel: string;
  showTimeRange: boolean;
}

const DELIVERY = (dateLabel: string, showTimeRange = false): CategoryConfig => ({
  type: 'delivery',
  requiresPickup: true,
  requiresDelivery: true,
  showContacts: true,
  locationLabel: 'Adresses',
  requirements: ['requires_vehicle', 'requires_photo'],
  dateLabel,
  showTimeRange,
});

const HOME = (
  locationLabel: string,
  dateLabel: string,
  requirements: string[] = [],
  showTimeRange = true,
): CategoryConfig => ({
  type: 'home_service',
  requiresPickup: false,
  requiresDelivery: false,
  showContacts: false,
  locationLabel,
  requirements,
  dateLabel,
  showTimeRange,
});

const CONFIGS: Record<string, CategoryConfig> = {
  // Livraison / transport — deadline (instant)
  livraison: DELIVERY('Deadline'),
  colis: DELIVERY('Deadline'),
  repas: DELIVERY('Heure de livraison'),
  courses: DELIVERY('Deadline'),
  course: DELIVERY('Deadline'),
  transport: DELIVERY('Date et heure de départ', true),
  demenagement: DELIVERY('Date du déménagement', true),
  demenage: DELIVERY('Date du déménagement', true),
  deplacement: DELIVERY('Date et heure de départ', true),
  envoi: DELIVERY('Deadline'),
  expedition: DELIVERY('Deadline'),

  // Services à domicile — plage horaire
  menage: HOME("Lieu d'intervention", 'Date de travail'),
  repassage: HOME("Lieu d'intervention", 'Date de travail'),
  garde: HOME("Lieu d'intervention", 'Date et horaire de garde', ['requires_id_verification']),
  nounou: HOME("Lieu d'intervention", 'Date et horaire de garde', ['requires_id_verification']),
  babysitting: HOME("Lieu d'intervention", 'Date et horaire de garde', ['requires_id_verification']),
  cours: HOME('Lieu des cours', 'Date et horaire du cours', ['requires_id_verification']),
  coiffure: HOME('Lieu de prestation', 'Date et heure du RDV'),
  coiffeur: HOME('Lieu de prestation', 'Date et heure du RDV'),
  beaute: HOME('Lieu de prestation', 'Date et heure du RDV'),
  massage: HOME('Lieu de prestation', 'Date et heure du RDV'),
  reparation: HOME("Lieu d'intervention", "Date et heure d'intervention"),
  depannage: HOME("Lieu d'intervention", "Date et heure d'intervention"),
  plomberie: HOME("Lieu d'intervention", "Date et heure d'intervention"),
  electricite: HOME("Lieu d'intervention", "Date et heure d'intervention"),
  menuiserie: HOME("Lieu d'intervention", 'Date de travail'),
  jardinage: HOME("Lieu d'intervention", 'Date de travail'),
  peinture: HOME("Lieu d'intervention", 'Date de travail'),
  bricolage: HOME("Lieu d'intervention", 'Date de travail'),
  nettoyage: HOME("Lieu d'intervention", 'Date de travail'),
  cuisine: HOME("Lieu d'intervention", 'Date et heure du service'),
  aide: HOME("Lieu d'intervention", "Date d'aide"),
  assistance: HOME("Lieu d'intervention", "Date d'assistance"),
};

const DEFAULT_CONFIG: CategoryConfig = {
  type: 'other',
  requiresPickup: true,
  requiresDelivery: true,
  showContacts: false,
  locationLabel: 'Adresses',
  requirements: [],
  dateLabel: 'Deadline',
  showTimeRange: false,
};

/** Résout la config du formulaire à partir d'une catégorie (slug puis nom, matching partiel). */
export function resolveCategoryConfig(category: Category | null): CategoryConfig {
  if (!category) return DEFAULT_CONFIG;

  if (category.slug && CONFIGS[category.slug]) return CONFIGS[category.slug];

  const slug = (category.slug || '').toLowerCase();
  for (const [keyword, config] of Object.entries(CONFIGS)) {
    if (slug.includes(keyword)) return config;
  }

  const name = (category.name || '').toLowerCase();
  for (const [keyword, config] of Object.entries(CONFIGS)) {
    if (name.includes(keyword)) return config;
  }

  return DEFAULT_CONFIG;
}
