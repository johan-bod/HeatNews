// src/utils/geoInference.ts
import nlp from 'compromise';

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
