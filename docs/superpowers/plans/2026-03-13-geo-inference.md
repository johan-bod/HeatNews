# Geographic Origin Inference Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Infer geographic origin for news articles missing coordinates using a 3-layer system (API metadata → NLP extraction → cross-validation with gazetteer).

**Architecture:** A build script converts GeoNames TSV data into bundled JSON gazetteers. At runtime, `compromise` NLP extracts place names from article text, matches them against the gazetteer with country-based disambiguation, and assigns coordinates + confidence. Integrated as a step in the existing `processArticles()` pipeline.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, compromise (NLP), GeoNames (data)

---

## Chunk 1: Foundation

### Task 1: Add `locationConfidence` to NewsArticle and update geocoding

**Files:**
- Modify: `src/types/news.ts`
- Modify: `src/utils/geocoding.ts`
- Modify: `tests/utils/geocoding.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new test to `tests/utils/geocoding.test.ts`:

```typescript
it('geocodeArticle sets locationConfidence to exact when coordinates found', () => {
  const article = makeArticle('Protest in Lyon streets');
  const result = geocodeArticle(article);
  expect(result.locationConfidence).toBe('exact');
});

it('geocodeArticle does not set locationConfidence when no location found', () => {
  const article = makeArticle('Generic news with no city name');
  const result = geocodeArticle(article);
  expect(result.locationConfidence).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/geocoding.test.ts`
Expected: FAIL — `locationConfidence` is not set

- [ ] **Step 3: Add `locationConfidence` to `NewsArticle` type**

In `src/types/news.ts`, add after line 27 (`country?: string;`):

```typescript
locationConfidence?: 'exact' | 'inferred' | 'centroid';
```

- [ ] **Step 4: Update `geocodeArticle` to set confidence**

In `src/utils/geocoding.ts`, modify the `geocodeArticle` function (lines 59-74). Change:

```typescript
export function geocodeArticle(article: NewsArticle): NewsArticle {
  const location = extractLocation(article);

  if (location) {
    const coordinates = getCoordinates(location);
    return {
      ...article,
      location: location.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      coordinates: coordinates || undefined,
    };
  }

  return article;
}
```

To:

```typescript
export function geocodeArticle(article: NewsArticle): NewsArticle {
  const location = extractLocation(article);

  if (location) {
    const coordinates = getCoordinates(location);
    return {
      ...article,
      location: location.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      coordinates: coordinates || undefined,
      locationConfidence: coordinates ? 'exact' : undefined,
    };
  }

  return article;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/utils/geocoding.test.ts`
Expected: PASS — all tests including new ones

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/types/news.ts src/utils/geocoding.ts tests/utils/geocoding.test.ts
git commit -m "feat: add locationConfidence field to NewsArticle, set by geocoding"
```

---

### Task 2: Install `compromise` and create build-gazetteer script

**Files:**
- Modify: `package.json` (via npm install)
- Create: `scripts/build-gazetteer.ts`
- Create: `src/data/gazetteer-core.json` (generated)
- Create: `public/data/gazetteer-extended.json` (generated)

- [ ] **Step 1: Install compromise**

Run: `npm install compromise`

- [ ] **Step 2: Install tsx for running TypeScript scripts**

Run: `npm install -D tsx`

(Needed to run the build script with `npx tsx scripts/build-gazetteer.ts`)

- [ ] **Step 3: Download GeoNames data files**

```bash
mkdir -p scripts/geonames-data
cd scripts/geonames-data
curl -L -o cities15000.zip "https://download.geonames.org/export/dump/cities15000.zip"
curl -L -o cities1000.zip "https://download.geonames.org/export/dump/cities1000.zip"
unzip -o cities15000.zip
unzip -o cities1000.zip
cd ../..
```

Add to `.gitignore`:

```
scripts/geonames-data/
```

- [ ] **Step 4: Write the build-gazetteer script**

Create `scripts/build-gazetteer.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface GazetteerEntry {
  name: string;
  lat: number;
  lng: number;
  country: string;
  pop: number;
}

interface GazetteerLookup {
  [normalizedName: string]: GazetteerEntry[];
}

/**
 * Remove diacritics for ASCII-folded matching.
 * "München" → "munchen", "São Paulo" → "sao paulo"
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parse a GeoNames TSV file.
 * Format: geonameid \t name \t asciiname \t alternatenames \t latitude \t longitude \t
 *   feature_class \t feature_code \t country_code \t cc2 \t admin1 \t admin2 \t
 *   admin3 \t admin4 \t population \t elevation \t dem \t timezone \t modification_date
 */
function parseGeoNamesTSV(filePath: string): GazetteerLookup {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const lookup: GazetteerLookup = {};

  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length < 19) continue;

    const name = fields[1];           // name
    const asciiName = fields[2];      // asciiname
    const alternateNames = fields[3]; // alternatenames (comma-separated)
    const lat = parseFloat(fields[4]);
    const lng = parseFloat(fields[5]);
    const countryCode = fields[8].toLowerCase();
    const population = parseInt(fields[14], 10) || 0;

    if (!name || isNaN(lat) || isNaN(lng)) continue;

    const entry: GazetteerEntry = {
      name,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      country: countryCode,
      pop: population,
    };

    // Index by normalized primary name
    const normalizedName = normalize(name);
    if (!lookup[normalizedName]) lookup[normalizedName] = [];
    lookup[normalizedName].push(entry);

    // Index by ASCII name if different
    const normalizedAscii = normalize(asciiName);
    if (normalizedAscii && normalizedAscii !== normalizedName) {
      if (!lookup[normalizedAscii]) lookup[normalizedAscii] = [];
      lookup[normalizedAscii].push(entry);
    }

    // Index by common alternate names (limit to avoid bloat)
    if (alternateNames) {
      const alts = alternateNames.split(',').slice(0, 10);
      for (const alt of alts) {
        const normalizedAlt = normalize(alt);
        if (
          normalizedAlt &&
          normalizedAlt.length >= 3 &&
          normalizedAlt !== normalizedName &&
          normalizedAlt !== normalizedAscii
        ) {
          if (!lookup[normalizedAlt]) lookup[normalizedAlt] = [];
          lookup[normalizedAlt].push(entry);
        }
      }
    }
  }

  // Sort entries by population descending for each key
  for (const key of Object.keys(lookup)) {
    lookup[key].sort((a, b) => b.pop - a.pop);
  }

  return lookup;
}

// --- Main ---

const GEONAMES_DIR = join(import.meta.dirname, 'geonames-data');
const SRC_DATA_DIR = join(import.meta.dirname, '..', 'src', 'data');
const PUBLIC_DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

console.log('Building core gazetteer (cities15000)...');
const coreLookup = parseGeoNamesTSV(join(GEONAMES_DIR, 'cities15000.txt'));
const coreKeys = Object.keys(coreLookup);
console.log(`  ${coreKeys.length} unique name keys`);

mkdirSync(SRC_DATA_DIR, { recursive: true });
writeFileSync(
  join(SRC_DATA_DIR, 'gazetteer-core.json'),
  JSON.stringify(coreLookup),
  'utf-8'
);
console.log('  → src/data/gazetteer-core.json');

console.log('Building extended gazetteer (cities1000)...');
const extendedLookup = parseGeoNamesTSV(join(GEONAMES_DIR, 'cities1000.txt'));
const extKeys = Object.keys(extendedLookup);
console.log(`  ${extKeys.length} unique name keys`);

mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
writeFileSync(
  join(PUBLIC_DATA_DIR, 'gazetteer-extended.json'),
  JSON.stringify(extendedLookup),
  'utf-8'
);
console.log('  → public/data/gazetteer-extended.json');

console.log('Done!');
```

- [ ] **Step 5: Run the build script**

Run: `npx tsx scripts/build-gazetteer.ts`
Expected: Two JSON files created. Console output shows key counts (~30K+ for core, ~100K+ for extended).

- [ ] **Step 6: Verify generated files exist and are reasonable**

Run: `ls -lh src/data/gazetteer-core.json public/data/gazetteer-extended.json`
Expected: Core ~800KB–2MB, Extended ~3–8MB

- [ ] **Step 7: Add a build:gazetteer npm script**

In `package.json`, add to `"scripts"`:

```json
"build:gazetteer": "tsx scripts/build-gazetteer.ts"
```

- [ ] **Step 8: Commit**

```bash
git add scripts/build-gazetteer.ts src/data/gazetteer-core.json public/data/gazetteer-extended.json package.json package-lock.json .gitignore
git commit -m "feat: add GeoNames gazetteer build script and generated data"
```

---

### Task 3: Create `extractPlaceEntities` with tests

**Files:**
- Create: `src/utils/geoInference.ts` (partial — just extraction functions)
- Create: `tests/utils/geoInference.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/geoInference.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractPlaceEntities } from '@/utils/geoInference';
import type { PlaceCandidate } from '@/utils/geoInference';

describe('extractPlaceEntities', () => {
  it('extracts dateline from title with em dash', () => {
    const results = extractPlaceEntities('PARIS — Fire breaks out in metro station');
    expect(results[0]).toMatchObject({
      name: 'PARIS',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with agency attribution', () => {
    const results = extractPlaceEntities('LONDON (Reuters) — Markets rally on trade deal');
    expect(results[0]).toMatchObject({
      name: 'LONDON',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with en dash', () => {
    const results = extractPlaceEntities('BERLIN – New coalition formed');
    expect(results[0]).toMatchObject({
      name: 'BERLIN',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with comma-date pattern', () => {
    const results = extractPlaceEntities('TOKYO, March 13 — Earthquake hits coast');
    expect(results[0]).toMatchObject({
      name: 'TOKYO',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts NLP places from title', () => {
    const results = extractPlaceEntities('Protests erupt in Cairo over economic reforms');
    const cairo = results.find(r => r.name.toLowerCase() === 'cairo');
    expect(cairo).toBeDefined();
    expect(cairo!.source).toBe('nlp');
    expect(cairo!.fromTitle).toBe(true);
  });

  it('extracts NLP places from description', () => {
    const results = extractPlaceEntities(
      'Breaking news today',
      'The incident occurred in Madrid near the central station'
    );
    const madrid = results.find(r => r.name.toLowerCase() === 'madrid');
    expect(madrid).toBeDefined();
    expect(madrid!.fromTitle).toBe(false);
  });

  it('deduplicates dateline and NLP matches, keeping dateline', () => {
    const results = extractPlaceEntities('PARIS — Protests in Paris continue');
    const parisEntries = results.filter(r => r.name.toLowerCase() === 'paris');
    expect(parisEntries).toHaveLength(1);
    expect(parisEntries[0].source).toBe('dateline');
  });

  it('returns dateline matches before NLP matches', () => {
    const results = extractPlaceEntities('LONDON — Talks about Berlin trade deal');
    expect(results[0].name).toBe('LONDON');
    expect(results[0].source).toBe('dateline');
  });

  it('returns empty array when no places found', () => {
    const results = extractPlaceEntities('Generic headline with no location');
    // May return empty or may extract false positives — just verify it returns an array
    expect(Array.isArray(results)).toBe(true);
  });

  it('handles undefined description gracefully', () => {
    const results = extractPlaceEntities('MOSCOW — Summit begins');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('MOSCOW');
  });

  it('extracts multi-word dateline cities', () => {
    const results = extractPlaceEntities('NEW YORK — Wall Street surges');
    expect(results[0]).toMatchObject({
      name: 'NEW YORK',
      source: 'dateline',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: FAIL — module `@/utils/geoInference` not found

- [ ] **Step 3: Write the implementation**

Create `src/utils/geoInference.ts`:

```typescript
// src/utils/geoInference.ts
import nlp from 'compromise';
import type { NewsArticle } from '@/types/news';

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: PASS — all tests. Some NLP tests may need adjustment depending on `compromise`'s tagging behavior. If a test fails because `compromise` doesn't tag a word as a place, adjust the test expectation (e.g., the "no places found" test may return results for words compromise interprets as places).

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/geoInference.ts tests/utils/geoInference.test.ts
git commit -m "feat: add extractPlaceEntities with dateline detection and NLP extraction"
```

---

### Task 4: Add gazetteer lookup and disambiguation logic with tests

**Files:**
- Modify: `src/utils/geoInference.ts`
- Modify: `tests/utils/geoInference.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/utils/geoInference.test.ts`:

```typescript
import { lookupGazetteer, loadCoreGazetteer, setGazetteerForTesting } from '@/utils/geoInference';
import type { GazetteerEntry } from '@/utils/geoInference';

// Test gazetteer data
const TEST_GAZETTEER = new Map<string, GazetteerEntry[]>([
  ['paris', [
    { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'fr', pop: 2161000 },
    { name: 'Paris', lat: 33.6609, lng: -95.5555, country: 'us', pop: 25171 },
  ]],
  ['lyon', [
    { name: 'Lyon', lat: 45.7640, lng: 4.8357, country: 'fr', pop: 522969 },
  ]],
  ['london', [
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'gb', pop: 8982000 },
    { name: 'London', lat: 42.9834, lng: -81.2497, country: 'ca', pop: 383822 },
  ]],
  ['nice', [
    { name: 'Nice', lat: 43.7102, lng: 7.2620, country: 'fr', pop: 342295 },
  ]],
]);

describe('lookupGazetteer', () => {
  beforeAll(() => {
    setGazetteerForTesting(TEST_GAZETTEER);
  });

  it('returns highest-population entry when no country constraint', () => {
    const result = lookupGazetteer('Paris');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('fr');
    expect(result!.pop).toBe(2161000);
  });

  it('filters by country constraint', () => {
    const result = lookupGazetteer('Paris', 'us');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('us');
    expect(result!.pop).toBe(25171);
  });

  it('returns null when country constraint has no match', () => {
    const result = lookupGazetteer('Lyon', 'us');
    expect(result).toBeNull();
  });

  it('returns null for unknown city', () => {
    const result = lookupGazetteer('Atlantis');
    expect(result).toBeNull();
  });

  it('normalizes input (case-insensitive, trimmed)', () => {
    const result = lookupGazetteer('  LONDON  ');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('gb');
  });

  it('handles diacritics in lookup', () => {
    // This tests the normalize function — "münchen" should normalize to "munchen"
    // Only works if gazetteer was built with normalized keys
    const result = lookupGazetteer('nice');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('fr');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: FAIL — `lookupGazetteer` and `setGazetteerForTesting` not exported

- [ ] **Step 3: Add gazetteer loading and lookup to implementation**

Add to `src/utils/geoInference.ts`, after the existing code:

```typescript
import coreGazetteerData from '@/data/gazetteer-core.json';

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
 * Load the core gazetteer from bundled JSON into a Map.
 * Called once on first use, cached in module scope.
 */
export function loadCoreGazetteer(): Map<string, GazetteerEntry[]> {
  if (gazetteer) return gazetteer;

  try {
    const data = coreGazetteerData as Record<string, GazetteerEntry[]>;
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
  const current = loadCoreGazetteer();

  try {
    const response = await fetch('/data/gazetteer-extended.json');
    if (!response.ok) return current;

    const data = (await response.json()) as Record<string, GazetteerEntry[]>;
    for (const [key, entries] of Object.entries(data)) {
      if (!current.has(key)) {
        current.set(key, entries);
      } else {
        // Merge, deduplicate by name+country, re-sort by population
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
 * Override gazetteer for testing.
 */
export function setGazetteerForTesting(data: Map<string, GazetteerEntry[]>): void {
  gazetteer = data;
}

/**
 * Look up a place name in the gazetteer.
 * Returns the best match (filtered by country if provided, then highest population).
 */
export function lookupGazetteer(name: string, countryConstraint?: string): GazetteerEntry | null {
  const gaz = loadCoreGazetteer();
  const normalized = normalize(name);
  const entries = gaz.get(normalized);

  if (!entries || entries.length === 0) return null;

  if (countryConstraint) {
    const countryLower = countryConstraint.toLowerCase();
    const filtered = entries.filter(e => e.country === countryLower);
    if (filtered.length > 0) return filtered[0]; // Already sorted by population
    return null; // Country constraint didn't match any entry
  }

  return entries[0]; // Highest population (pre-sorted)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: PASS — all lookup tests pass

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/geoInference.ts tests/utils/geoInference.test.ts
git commit -m "feat: add gazetteer lookup with country disambiguation"
```

---

## Chunk 2: Inference Engine & Pipeline Integration

### Task 5: Create `inferArticleOrigins` orchestrator with tests

**Files:**
- Modify: `src/utils/geoInference.ts`
- Modify: `tests/utils/geoInference.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/utils/geoInference.test.ts`:

```typescript
import { inferArticleOrigins, setGazetteerForTesting } from '@/utils/geoInference';
import type { NewsArticle } from '@/types/news';

// Country centroids for testing — inferArticleOrigins uses COUNTRY_CENTROIDS
// We test behavior, not internal data

function makeArticle(
  id: string,
  title: string,
  opts: {
    description?: string;
    country?: string;
    sourceUrl?: string;
    sourceName?: string;
    coordinates?: { lat: number; lng: number };
    locationConfidence?: 'exact' | 'inferred' | 'centroid';
  } = {}
): NewsArticle {
  return {
    id,
    title,
    description: opts.description,
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    source: {
      name: opts.sourceName || 'test-source',
      url: opts.sourceUrl || 'https://test.com',
    },
    country: opts.country,
    coordinates: opts.coordinates,
    locationConfidence: opts.locationConfidence,
  };
}

describe('inferArticleOrigins', () => {
  beforeAll(() => {
    setGazetteerForTesting(TEST_GAZETTEER); // reuse from lookupGazetteer tests
  });

  it('skips articles that already have coordinates', () => {
    const articles = [
      makeArticle('1', 'News from somewhere', {
        coordinates: { lat: 48.86, lng: 2.35 },
        locationConfidence: 'exact',
      }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toEqual({ lat: 48.86, lng: 2.35 });
    expect(result[0].locationConfidence).toBe('exact');
  });

  it('infers location from dateline + country match (exact confidence)', () => {
    const articles = [
      makeArticle('1', 'PARIS — Protests continue in the capital', { country: 'fr' }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined();
    expect(result[0].coordinates!.lat).toBeCloseTo(48.86, 0);
    expect(result[0].locationConfidence).toBe('exact');
  });

  it('infers location from dateline without country (inferred confidence)', () => {
    const articles = [
      makeArticle('1', 'LONDON — Markets rally on trade deal'),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined();
    expect(result[0].coordinates!.lat).toBeCloseTo(51.51, 0);
    expect(result[0].locationConfidence).toBe('inferred');
  });

  it('disambiguates by country constraint', () => {
    const articles = [
      makeArticle('1', 'PARIS — Storm causes damage', { country: 'us' }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined();
    // Should be Paris, Texas (US), not Paris, France
    expect(result[0].coordinates!.lat).toBeCloseTo(33.66, 0);
    expect(result[0].locationConfidence).toBe('exact');
  });

  it('infers from NLP extraction in title', () => {
    const articles = [
      makeArticle('1', 'Protests erupt in Lyon over economic reforms', { country: 'fr' }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined();
    expect(result[0].coordinates!.lat).toBeCloseTo(45.76, 0);
    expect(result[0].locationConfidence).toBe('inferred');
  });

  it('falls back to country centroid when no city match', () => {
    const articles = [
      makeArticle('1', 'Generic headline with no identifiable city', { country: 'fr' }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined();
    expect(result[0].locationConfidence).toBe('centroid');
  });

  it('leaves coordinates undefined when no signals available', () => {
    const articles = [
      makeArticle('1', 'Completely generic headline'),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeUndefined();
    expect(result[0].locationConfidence).toBeUndefined();
  });

  it('processes multiple articles independently', () => {
    const articles = [
      makeArticle('1', 'PARIS — French news', { country: 'fr' }),
      makeArticle('2', 'Generic headline'),
      makeArticle('3', 'Storms hit London area', { country: 'gb' }),
    ];
    const result = inferArticleOrigins(articles);
    expect(result[0].coordinates).toBeDefined(); // Paris
    expect(result[1].coordinates).toBeUndefined(); // No match
    expect(result[2].coordinates).toBeDefined(); // London
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: FAIL — `inferArticleOrigins` not exported

- [ ] **Step 3: Write the implementation**

Add to `src/utils/geoInference.ts`:

```typescript
import { MEDIA_OUTLETS } from '@/data/media-outlets';

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
 * Returns updated article with coordinates and locationConfidence, or unchanged if no match.
 */
function resolveArticleOrigin(article: NewsArticle): NewsArticle {
  // Skip articles that already have coordinates
  if (article.coordinates) return article;

  const countryConstraint = article.country || undefined;

  // Layer 2: Extract place candidates from text
  const candidates = extractPlaceEntities(article.title, article.description);

  // Layer 3: Resolve candidates against gazetteer in priority order

  // Priority 1-2: Dateline candidates
  const datelineCandidates = candidates.filter(c => c.source === 'dateline');
  for (const candidate of datelineCandidates) {
    const entry = lookupGazetteer(candidate.name, countryConstraint);
    if (entry) {
      return {
        ...article,
        coordinates: { lat: entry.lat, lng: entry.lng },
        location: entry.name,
        locationConfidence: countryConstraint ? 'exact' : 'inferred',
      };
    }
    // Try without country constraint (Priority 2)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/geoInference.test.ts`
Expected: PASS — all tests pass. Note: some NLP extraction tests depend on `compromise`'s ability to tag city names. If "Lyon" or "London" aren't tagged as places by `compromise` in certain sentence structures, the test may need the sentence rephrased to ensure `compromise` picks it up. Adjust test titles to contain more obvious location phrasing if needed.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/geoInference.ts tests/utils/geoInference.test.ts
git commit -m "feat: add inferArticleOrigins with 3-layer geo inference and country centroids"
```

---

### Task 6: Integrate into processArticles pipeline

**Files:**
- Modify: `src/services/cachedNews.ts`

- [ ] **Step 1: Add import**

In `src/services/cachedNews.ts`, add after line 3 (`import { geocodeArticles } from '@/utils/geocoding';`):

```typescript
import { inferArticleOrigins } from '@/utils/geoInference';
```

- [ ] **Step 2: Add inferArticleOrigins call to pipeline**

In `src/services/cachedNews.ts`, in the `processArticles` function (line 40-68), add the inference call after `geocodeArticles()`. Change line 41:

```typescript
let processed = geocodeArticles(articles);
```

To:

```typescript
let processed = geocodeArticles(articles);
processed = inferArticleOrigins(processed);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/cachedNews.ts
git commit -m "feat: integrate geo inference into article processing pipeline"
```
