import type { NewsDataSearchParams } from './newsdata-api';
import type { UserPreferences, PreferenceLocation } from '@/types/preferences';
import { API_CATEGORY_MAP } from '@/data/keywords/taxonomy';
import type { Topic } from '@/data/keywords/taxonomy';

/**
 * Map our topic taxonomy to NewsData.io API categories.
 * Reverse of API_CATEGORY_MAP — find the API category that maps to our topic.
 */
const TOPIC_TO_API_CATEGORY: Partial<Record<Topic, string>> = {};
for (const [apiCat, topic] of Object.entries(API_CATEGORY_MAP)) {
  if (!TOPIC_TO_API_CATEGORY[topic]) {
    TOPIC_TO_API_CATEGORY[topic] = apiCat;
  }
}

/**
 * Estimate how many API requests a personalized fetch will use.
 * Spec:
 * - 1-2 topics + 1 location = 1 request
 * - 3+ topics OR 2+ locations = 2 requests
 * - 3+ topics AND 2+ locations = 3 requests (maximum)
 */
export function estimateRequestCount(topicCount: number, locationCount: number): number {
  if (topicCount === 0 && locationCount === 0) return 0;
  const manyTopics = topicCount >= 3;
  const manyLocations = locationCount >= 2;

  if (manyTopics && manyLocations) return 3;
  if (manyTopics || manyLocations) return 2;
  return 1;
}

/**
 * Guess a country code from a location key.
 */
function locationToCountry(loc: PreferenceLocation): string | null {
  const KNOWN_COUNTRIES: Record<string, string> = {
    france: 'fr', germany: 'de', spain: 'es', italy: 'it',
    'united kingdom': 'gb', japan: 'jp', china: 'cn', india: 'in',
    brazil: 'br', australia: 'au', canada: 'ca', 'united states': 'us',
    mexico: 'mx', russia: 'ru', 'south korea': 'kr', turkey: 'tr',
    netherlands: 'nl', belgium: 'be', switzerland: 'ch', portugal: 'pt',
    austria: 'at', sweden: 'se', norway: 'no', denmark: 'dk',
    poland: 'pl', greece: 'gr', ireland: 'ie',
  };
  if (KNOWN_COUNTRIES[loc.key]) return KNOWN_COUNTRIES[loc.key];

  // French cities (lat 42-51, lng -5 to 8) — rough bounding box
  if (loc.lat >= 42 && loc.lat <= 51 && loc.lng >= -5 && loc.lng <= 8) return 'fr';

  return null;
}

/**
 * Build personalized API queries from user preferences.
 */
export function buildPersonalizedQueries(prefs: UserPreferences): NewsDataSearchParams[] {
  if (prefs.topics.length === 0 && prefs.locations.length === 0) return [];

  const requestCount = estimateRequestCount(prefs.topics.length, prefs.locations.length);
  const queries: NewsDataSearchParams[] = [];

  // Map topics to API categories
  const apiCategories = prefs.topics
    .map(t => TOPIC_TO_API_CATEGORY[t])
    .filter(Boolean) as string[];

  // Map locations to countries
  const countries = prefs.locations
    .map(locationToCountry)
    .filter(Boolean) as string[];

  // Deduplicate
  const uniqueCountries = [...new Set(countries)];
  const uniqueCategories = [...new Set(apiCategories)];

  // Fallback: if no topics mapped to valid API categories, use 'top'
  const fallbackCategory: string | string[] = 'top';

  if (requestCount === 1) {
    queries.push({
      size: 10,
      category: uniqueCategories.length > 0 ? uniqueCategories.slice(0, 5) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
  } else if (requestCount === 2) {
    const midCat = Math.ceil(uniqueCategories.length / 2);
    queries.push({
      size: 10,
      category: uniqueCategories.slice(0, midCat).length > 0 ? uniqueCategories.slice(0, midCat) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
    queries.push({
      size: 10,
      category: uniqueCategories.slice(midCat).length > 0 ? uniqueCategories.slice(midCat) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
  } else {
    const midCat = Math.ceil(uniqueCategories.length / 2);
    queries.push({
      size: 10,
      category: uniqueCategories.slice(0, midCat).length > 0 ? uniqueCategories.slice(0, midCat) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
    queries.push({
      size: 10,
      category: uniqueCategories.slice(midCat).length > 0 ? uniqueCategories.slice(midCat) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
    const locationCountries = uniqueCountries.slice(0, 3);
    queries.push({
      size: 10,
      category: 'top',
      country: locationCountries.length > 0 ? locationCountries : undefined,
      language: 'en',
    });
  }

  return queries;
}
