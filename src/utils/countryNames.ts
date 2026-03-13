// src/utils/countryNames.ts

const COUNTRY_NAMES: Record<string, string> = {
  fr: 'France',
  gb: 'United Kingdom',
  us: 'United States',
  de: 'Germany',
  es: 'Spain',
  it: 'Italy',
  br: 'Brazil',
  cn: 'China',
  jp: 'Japan',
  in: 'India',
  ru: 'Russia',
  au: 'Australia',
  ca: 'Canada',
  mx: 'Mexico',
  kr: 'South Korea',
  za: 'South Africa',
  nl: 'Netherlands',
  be: 'Belgium',
  ch: 'Switzerland',
  at: 'Austria',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  pl: 'Poland',
  pt: 'Portugal',
  ie: 'Ireland',
  il: 'Israel',
  tr: 'Turkey',
  eg: 'Egypt',
  ng: 'Nigeria',
  ke: 'Kenya',
  ua: 'Ukraine',
  sa: 'Saudi Arabia',
  ae: 'United Arab Emirates',
  sg: 'Singapore',
  ar: 'Argentina',
  gr: 'Greece',
  cz: 'Czech Republic',
  ro: 'Romania',
  hu: 'Hungary',
  hr: 'Croatia',
  my: 'Malaysia',
  th: 'Thailand',
  id: 'Indonesia',
  ph: 'Philippines',
  vn: 'Vietnam',
  co: 'Colombia',
  cl: 'Chile',
  pe: 'Peru',
  nz: 'New Zealand',
};

/**
 * Get full English country name from ISO 2-letter code.
 * Returns uppercased code as fallback for unknown codes.
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toLowerCase()] || code.toUpperCase();
}
