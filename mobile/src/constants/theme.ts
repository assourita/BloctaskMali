export const colors = {
  primary: '#3CB371',
  primaryDark: '#2ea361',
  primaryLight: '#ecfdf3',
  accent: '#6C5CE7',
  accentLight: '#efeafe',
  background: '#f4f6f9',
  surface: '#ffffff',
  surfaceAlt: '#f8f9fa',
  text: '#1a1a2e',
  textMuted: '#6b7280',
  border: '#e9ecef',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  success: '#10b981',
  successLight: '#d1fae5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

// Ombre douce réutilisable (cartes web-like)
export const shadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

// Couleurs de statut de mission (alignées au web)
export const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  draft: { label: 'Brouillon', bg: '#f3f4f6', fg: '#6b7280' },
  pending: { label: 'En attente', bg: colors.warningLight, fg: '#92400e' },
  funded: { label: 'Financée', bg: colors.infoLight, fg: '#1e40af' },
  published: { label: 'Publiée', bg: colors.infoLight, fg: '#1e40af' },
  accepted: { label: 'Acceptée', bg: colors.accentLight, fg: '#5b21b6' },
  in_progress: { label: 'En cours', bg: colors.successLight, fg: '#065f46' },
  submitted: { label: 'Preuves soumises', bg: colors.infoLight, fg: '#1e40af' },
  completed: { label: 'Terminée', bg: colors.successLight, fg: '#065f46' },
  cancelled: { label: 'Annulée', bg: colors.dangerLight, fg: '#991b1b' },
  disputed: { label: 'Litige', bg: colors.dangerLight, fg: '#991b1b' },
};
