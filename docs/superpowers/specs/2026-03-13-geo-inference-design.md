# Workstream 6: Geographic Origin Inference

## Goal

Infer geographic origin for news articles that lack coordinates after the existing dictionary-based geocoding pass. Uses a 3-layer confidence system (API metadata → NLP entity extraction → cross-validation) to assign coordinates to articles, enabling richer globe visualization and future geographic gap detection.

## Architecture

A new `inferArticleOrigins()` step inserted into the existing `processArticles()` pipeline in `cachedNews.ts`, between `geocodeArticles()` and the `.map()` loop that runs `indexArticleTopics()`. Only processes articles where `coordinates` is still undefined. Uses the `compromise` NLP library for place-name entity extraction and a pre-built GeoNames gazetteer for coordinate lookup.

---

## 1. Three-Layer Inference System

### Layer 1: API Metadata (zero-cost)

Extract geographic signals already available in the data:

- **Country field:** `convertNewsDataArticle()` in `newsdata-api.ts` already resolves a single country string via outlet lookup first, then API `country[0]` fallback. The resolved `country?: string` (lowercase ISO 2-letter code) is already on `NewsArticle`. No changes needed — Layer 1 reads the existing `article.country` field.
- **Outlet reach:** The media outlet registry (`src/data/media-outlets.ts`) has `reach: GeoReach[]` arrays per outlet, indicating the outlet's primary coverage area. Looked up via `MEDIA_OUTLETS.find(o => o.domain && article.source.url?.includes(o.domain))`.

These provide a country-level constraint for disambiguation.

### Layer 2: NLP Entity Extraction

Use the `compromise` library (~200KB, client-side, no dependencies) to extract place-name entities from article text.

**Function signature:**

```typescript
function extractPlaceEntities(title: string, description?: string): PlaceCandidate[]

interface PlaceCandidate {
  name: string;       // raw extracted name
  source: 'dateline' | 'nlp';
  fromTitle: boolean; // true if found in title
}
```

**Extraction steps:**

1. **Dateline detection** — regex `^([A-Z][A-Za-zÀ-ÿ\s-]+?)(?:\s*[\(,].*?)?\s*[—–\-]\s` applied to the start of title and description. Captures city name from news datelines like `"PARIS —"`, `"LONDON (Reuters) —"`, `"BERLIN, March 13 —"`. This pattern is language-agnostic (works on punctuation structure, not language). Dateline matches are returned with `source: 'dateline'`.
2. **NLP extraction** — `compromise(text).places().out('array')` on the concatenated title + description. Tags words as `#Place`, which catches city/country/region names. Returns with `source: 'nlp'`.
3. **Deduplication** — by normalized name (lowercase, trimmed). If the same name appears as both dateline and NLP, keep the dateline entry (higher priority).
4. **Ordering** — dateline matches first, then title matches, then description matches.

**Language handling:** `compromise` works best with English but recognizes proper nouns (capitalized city names) across Latin-script languages. For non-Latin scripts, the dateline detector still works since dateline formatting is universal in wire services.

### Layer 3: Cross-Validation & Disambiguation

Takes `PlaceCandidate[]` from Layer 2 and `country?: string` from Layer 1. Resolves to a single `GazetteerEntry` or null.

**Priority order (first match wins):**

1. **Dateline + country match** — dateline candidate found in gazetteer, filtered by country constraint. → `locationConfidence: 'exact'`
2. **Dateline, no country match** — dateline candidate found in gazetteer, use highest-population entry. → `locationConfidence: 'inferred'`
3. **NLP title match + country** — NLP candidate from title, found in gazetteer, filtered by country. → `locationConfidence: 'inferred'`
4. **NLP title match, no country** — NLP candidate from title, highest-population gazetteer entry. → `locationConfidence: 'inferred'`
5. **NLP description match + country** — same logic for description candidates. → `locationConfidence: 'inferred'`
6. **NLP description match, no country** — highest-population gazetteer entry. → `locationConfidence: 'inferred'`
7. **Outlet reach fallback** — no NLP matches; use the outlet's primary `reach` location coordinates. → `locationConfidence: 'inferred'`
8. **Country centroid** — no city match; use centroid coordinates for `article.country`. → `locationConfidence: 'centroid'`
9. **No match** — coordinates remain undefined, `locationConfidence` remains undefined.

**Country filtering:** When a gazetteer lookup returns multiple entries for the same name (e.g., "paris" → FR and US entries), and a country constraint exists, keep only entries matching the constraint. All country codes are normalized to lowercase ISO 2-letter format before comparison.

**Population tiebreaker:** When multiple gazetteer entries remain after country filtering (or no country constraint exists), use the entry with the highest population.

---

## 2. Gazetteer

### Data Source

GeoNames open database (CC-BY license). Two tiers:

- **Core:** `cities15000` — ~25K cities with population > 15,000 (~800KB as JSON). Bundled with the app, always available.
- **Extended:** `cities1000` — ~150K cities with population > 1,000 (~3-5MB as JSON). Lazy-loaded via `fetch()` when user selects local/regional scale.

### Build-Time Processing

A build script (`scripts/build-gazetteer.ts`) converts GeoNames TSV files into optimized JSON:

```typescript
interface GazetteerEntry {
  name: string;        // display name
  lat: number;
  lng: number;
  country: string;     // ISO 2-letter code, lowercase
  pop: number;         // population (for disambiguation)
}
```

The script:
1. Reads GeoNames TSV (`cities15000.txt`, `cities1000.txt`)
2. Extracts: name, alternate names, latitude, longitude, country code, population
3. Builds a lookup keyed by normalized name (lowercase, ASCII-folded)
4. Includes common alternate names (e.g., "münchen" → Munich entry, "londres" → London entry) for multilingual support
5. Outputs two JSON files

### Generated Files

- `src/data/gazetteer-core.json` — cities15000, bundled (imported directly)
- `public/data/gazetteer-extended.json` — cities1000, lazy-loaded at runtime

### Lookup Structure

At runtime, the gazetteer is loaded into a `Map<string, GazetteerEntry[]>` keyed by normalized name. Multiple entries per name handle disambiguation (e.g., "paris" → [{country: "fr", pop: 2161000}, {country: "us", pop: 25171}]).

Lookup is exact match on normalized name — no fuzzy matching.

---

## 3. Pipeline Integration

### Current Flow (cachedNews.ts processArticles)

```typescript
let processed = geocodeArticles(articles);
processed = processed.map(a => {
  const topics = indexArticleTopics(a, a.language || 'en');
  return { ...a, scale, primaryTopic: topics.primary || undefined, ... };
});
const clusters = analyzeArticleHeat(processed, scale);
```

### New Flow

```typescript
let processed = geocodeArticles(articles);
processed = inferArticleOrigins(processed);  // NEW: fill coordinate gaps
processed = processed.map(a => {
  const topics = indexArticleTopics(a, a.language || 'en');
  return { ...a, scale, primaryTopic: topics.primary || undefined, ... };
});
const clusters = analyzeArticleHeat(processed, scale);
```

### Function Signatures

```typescript
// src/utils/geoInference.ts

/** Process articles missing coordinates through 3-layer inference */
function inferArticleOrigins(articles: NewsArticle[]): NewsArticle[]

/** Extract place-name candidates from article text */
function extractPlaceEntities(title: string, description?: string): PlaceCandidate[]

/** Look up a normalized name in the gazetteer */
function lookupGazetteer(name: string, countryConstraint?: string): GazetteerEntry | null

/** Load the core gazetteer into memory (synchronous, from bundled JSON) */
function loadCoreGazetteer(): Map<string, GazetteerEntry[]>

/** Load the extended gazetteer (async, fetched from public/) */
async function loadExtendedGazetteer(): Promise<Map<string, GazetteerEntry[]>>
```

All functions are exported from `src/utils/geoInference.ts`. The gazetteer `Map` is module-level (loaded once, reused).

### Confidence Field

Add to `NewsArticle` type in `src/types/news.ts`:

```typescript
locationConfidence?: 'exact' | 'inferred' | 'centroid';
```

- `'exact'` — existing dictionary match (set by `geocodeArticles`) OR dateline + gazetteer + country confirmation
- `'inferred'` — NLP extraction matched in gazetteer, or outlet reach fallback
- `'centroid'` — no city match; fell back to country centroid coordinates
- `undefined` — no location determined (pre-existing behavior)

The existing `geocodeArticles()` function in `geocoding.ts` is modified to set `locationConfidence: 'exact'` on articles it successfully geocodes.

### Extended Gazetteer Loading

The extended gazetteer (`cities1000`) is loaded separately when the user switches to local/regional scale. At that point, articles already in cache that have no coordinates can be re-checked against the deeper dataset. This is triggered by the scale selector, not by the processing pipeline.

### Error Handling

If the core gazetteer fails to load (import error), `inferArticleOrigins()` returns the input array unchanged — no coordinates enriched, no crash. If the extended gazetteer fetch fails, the system continues with core-only coverage.

---

## 4. Files Affected

**New files:**
- `scripts/build-gazetteer.ts` — build script to convert GeoNames TSV → JSON
- `src/data/gazetteer-core.json` — bundled core gazetteer (cities15000)
- `public/data/gazetteer-extended.json` — lazy-loaded extended gazetteer (cities1000)
- `src/utils/geoInference.ts` — `inferArticleOrigins()`, `extractPlaceEntities()`, `lookupGazetteer()`, gazetteer loaders, disambiguation logic
- `tests/utils/geoInference.test.ts` — tests for inference logic

**Modified files:**
- `src/types/news.ts` — add `locationConfidence` field to `NewsArticle`
- `src/utils/geocoding.ts` — set `locationConfidence: 'exact'` on successfully geocoded articles
- `src/services/cachedNews.ts` — add `inferArticleOrigins()` call in `processArticles()` pipeline
- `package.json` — add `compromise` dependency

**Unchanged:**
- `src/services/newsdata-api.ts` — no changes needed (`country` field already passed through)
- `src/components/globe/` — no rendering changes
- `src/utils/topicClustering.ts` — no changes
- `src/utils/coverageGap.ts` — no changes

---

## 5. Non-Goals

- No body text analysis — title + description only (body not always available from NewsData.io)
- No custom NLP model training
- No fuzzy/approximate matching in gazetteer — exact normalized match only
- No sub-city granularity (neighborhoods, streets)
- No user-facing UI for location confidence (infrastructure for future workstreams)
- No modifications to globe rendering or clustering logic
- No re-geocoding of articles that already have coordinates from the dictionary
- No runtime fetching from GeoNames API — everything is pre-built at build time
