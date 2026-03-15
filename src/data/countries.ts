export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  center: { lat: number; lng: number };
  nationalAltitude: number;
}

export const SCALE_ALTITUDES = {
  international: 2.5,
  national: 0.8,
  regional: 0.25,
  local: 0.08,
} as const;

export const COUNTRIES: CountryConfig[] = [
  { code: 'FR', name: 'France', flag: '🇫🇷', center: { lat: 46.5, lng: 2.5 }, nationalAltitude: 0.8 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];
