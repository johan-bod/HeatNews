// src/utils/geoInference.ts
import nlp from 'compromise';
import type { NewsArticle } from '@/types/news';
import { MEDIA_OUTLETS } from '@/data/media-outlets';

// --- Types ---

export interface PlaceCandidate {
  name: string;
  source: 'dateline' | 'nlp';
  fromTitle: boolean;
}

export interface GazetteerEntry {
  name: string;
  lat: number;
  lng: number;
  country: string;
  pop: number;
}

// --- Dateline regex ---
// Matches: "PARIS —", "LONDON (Reuters) —", "TOKYO, March 13 —", "BERLIN – "
// Captures the city name (group 1). Language-agnostic (punctuation-based).
const DATELINE_RE = /^([A-Z][A-Za-zÀ-ÿ\s-]+?)(?:\s*[\(,].*?)?\s*[—–\-]\s/;

// --- Place extraction ---

export function extractPlaceEntities(title: string, description?: string): PlaceCandidate[] {
  const candidates: PlaceCandidate[] = [];
  const seen = new Set<string>();

  // 1. Dateline detection on title
  const titleDateline = DATELINE_RE.exec(title);
  if (titleDateline) {
    const name = titleDateline[1].trim();
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      candidates.push({ name, source: 'dateline', fromTitle: true });
      seen.add(key);
    }
  }

  // 2. Dateline detection on description
  if (description) {
    const descDateline = DATELINE_RE.exec(description);
    if (descDateline) {
      const name = descDateline[1].trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        candidates.push({ name, source: 'dateline', fromTitle: false });
        seen.add(key);
      }
    }
  }

  // 3. NLP extraction on title
  const titlePlaces: string[] = nlp(title).places().out('array');
  for (const place of titlePlaces) {
    const key = place.toLowerCase().trim();
    if (!seen.has(key)) {
      candidates.push({ name: place.trim(), source: 'nlp', fromTitle: true });
      seen.add(key);
    }
  }

  // 4. NLP extraction on description
  if (description) {
    const descPlaces: string[] = nlp(description).places().out('array');
    for (const place of descPlaces) {
      const key = place.toLowerCase().trim();
      if (!seen.has(key)) {
        candidates.push({ name: place.trim(), source: 'nlp', fromTitle: false });
        seen.add(key);
      }
    }
  }

  return candidates;
}

// --- Gazetteer ---

/**
 * Normalize a name for gazetteer lookup.
 * Lowercase, ASCII-fold (remove diacritics), trim.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

let gazetteer: Map<string, GazetteerEntry[]> | null = null;

/**
 * Load the core gazetteer from public/data/ via fetch.
 * Returns the cached Map if already loaded.
 */
export async function loadCoreGazetteer(): Promise<Map<string, GazetteerEntry[]>> {
  if (gazetteer) return gazetteer;

  try {
    const response = await fetch('/data/gazetteer-core.json');
    if (!response.ok) {
      gazetteer = new Map();
      return gazetteer;
    }
    const data = (await response.json()) as Record<string, GazetteerEntry[]>;
    gazetteer = new Map(Object.entries(data));
  } catch {
    gazetteer = new Map();
  }

  return gazetteer;
}

// Eagerly start loading the core gazetteer when this module is imported.
// By the time processArticles runs (after API fetch), it should be ready.
if (typeof window !== 'undefined') {
  loadCoreGazetteer();
}

/**
 * Load the extended gazetteer (async, from public/).
 * Merges into the existing gazetteer Map.
 */
export async function loadExtendedGazetteer(): Promise<Map<string, GazetteerEntry[]>> {
  if (!gazetteer) {
    await loadCoreGazetteer();
  }
  const current = gazetteer!;

  try {
    const response = await fetch('/data/gazetteer-extended.json');
    if (!response.ok) return current;

    const data = (await response.json()) as Record<string, GazetteerEntry[]>;
    for (const [key, entries] of Object.entries(data)) {
      if (!current.has(key)) {
        current.set(key, entries);
      } else {
        const existing = current.get(key)!;
        const merged = [...existing];
        for (const entry of entries) {
          const isDuplicate = merged.some(
            e => e.name === entry.name && e.country === entry.country
          );
          if (!isDuplicate) merged.push(entry);
        }
        merged.sort((a, b) => b.pop - a.pop);
        current.set(key, merged);
      }
    }
  } catch {
    // Extended gazetteer fetch failed — continue with core only
  }

  return current;
}

/**
 * Override gazetteer for testing. Sets the gazetteer synchronously.
 */
export function setGazetteerForTesting(data: Map<string, GazetteerEntry[]>): void {
  gazetteer = data;
}

/**
 * Look up a place name in the gazetteer.
 * Returns the best match (filtered by country if provided, then highest population).
 * Requires gazetteer to be loaded first (via loadCoreGazetteer or setGazetteerForTesting).
 */
export function lookupGazetteer(name: string, countryConstraint?: string): GazetteerEntry | null {
  if (!gazetteer) return null;

  const normalized = normalize(name);
  const entries = gazetteer.get(normalized);

  if (!entries || entries.length === 0) return null;

  if (countryConstraint) {
    const countryLower = countryConstraint.toLowerCase();
    const filtered = entries.filter(e => e.country === countryLower);
    if (filtered.length > 0) return filtered[0]; // Already sorted by population
    return null; // Country constraint didn't match any entry
  }

  return entries[0]; // Highest population (pre-sorted)
}

// --- Country centroids (fallback when no city-level match) ---

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  fr: { lat: 46.2276, lng: 2.2137 },
  gb: { lat: 55.3781, lng: -3.4360 },
  us: { lat: 37.0902, lng: -95.7129 },
  de: { lat: 51.1657, lng: 10.4515 },
  es: { lat: 40.4637, lng: -3.7492 },
  it: { lat: 41.8719, lng: 12.5674 },
  br: { lat: -14.2350, lng: -51.9253 },
  cn: { lat: 35.8617, lng: 104.1954 },
  jp: { lat: 36.2048, lng: 138.2529 },
  in: { lat: 20.5937, lng: 78.9629 },
  ru: { lat: 61.5240, lng: 105.3188 },
  au: { lat: -25.2744, lng: 133.7751 },
  ca: { lat: 56.1304, lng: -106.3468 },
  mx: { lat: 23.6345, lng: -102.5528 },
  kr: { lat: 35.9078, lng: 127.7669 },
  za: { lat: -30.5595, lng: 22.9375 },
  ar: { lat: -38.4161, lng: -63.6167 },
  nl: { lat: 52.1326, lng: 5.2913 },
  be: { lat: 50.5039, lng: 4.4699 },
  ch: { lat: 46.8182, lng: 8.2275 },
  at: { lat: 47.5162, lng: 14.5501 },
  se: { lat: 60.1282, lng: 18.6435 },
  no: { lat: 60.4720, lng: 8.4689 },
  dk: { lat: 56.2639, lng: 9.5018 },
  fi: { lat: 61.9241, lng: 25.7482 },
  pl: { lat: 51.9194, lng: 19.1451 },
  pt: { lat: 39.3999, lng: -8.2245 },
  ie: { lat: 53.1424, lng: -7.6921 },
  il: { lat: 31.0461, lng: 34.8516 },
  tr: { lat: 38.9637, lng: 35.2433 },
  eg: { lat: 26.8206, lng: 30.8025 },
  ng: { lat: 9.0820, lng: 8.6753 },
  ke: { lat: -0.0236, lng: 37.9062 },
  ua: { lat: 48.3794, lng: 31.1656 },
  sa: { lat: 23.8859, lng: 45.0792 },
  ae: { lat: 23.4241, lng: 53.8478 },
  sg: { lat: 1.3521, lng: 103.8198 },
  my: { lat: 4.2105, lng: 101.9758 },
  th: { lat: 15.8700, lng: 100.9925 },
  id: { lat: -0.7893, lng: 113.9213 },
  ph: { lat: 12.8797, lng: 121.7740 },
  vn: { lat: 14.0583, lng: 108.2772 },
  co: { lat: 4.5709, lng: -74.2973 },
  cl: { lat: -35.6751, lng: -71.5430 },
  pe: { lat: -9.1900, lng: -75.0152 },
  nz: { lat: -40.9006, lng: 174.8860 },
  gr: { lat: 39.0742, lng: 21.8243 },
  cz: { lat: 49.8175, lng: 15.4730 },
  ro: { lat: 45.9432, lng: 24.9668 },
  hu: { lat: 47.1625, lng: 19.5033 },
  hr: { lat: 45.1000, lng: 15.2000 },
};

/**
 * Resolve a single article's geographic origin through the 3-layer system.
 */
function resolveArticleOrigin(article: NewsArticle): NewsArticle {
  if (article.coordinates) return article;

  const countryConstraint = article.country || undefined;
  const candidates = extractPlaceEntities(article.title, article.description);

  // Priority 1-2: Dateline candidates
  const datelineCandidates = candidates.filter(c => c.source === 'dateline');
  for (const candidate of datelineCandidates) {
    if (countryConstraint) {
      const entry = lookupGazetteer(candidate.name, countryConstraint);
      if (entry) {
        return {
          ...article,
          coordinates: { lat: entry.lat, lng: entry.lng },
          location: entry.name,
          locationConfidence: 'exact',
        };
      }
    }
    // Try without country constraint (Priority 2)
    const entryNoCountry = lookupGazetteer(candidate.name);
    if (entryNoCountry) {
      return {
        ...article,
        coordinates: { lat: entryNoCountry.lat, lng: entryNoCountry.lng },
        location: entryNoCountry.name,
        locationConfidence: countryConstraint ? 'exact' : 'inferred',
      };
    }
  }

  // Priority 3-4: NLP title candidates
  const nlpTitleCandidates = candidates.filter(c => c.source === 'nlp' && c.fromTitle);
  for (const candidate of nlpTitleCandidates) {
    const entry = lookupGazetteer(candidate.name, countryConstraint);
    if (entry) {
      return {
        ...article,
        coordinates: { lat: entry.lat, lng: entry.lng },
        location: entry.name,
        locationConfidence: 'inferred',
      };
    }
    if (countryConstraint) {
      const entryNoCountry = lookupGazetteer(candidate.name);
      if (entryNoCountry) {
        return {
          ...article,
          coordinates: { lat: entryNoCountry.lat, lng: entryNoCountry.lng },
          location: entryNoCountry.name,
          locationConfidence: 'inferred',
        };
      }
    }
  }

  // Priority 5-6: NLP description candidates
  const nlpDescCandidates = candidates.filter(c => c.source === 'nlp' && !c.fromTitle);
  for (const candidate of nlpDescCandidates) {
    const entry = lookupGazetteer(candidate.name, countryConstraint);
    if (entry) {
      return {
        ...article,
        coordinates: { lat: entry.lat, lng: entry.lng },
        location: entry.name,
        locationConfidence: 'inferred',
      };
    }
    if (countryConstraint) {
      const entryNoCountry = lookupGazetteer(candidate.name);
      if (entryNoCountry) {
        return {
          ...article,
          coordinates: { lat: entryNoCountry.lat, lng: entryNoCountry.lng },
          location: entryNoCountry.name,
          locationConfidence: 'inferred',
        };
      }
    }
  }

  // Priority 7: Outlet reach fallback
  const outlet = MEDIA_OUTLETS.find(
    o => o.domain && article.source.url?.includes(o.domain)
  );
  if (outlet && outlet.reach.length > 0) {
    const primaryReach = outlet.reach[0];
    return {
      ...article,
      coordinates: { lat: primaryReach.lat, lng: primaryReach.lng },
      location: primaryReach.name,
      locationConfidence: 'inferred',
    };
  }

  // Priority 8: Country centroid
  if (countryConstraint && COUNTRY_CENTROIDS[countryConstraint]) {
    const centroid = COUNTRY_CENTROIDS[countryConstraint];
    return {
      ...article,
      coordinates: { lat: centroid.lat, lng: centroid.lng },
      locationConfidence: 'centroid',
    };
  }

  // Priority 9: No match
  return article;
}

/**
 * Process articles missing coordinates through 3-layer inference.
 * Articles with existing coordinates are passed through unchanged.
 */
export function inferArticleOrigins(articles: NewsArticle[]): NewsArticle[] {
  return articles.map(resolveArticleOrigin);
}
