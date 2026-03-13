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
