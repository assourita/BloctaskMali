/** Configuration marché BlockTask — Mali uniquement (phase 1). */

export const MARKET_SCOPE = 'mali';
export const DEFAULT_COUNTRY = 'Mali';
export const DEFAULT_COUNTRY_CODE = 'ML';
export const DEFAULT_PHONE_PREFIX = '+223';
export const DEFAULT_CURRENCY = 'XOF';
export const DEFAULT_ID_LABEL = 'NINA';
export const DEFAULT_MAP_CENTER = { lat: 12.6392, lng: -8.0029 };

export const MALI_CITIES = [
  'Bamako', 'Ségou', 'Mopti', 'Sikasso', 'Kayes', 'Gao',
  'Koutiala', 'Kati', 'Markala', 'Tombouctou', 'San', 'Bougouni',
];

export const MALI_COUNTRY = {
  code: 'ML',
  name: 'Mali',
  phonePrefix: '+223',
  currency: 'XOF',
  idLabel: 'NINA',
  cities: MALI_CITIES,
  mobileMoney: ['orange', 'moov'] as const,
  phoneLength: 8,
  phonePlaceholder: '70 XX XX XX',
  flag: '🇲🇱',
};

/** Rétrocompatibilité */
export const UEMOA_COUNTRIES = [MALI_COUNTRY];

export const MOBILE_MONEY_OPERATORS: Record<string, { id: string; name: string; icon: string; color: string }> = {
  orange: { id: 'orange', name: 'Orange Money Mali', icon: 'phone_android', color: '#FF6600' },
  moov: { id: 'moov', name: 'Moov Money Mali', icon: 'phone_android', color: '#4169E1' },
};

export function getOperatorsForCountry(_countryCode?: string) {
  return MALI_COUNTRY.mobileMoney
    .map((id) => MOBILE_MONEY_OPERATORS[id])
    .filter(Boolean);
}

export function formatXOF(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

/** Conversion indicative testnet : montant symbolique en ETH pour l'ancrage escrow Sepolia */
export function xofToTestEth(xof: number): string {
  const eth = Math.max(0.001, xof / 10_000_000);
  return eth.toFixed(4);
}
