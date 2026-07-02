import type { Operator } from '../types';

export const DEFAULT_PHONE_PREFIX = '+223';
export const DEFAULT_CURRENCY = 'XOF';
export const DEFAULT_ID_LABEL = 'NINA';

export const MALI_CITIES = [
  'Bamako', 'Ségou', 'Mopti', 'Sikasso', 'Kayes', 'Gao',
  'Koutiala', 'Kati', 'Markala', 'Tombouctou', 'San', 'Bougouni',
];

export interface OperatorInfo {
  id: Operator;
  name: string;
  color: string;
}

export const MOBILE_MONEY_OPERATORS: OperatorInfo[] = [
  { id: 'orange', name: 'Orange Money', color: '#FF6600' },
  { id: 'moov', name: 'Moov Money', color: '#4169E1' },
];

export function formatXOF(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return '0 FCFA';
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

/** 5% plateforme, 95% prestataire, 100% bloqué en escrow */
export function calculateFees(amount: number) {
  const platformFee = Math.round(amount * 0.05);
  return {
    platformFee,
    escrowAmount: Math.round(amount),
    providerAmount: Math.round(amount * 0.95),
  };
}
