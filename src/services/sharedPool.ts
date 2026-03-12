import type { NewsDataSearchParams } from './newsdata-api';

type ArticleScale = 'local' | 'regional' | 'national' | 'international';

export interface QueryGroup {
  name: string;
  countries: string | string[];
  language: string | string[];
  query?: string;
  category?: string | string[];
}

export interface SharedPoolQuery {
  scale: ArticleScale;
  group: string;
  params: NewsDataSearchParams;
}

// Spec: 4 French city groups × 2 queries = 8
export const LOCAL_QUERY_GROUPS: QueryGroup[] = [
  { name: 'Paris/Lyon/Marseille', countries: 'fr', language: 'fr', query: 'Paris OR Lyon OR Marseille' },
  { name: 'Toulouse/Nice/Bordeaux', countries: 'fr', language: 'fr', query: 'Toulouse OR Nice OR Bordeaux' },
  { name: 'Lille/Strasbourg/Nantes', countries: 'fr', language: 'fr', query: 'Lille OR Strasbourg OR Nantes' },
  { name: 'Rennes/Montpellier/Grenoble', countries: 'fr', language: 'fr', query: 'Rennes OR Montpellier OR Grenoble' },
];

// Spec: 3 French region groups × 2 = 6
export const REGIONAL_QUERY_GROUPS: QueryGroup[] = [
  { name: 'Bretagne/Normandie/PdlL', countries: 'fr', language: 'fr', query: 'Bretagne OR Normandie OR "Pays de la Loire"' },
  { name: 'Provence/Occitanie/ARA', countries: 'fr', language: 'fr', query: 'Provence OR Occitanie OR "Auvergne-Rhône-Alpes"' },
  { name: 'IDF/HdF/GrandEst', countries: 'fr', language: 'fr', query: '"Île-de-France" OR "Hauts-de-France" OR "Grand Est"' },
];

// Spec: 6 European country groups × 2 = 12
export const NATIONAL_QUERY_GROUPS: QueryGroup[] = [
  { name: 'FR+DE', countries: ['fr', 'de'], language: ['fr', 'de', 'en'] },
  { name: 'GB+IE', countries: ['gb', 'ie'], language: 'en' },
  { name: 'ES+PT', countries: ['es', 'pt'], language: ['es', 'pt', 'en'] },
  { name: 'IT+CH', countries: ['it', 'ch'], language: ['it', 'en'] },
  { name: 'NL+BE', countries: ['nl', 'be'], language: ['nl', 'en'] },
  { name: 'PL+SE+NO+DK', countries: ['pl', 'se', 'no', 'dk'], language: 'en' },
];

// Spec: 7 international groups × 2 = 14
export const INTERNATIONAL_QUERY_GROUPS: QueryGroup[] = [
  { name: 'US+CA', countries: ['us', 'ca'], language: 'en' },
  { name: 'LatAm', countries: ['br', 'mx', 'ar', 'co'], language: ['es', 'pt', 'en'] },
  { name: 'Middle East', countries: ['ae', 'sa', 'il', 'eg'], language: ['ar', 'en'] },
  { name: 'East Asia', countries: ['jp', 'kr', 'cn'], language: 'en' },
  { name: 'South Asia', countries: ['in', 'pk', 'bd'], language: 'en' },
  { name: 'Africa', countries: ['za', 'ng', 'ke'], language: 'en' },
  { name: 'Oceania', countries: ['au', 'nz'], language: 'en' },
];

const ROTATING_CATEGORIES = [
  'politics', 'business', 'technology', 'science',
  'health', 'sports', 'entertainment',
];

export function getRotatingCategory(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return ROTATING_CATEGORIES[dayOfYear % ROTATING_CATEGORIES.length];
}

export function buildSharedPoolQueries(): SharedPoolQuery[] {
  const rotatingCategory = getRotatingCategory();
  const queries: SharedPoolQuery[] = [];

  function addGroup(groups: QueryGroup[], scale: ArticleScale) {
    for (const group of groups) {
      const baseParams: NewsDataSearchParams = {
        country: group.countries,
        language: group.language,
        size: 10,
      };
      if (group.query) baseParams.query = group.query;

      queries.push({
        scale,
        group: group.name,
        params: { ...baseParams, category: 'top' },
      });

      queries.push({
        scale,
        group: group.name,
        params: { ...baseParams, category: rotatingCategory },
      });
    }
  }

  addGroup(LOCAL_QUERY_GROUPS, 'local');
  addGroup(REGIONAL_QUERY_GROUPS, 'regional');
  addGroup(NATIONAL_QUERY_GROUPS, 'national');
  addGroup(INTERNATIONAL_QUERY_GROUPS, 'international');

  return queries;
}
