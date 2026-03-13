import type { StoryCluster } from './topicClustering';
import { ADMIN_REGIONS } from '@/data/administrative-regions';

export interface GeographicGapResult {
  hasGeoGap: boolean;
  coveredCountries: string[];
  countryGapLabel: string;
  regionalBreakdown: RegionalGap[];
}

export interface RegionalGap {
  country: string;
  coveredRegions: string[];
  missingRegions: string[];
  regionGapLabel: string;
}

const NO_GAP: GeographicGapResult = {
  hasGeoGap: false,
  coveredCountries: [],
  countryGapLabel: '',
  regionalBreakdown: [],
};

const COUNTRY_DEMONYMS: Record<string, string> = {
  fr: 'French',
  gb: 'British',
  us: 'American',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  br: 'Brazilian',
  cn: 'Chinese',
  jp: 'Japanese',
  in: 'Indian',
  ru: 'Russian',
  au: 'Australian',
  ca: 'Canadian',
  mx: 'Mexican',
  kr: 'South Korean',
  za: 'South African',
  nl: 'Dutch',
  be: 'Belgian',
  ch: 'Swiss',
  at: 'Austrian',
  se: 'Swedish',
  no: 'Norwegian',
  dk: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  pt: 'Portuguese',
  ie: 'Irish',
  il: 'Israeli',
  tr: 'Turkish',
  eg: 'Egyptian',
  ng: 'Nigerian',
  ke: 'Kenyan',
  ua: 'Ukrainian',
  sa: 'Saudi',
  ae: 'Emirati',
  sg: 'Singaporean',
  ar: 'Argentine',
  gr: 'Greek',
};

export function resolveRegion(lat: number, lng: number, country: string): string | null {
  const countryRegions = ADMIN_REGIONS.filter(r => r.country === country);
  if (countryRegions.length === 0) return null;

  let nearest = countryRegions[0];
  let minDist = Number.MAX_VALUE;

  for (const region of countryRegions) {
    const dLat = lat - region.lat;
    const dLng = lng - region.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }

  return nearest.name;
}

export function analyzeGeographicGap(cluster: StoryCluster): GeographicGapResult {
  if (cluster.articles.length < 3) return NO_GAP;

  const countryGroups = new Map<string, typeof cluster.articles>();
  for (const article of cluster.articles) {
    if (!article.country) continue;
    const country = article.country.toLowerCase();
    if (!countryGroups.has(country)) countryGroups.set(country, []);
    countryGroups.get(country)!.push(article);
  }

  const articlesWithCountry = Array.from(countryGroups.values()).reduce((sum, g) => sum + g.length, 0);
  if (articlesWithCountry < 2) return NO_GAP;

  const coveredCountries = Array.from(countryGroups.keys());

  let countryGapLabel = '';
  let countryGapFired = false;

  if (coveredCountries.length === 1) {
    const country = coveredCountries[0];
    const demonym = COUNTRY_DEMONYMS[country] || country.toUpperCase();
    countryGapLabel = `Only covered by ${demonym} media`;
    countryGapFired = true;
  }

  const regionalBreakdown: RegionalGap[] = [];

  if (cluster.heatLevel >= 50) {
    for (const [country, articles] of countryGroups) {
      const withCoords = articles.filter(a => a.coordinates);
      if (withCoords.length < 2) continue;

      const countryRegions = ADMIN_REGIONS.filter(r => r.country === country);
      if (countryRegions.length === 0) continue;

      const coveredRegionSet = new Set<string>();
      for (const article of withCoords) {
        const region = resolveRegion(article.coordinates!.lat, article.coordinates!.lng, country);
        if (region) coveredRegionSet.add(region);
      }

      const majorRegions = countryRegions.filter(r => r.major);
      const missingRegions = majorRegions
        .filter(r => !coveredRegionSet.has(r.name))
        .map(r => r.name);

      if (missingRegions.length > 0) {
        const coveredRegions = Array.from(coveredRegionSet);
        regionalBreakdown.push({
          country,
          coveredRegions,
          missingRegions,
          regionGapLabel: `Not covered in ${missingRegions.join(', ')}`,
        });
      }
    }
  }

  const regionalGapFired = regionalBreakdown.length > 0;
  const hasGeoGap = countryGapFired || regionalGapFired;

  return {
    hasGeoGap,
    coveredCountries,
    countryGapLabel,
    regionalBreakdown,
  };
}
