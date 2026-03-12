# Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the media coverage database, expand geocoding to 500+ locations, and implement client-side topic indexation — the data foundation for the HeatStory globe.

**Architecture:** Three static TypeScript data modules (media outlets, geocoding locations, keyword dictionaries) plus a topic scoring engine and improved story clustering. All client-side, zero API cost. Each module exports typed data and pure functions.

**Tech Stack:** TypeScript, Vitest (new), existing React 19 + Vite 7 stack

**Spec:** `docs/superpowers/specs/2026-03-12-heatstory-personalization-design.md`

**Depends on:** Nothing (this is the foundation layer)

**Subsequent plans depend on this:** Globe (sub-project 3), User Preferences (sub-project 4), API Budget (sub-project 5)

---

## File Structure

```
src/
├── data/
│   ├── media-outlets.ts          # MediaOutlet[] — ~80-100 curated outlets
│   ├── media-types.ts            # TypeScript interfaces for media data
│   ├── geocoding-locations.ts    # Location database — 500+ entries (replaces inline LOCATION_DATABASE in geocoding.ts)
│   └── keywords/
│       ├── taxonomy.ts           # Topic taxonomy constants + types
│       ├── common.ts             # ~200 universal keywords
│       ├── fr.ts                 # ~500 French keywords
│       ├── en.ts                 # ~500 English keywords
│       ├── de.ts                 # ~100 German keywords
│       ├── es.ts                 # ~100 Spanish keywords
│       └── it.ts                 # ~100 Italian keywords
├── utils/
│   ├── geocoding.ts              # Modified: import from data/geocoding-locations.ts
│   ├── topicClustering.ts        # Modified: new heat formula from spec
│   ├── topicIndexer.ts           # NEW: multi-layer topic scoring engine
│   └── mediaLookup.ts            # NEW: match article source_id → MediaOutlet
├── types/
│   └── news.ts                   # Modified: add topics field to NewsArticle
tests/
├── utils/
│   ├── topicIndexer.test.ts
│   ├── mediaLookup.test.ts
│   ├── topicClustering.test.ts
│   └── geocoding.test.ts
```

---

## Chunk 1: Test Setup + Media Data Types

### Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `scripts` in `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest runs**

```bash
npx vitest run
```
Expected: "No test files found" (no error)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest test framework"
```

---

### Task 2: Media data types

**Files:**
- Create: `src/data/media-types.ts`

- [ ] **Step 1: Create types file**

```typescript
export interface GeoReach {
  name: string;
  lat: number;
  lng: number;
}

export interface MediaOutlet {
  name: string;
  country: string;
  domain: string;
  type: 'local' | 'regional' | 'national' | 'international';
  reach: GeoReach[];
  audienceScale: 'small' | 'medium' | 'large';
  primaryTopics: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/media-types.ts
git commit -m "feat: add media outlet type definitions"
```

---

### Task 3: Topic taxonomy

**Files:**
- Create: `src/data/keywords/taxonomy.ts`

- [ ] **Step 1: Create taxonomy file**

```typescript
export const TOPICS = [
  'politics', 'economy', 'technology', 'climate', 'sports',
  'health', 'education', 'culture', 'crime', 'energy',
  'transport', 'housing', 'agriculture', 'defense', 'immigration',
  'science', 'entertainment', 'finance', 'labor', 'environment',
  'diplomacy', 'religion', 'social', 'media', 'legal',
] as const;

export type Topic = typeof TOPICS[number];

/**
 * Map NewsData.io API categories to our topic taxonomy.
 * NewsData categories: business, entertainment, environment, food, health,
 * politics, science, sports, technology, top, tourism, world
 */
export const API_CATEGORY_MAP: Record<string, Topic> = {
  business: 'economy',
  entertainment: 'entertainment',
  environment: 'environment',
  food: 'culture',
  health: 'health',
  politics: 'politics',
  science: 'science',
  sports: 'sports',
  technology: 'technology',
  top: 'politics', // "top" is generic, politics is most common
  tourism: 'culture',
  world: 'diplomacy',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/data/keywords/taxonomy.ts
git commit -m "feat: add topic taxonomy with API category mapping"
```

---

## Chunk 2: Media Outlet Database

### Task 4: French media outlets (~40 outlets)

**Files:**
- Create: `src/data/media-outlets.ts`

- [ ] **Step 1: Create media outlets file with French outlets**

Create `src/data/media-outlets.ts` with ~40 French outlets. Each outlet needs accurate `domain` (matching NewsData.io source_id), `type`, `reach` coordinates, `audienceScale`, and `primaryTopics`.

Example structure for first few entries (full file will contain ~40):
```typescript
import type { MediaOutlet } from './media-types';

export const MEDIA_OUTLETS: MediaOutlet[] = [
  // === FRANCE — National ===
  {
    name: 'Le Monde',
    country: 'fr',
    domain: 'lemonde.fr',
    type: 'national',
    reach: [{ name: 'Paris', lat: 48.8566, lng: 2.3522 }],
    audienceScale: 'large',
    primaryTopics: ['politics', 'diplomacy', 'economy', 'culture'],
  },
  {
    name: 'Le Figaro',
    country: 'fr',
    domain: 'lefigaro.fr',
    type: 'national',
    reach: [{ name: 'Paris', lat: 48.8566, lng: 2.3522 }],
    audienceScale: 'large',
    primaryTopics: ['politics', 'economy', 'culture', 'entertainment'],
  },
  // ... ~38 more French outlets covering:
  // National: Le Parisien, Libération, Les Échos, La Croix, Le Point,
  //           L'Express, Marianne, France 24, RFI, BFM, LCI, L'Équipe,
  //           20 Minutes, Mediapart, L'Obs, Courrier International
  // Regional: Ouest-France, Sud Ouest, La Voix du Nord, Nice-Matin,
  //           DNA (Dernières Nouvelles d'Alsace), La Dépêche du Midi,
  //           Le Télégramme, Le Progrès, La Montagne, La Provence,
  //           Paris-Normandie, L'Est Républicain, Le Dauphiné Libéré,
  //           Midi Libre, La Nouvelle République, Centre Presse
  // Local: Actu.fr, Le JSL (Journal de Saône-et-Loire), etc.
];
```

Key data points for regional outlets — their `reach` arrays must include the actual cities/regions they cover. For example:
- Ouest-France: `reach` includes Rennes (48.11, -1.68), Nantes (47.22, -1.55), Brest (48.39, -4.49), Caen (49.18, -0.37), Le Mans (48.00, 0.20)
- La Voix du Nord: `reach` includes Lille (50.63, 3.06), Lens (50.43, 2.83), Dunkerque (51.03, 2.38)
- Nice-Matin: `reach` includes Nice (43.71, 7.26), Cannes (43.55, 7.01), Monaco (43.74, 7.42)

The implementing agent should research and fill all ~40 outlets with accurate data.

- [ ] **Step 2: Commit**

```bash
git add src/data/media-outlets.ts
git commit -m "feat: add French media outlet database (~40 outlets)"
```

---

### Task 5: European + Global media outlets (~40 outlets)

**Files:**
- Modify: `src/data/media-outlets.ts`

- [ ] **Step 1: Add European outlets (~25)**

Append to the `MEDIA_OUTLETS` array. Key outlets:
- **UK:** BBC (bbc.co.uk), The Guardian (theguardian.com), The Telegraph, Financial Times, The Times, Sky News
- **Germany:** Der Spiegel (spiegel.de), Die Zeit, Süddeutsche Zeitung, Bild, FAZ
- **Spain:** El País (elpais.com), El Mundo, La Vanguardia, ABC
- **Italy:** La Repubblica (repubblica.it), Corriere della Sera, La Stampa
- **Others:** NOS (Netherlands), RTÉ (Ireland), Le Soir (Belgium), NZZ (Switzerland), SVT (Sweden), NRK (Norway)

Each needs accurate `domain`, `reach` coordinates (capital + key cities), `type: 'national'` or `'international'`, and `primaryTopics`.

- [ ] **Step 2: Add Global outlets (~15)**

Append to the `MEDIA_OUTLETS` array:
- Reuters, AP, AFP (international wire services)
- NYT, Washington Post, CNN, NPR (US)
- Al Jazeera (Qatar/global)
- South China Morning Post (Hong Kong)
- The Sydney Morning Herald (Australia)
- Globe and Mail (Canada)
- Times of India (India)
- NHK (Japan)

Wire services get `type: 'international'` and broad `reach` arrays.

- [ ] **Step 3: Commit**

```bash
git add src/data/media-outlets.ts
git commit -m "feat: add European and global media outlets (~40 outlets)"
```

---

### Task 6: Media lookup utility

**Files:**
- Create: `src/utils/mediaLookup.ts`
- Create: `tests/utils/mediaLookup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/mediaLookup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { findOutletByDomain, findOutletBySourceId } from '@/utils/mediaLookup';

describe('mediaLookup', () => {
  describe('findOutletByDomain', () => {
    it('finds Le Monde by domain', () => {
      const outlet = findOutletByDomain('lemonde.fr');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('finds outlet by partial domain match', () => {
      const outlet = findOutletByDomain('www.lemonde.fr');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('returns undefined for unknown domain', () => {
      const outlet = findOutletByDomain('unknown-news.com');
      expect(outlet).toBeUndefined();
    });
  });

  describe('findOutletBySourceId', () => {
    it('finds outlet when source_id contains domain', () => {
      const outlet = findOutletBySourceId('lemonde');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('returns undefined for unknown source', () => {
      const outlet = findOutletBySourceId('totally_unknown_source');
      expect(outlet).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utils/mediaLookup.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/mediaLookup.ts`:
```typescript
import { MEDIA_OUTLETS } from '@/data/media-outlets';
import type { MediaOutlet } from '@/data/media-types';

// Pre-build lookup map: domain → outlet
const domainMap = new Map<string, MediaOutlet>();
for (const outlet of MEDIA_OUTLETS) {
  domainMap.set(outlet.domain, outlet);
  // Also index without TLD for partial matching
  const base = outlet.domain.replace(/\.\w+$/, '');
  domainMap.set(base, outlet);
}

/**
 * Find media outlet by full or partial domain.
 * Handles "www.lemonde.fr" → matches "lemonde.fr"
 */
export function findOutletByDomain(domain: string): MediaOutlet | undefined {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  if (domainMap.has(normalized)) return domainMap.get(normalized);
  // Try base name
  const base = normalized.replace(/\.\w+$/, '');
  return domainMap.get(base);
}

/**
 * Find media outlet by NewsData.io source_id.
 * source_id is typically the domain base (e.g., "lemonde", "bbc").
 */
export function findOutletBySourceId(sourceId: string): MediaOutlet | undefined {
  const lower = sourceId.toLowerCase();
  // Direct match on domain base
  const found = domainMap.get(lower);
  if (found) return found;
  // Fuzzy: check if sourceId is a substring of any domain
  for (const outlet of MEDIA_OUTLETS) {
    if (outlet.domain.includes(lower) || lower.includes(outlet.domain.replace(/\.\w+$/, ''))) {
      return outlet;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/utils/mediaLookup.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/mediaLookup.ts tests/utils/mediaLookup.test.ts
git commit -m "feat: add media outlet lookup utility with tests"
```

---

## Chunk 3: Expanded Geocoding Database

### Task 7: Extract location database to data module

**Files:**
- Create: `src/data/geocoding-locations.ts`
- Modify: `src/utils/geocoding.ts`

- [ ] **Step 1: Create the expanded location database**

Create `src/data/geocoding-locations.ts`. This file exports a `LOCATIONS` record mapping lowercase location names to `{ lat, lng }`. Start by copying the existing ~110 entries from `src/utils/geocoding.ts`, then expand to 500+.

Expansion targets:
- **France — all 96 département capitals** (not currently covered: Agen, Ajaccio, Albi, Amiens, Angers, Angoulême, Annecy, Aurillac, Auxerre, Bar-le-Duc, Bastia, Beauvais, Belfort, Besançon, Blois, Bobigny, Bourg-en-Bresse, Bourges, Caen, Cahors, Carcassonne, Châlons-en-Champagne, Chambéry, Chartres, Châteauroux, Chaumont, Colmar, Créteil, Digne-les-Bains, Épinal, Évreux, Évry, Foix, Gap, Guéret, La Rochelle, La Roche-sur-Yon, Laon, Laval, Le Mans, Le Puy-en-Velay, Limoges, Lons-le-Saunier, Mâcon, Melun, Mende, Metz, Mont-de-Marsan, Moulins, Nancy, Nanterre, Nevers, Niort, Orléans, Pau, Périgueux, Perpignan, Poitiers, Pontoise, Privas, Quimper, Rodez, Saint-Brieuc, Saint-Étienne, Saint-Lô, Tarbes, Tours, Troyes, Tulle, Valence, Vannes, Versailles, Vesoul, and more)
- **France — major suburbs/towns** (~30: Boulogne-Billancourt, Montreuil, Saint-Denis, Villeurbanne, Aix-en-Provence, Avignon, Béziers, Calais, Dunkerque, Lens, Mulhouse, Reims, Toulon, etc.)
- **France — all 13 metropolitan regions + 5 overseas** (add any missing)
- **Europe — top 5-10 cities per country** for DE, ES, IT, UK, NL, BE, CH, PT, AT, PL, SE, NO, DK, IE, GR
- **Global — top 20 cities per major country** (US, CA, BR, AU, JP, CN, IN, KR, MX, AR, ZA, EG, NG, etc.)

Structure:
```typescript
export interface Coordinates {
  lat: number;
  lng: number;
}

export const LOCATIONS: Record<string, Coordinates> = {
  // === France — Cities ===
  'paris': { lat: 48.8566, lng: 2.3522 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  // ... 500+ entries
};
```

The implementing agent should research accurate coordinates for all locations.

- [ ] **Step 2: Update geocoding.ts to import from data module**

Modify `src/utils/geocoding.ts`:
- Remove the inline `LOCATION_DATABASE` object
- Import `LOCATIONS` from `@/data/geocoding-locations`
- Update `SORTED_LOCATION_KEYS` to use `LOCATIONS`
- Update `getCoordinates()` to use `LOCATIONS`
- Keep all existing functions (`extractLocation`, `geocodeArticle`, `geocodeArticles`) working the same way

```typescript
import type { NewsArticle } from '@/types/news';
import { LOCATIONS } from '@/data/geocoding-locations';
import type { Coordinates } from '@/data/geocoding-locations';

export type { Coordinates };

const SORTED_LOCATION_KEYS = Object.keys(LOCATIONS)
  .sort((a, b) => b.length - a.length);

// ... rest of functions unchanged, but reference LOCATIONS instead of LOCATION_DATABASE
```

- [ ] **Step 3: Add outlet reach fallback to geocoding**

The spec requires (Location Extraction, step 3): if no location found in article text, fall back to the media outlet's primary coverage area. Update `extractLocation` in `src/utils/geocoding.ts`:

```typescript
import { findOutletBySourceId } from './mediaLookup';

export function extractLocation(article: NewsArticle): string | null {
  const text = `${article.title} ${article.description || ''} ${article.category || ''}`.toLowerCase();

  // Check tags first (most specific signal)
  if (article.tags) {
    for (const tag of article.tags) {
      const tagLower = tag.toLowerCase();
      for (const location of SORTED_LOCATION_KEYS) {
        if (tagLower === location || tagLower.includes(location)) {
          return location;
        }
      }
    }
  }

  // Check category
  if (article.category) {
    const category = article.category.toLowerCase();
    for (const location of SORTED_LOCATION_KEYS) {
      if (category.includes(location)) {
        return location;
      }
    }
  }

  // Search in title and description
  for (const location of SORTED_LOCATION_KEYS) {
    if (text.includes(location)) {
      return location;
    }
  }

  // Fallback: use media outlet's primary reach area
  const outlet = findOutletBySourceId(article.source.name);
  if (outlet && outlet.reach.length > 0) {
    const primaryReach = outlet.reach[0].name.toLowerCase();
    if (LOCATIONS[primaryReach]) {
      return primaryReach;
    }
  }

  return null;
}
```

- [ ] **Step 4: Write tests for geocoding including outlet fallback**

Create `tests/utils/geocoding.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { extractLocation, getCoordinates, geocodeArticle } from '@/utils/geocoding';
import type { NewsArticle } from '@/types/news';

const makeArticle = (title: string, opts: { description?: string; source?: string } = {}): NewsArticle => ({
  id: '1',
  title,
  description: opts.description,
  url: 'https://example.com',
  publishedAt: new Date().toISOString(),
  source: { name: opts.source || 'test', url: 'https://test.com' },
});

describe('geocoding', () => {
  it('extracts Paris from article title', () => {
    const loc = extractLocation(makeArticle('Fire in Paris metro'));
    expect(loc).toBe('paris');
  });

  it('prefers longer location names over shorter ones', () => {
    const loc = extractLocation(makeArticle('News from Saint-Étienne today'));
    expect(loc).toBe('saint-étienne');
  });

  it('returns coordinates for known location', () => {
    const coords = getCoordinates('paris');
    expect(coords).toEqual({ lat: 48.8566, lng: 2.3522 });
  });

  it('returns null for unknown location', () => {
    const coords = getCoordinates('atlantis');
    expect(coords).toBeNull();
  });

  it('geocodeArticle adds location and coordinates', () => {
    const article = makeArticle('Protest in Lyon streets');
    const result = geocodeArticle(article);
    expect(result.location).toBe('Lyon');
    expect(result.coordinates).toBeDefined();
    expect(result.coordinates!.lat).toBeCloseTo(45.764, 1);
  });

  it('falls back to media outlet reach when no location in text', () => {
    // Article with no location keywords but from Ouest-France (reach: Rennes)
    const article = makeArticle('Generic news headline with no city', { source: 'ouest-france' });
    const loc = extractLocation(article);
    // Should fall back to Ouest-France's primary reach (Rennes)
    expect(loc).toBe('rennes');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/utils/geocoding.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/geocoding-locations.ts src/utils/geocoding.ts tests/utils/geocoding.test.ts
git commit -m "feat: expand geocoding database to 500+ locations"
```

---

## Chunk 4: Topic Indexation System

### Task 8: Keyword dictionaries — common + French + English

**Files:**
- Create: `src/data/keywords/common.ts`
- Create: `src/data/keywords/fr.ts`
- Create: `src/data/keywords/en.ts`

- [ ] **Step 1: Create common keywords (~200 universal terms)**

Create `src/data/keywords/common.ts`:
```typescript
import type { Topic } from './taxonomy';

/** Universal keywords: brands, acronyms, names that work across languages */
export const COMMON_KEYWORDS: Record<string, Topic> = {
  // Politics / Diplomacy
  'nato': 'defense',
  'otan': 'defense',
  'onu': 'diplomacy',
  'g7': 'diplomacy',
  'g20': 'diplomacy',
  'brexit': 'politics',
  'trump': 'politics',
  'biden': 'politics',
  'macron': 'politics',
  'putin': 'politics',
  'zelensky': 'politics',
  // Economy / Finance
  'bitcoin': 'finance',
  'crypto': 'finance',
  'nasdaq': 'finance',
  'dow jones': 'finance',
  'cac 40': 'finance',
  'ftse': 'finance',
  'inflation': 'economy',
  'gdp': 'economy',
  'pib': 'economy',
  // Technology
  'openai': 'technology',
  'chatgpt': 'technology',
  'tesla': 'technology',
  'spacex': 'technology',
  'apple': 'technology',
  'google': 'technology',
  'microsoft': 'technology',
  'meta': 'technology',
  'amazon': 'technology',
  'nvidia': 'technology',
  // Sports
  'uefa': 'sports',
  'fifa': 'sports',
  'champions league': 'sports',
  'world cup': 'sports',
  'olympic': 'sports',
  'olympics': 'sports',
  // Climate / Environment
  'cop28': 'climate',
  'cop29': 'climate',
  'co2': 'climate',
  'ipcc': 'climate',
  'giec': 'climate',
  // Health
  'covid': 'health',
  'oms': 'health',
  'who': 'health',
  // ... ~150 more entries covering all 25 topics
};
```

The implementing agent should fill this to ~200 entries, covering all 25 topics with well-known universal terms.

- [ ] **Step 2: Create French keywords (~500)**

Create `src/data/keywords/fr.ts`:
```typescript
import type { Topic } from './taxonomy';

export const FR_KEYWORDS: Record<string, Topic> = {
  // Politics
  'élection': 'politics',
  'élections': 'politics',
  'assemblée nationale': 'politics',
  'sénat': 'politics',
  'député': 'politics',
  'gouvernement': 'politics',
  'premier ministre': 'politics',
  'président': 'politics',
  'vote': 'politics',
  'référendum': 'politics',
  'parti': 'politics',
  'candidat': 'politics',
  'campagne': 'politics',
  'réforme': 'politics',
  'loi': 'legal',
  'constitution': 'legal',
  'tribunal': 'legal',
  'justice': 'legal',
  'procès': 'legal',
  // Economy
  'chômage': 'economy',
  'emploi': 'labor',
  'salaire': 'labor',
  'grève': 'labor',
  'syndicat': 'labor',
  'entreprise': 'economy',
  'croissance': 'economy',
  'récession': 'economy',
  'bourse': 'finance',
  'impôt': 'economy',
  'budget': 'economy',
  // ... ~470 more entries
};
```

The implementing agent should fill to ~500 entries across all 25 topics with French vocabulary.

- [ ] **Step 3: Create English keywords (~500)**

Create `src/data/keywords/en.ts`:
```typescript
import type { Topic } from './taxonomy';

export const EN_KEYWORDS: Record<string, Topic> = {
  // Politics
  'election': 'politics',
  'elections': 'politics',
  'parliament': 'politics',
  'congress': 'politics',
  'senate': 'politics',
  'democrat': 'politics',
  'republican': 'politics',
  'governor': 'politics',
  'campaign': 'politics',
  'referendum': 'politics',
  'legislation': 'legal',
  'supreme court': 'legal',
  'verdict': 'legal',
  'lawsuit': 'legal',
  // Economy
  'unemployment': 'economy',
  'recession': 'economy',
  'growth': 'economy',
  'trade': 'economy',
  'tariff': 'economy',
  'stock market': 'finance',
  'interest rate': 'finance',
  'federal reserve': 'finance',
  // ... ~470 more entries
};
```

The implementing agent should fill to ~500 entries.

- [ ] **Step 4: Commit**

```bash
git add src/data/keywords/common.ts src/data/keywords/fr.ts src/data/keywords/en.ts
git commit -m "feat: add keyword dictionaries (common, French, English)"
```

---

### Task 9: Starter keyword dictionaries — German, Spanish, Italian

**Files:**
- Create: `src/data/keywords/de.ts`
- Create: `src/data/keywords/es.ts`
- Create: `src/data/keywords/it.ts`

- [ ] **Step 1: Create German keywords (~100)**

Create `src/data/keywords/de.ts`:
```typescript
import type { Topic } from './taxonomy';

export const DE_KEYWORDS: Record<string, Topic> = {
  'wahl': 'politics',
  'wahlen': 'politics',
  'bundestag': 'politics',
  'kanzler': 'politics',
  'regierung': 'politics',
  'partei': 'politics',
  'klimawandel': 'climate',
  'wirtschaft': 'economy',
  'arbeitslosigkeit': 'economy',
  'technologie': 'technology',
  'gesundheit': 'health',
  'bildung': 'education',
  'sport': 'sports',
  'fußball': 'sports',
  'bundesliga': 'sports',
  // ... ~85 more entries
};
```

- [ ] **Step 2: Create Spanish keywords (~100)**

Create `src/data/keywords/es.ts`:
```typescript
import type { Topic } from './taxonomy';

export const ES_KEYWORDS: Record<string, Topic> = {
  'elección': 'politics',
  'elecciones': 'politics',
  'gobierno': 'politics',
  'congreso': 'politics',
  'presidente': 'politics',
  'cambio climático': 'climate',
  'economía': 'economy',
  'desempleo': 'economy',
  'tecnología': 'technology',
  'salud': 'health',
  'educación': 'education',
  'deporte': 'sports',
  'fútbol': 'sports',
  'liga': 'sports',
  // ... ~85 more entries
};
```

- [ ] **Step 3: Create Italian keywords (~100)**

Create `src/data/keywords/it.ts`:
```typescript
import type { Topic } from './taxonomy';

export const IT_KEYWORDS: Record<string, Topic> = {
  'elezione': 'politics',
  'elezioni': 'politics',
  'governo': 'politics',
  'parlamento': 'politics',
  'presidente': 'politics',
  'cambiamento climatico': 'climate',
  'economia': 'economy',
  'disoccupazione': 'economy',
  'tecnologia': 'technology',
  'salute': 'health',
  'istruzione': 'education',
  'sport': 'sports',
  'calcio': 'sports',
  'serie a': 'sports',
  // ... ~85 more entries
};
```

- [ ] **Step 4: Commit**

```bash
git add src/data/keywords/de.ts src/data/keywords/es.ts src/data/keywords/it.ts
git commit -m "feat: add starter keyword dictionaries (German, Spanish, Italian)"
```

---

### Task 10: Topic indexer engine

**Files:**
- Create: `src/utils/topicIndexer.ts`
- Create: `tests/utils/topicIndexer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/topicIndexer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { indexArticleTopics } from '@/utils/topicIndexer';
import type { NewsArticle } from '@/types/news';

const makeArticle = (
  title: string,
  opts: { description?: string; category?: string; sourceId?: string; language?: string } = {}
): NewsArticle => ({
  id: '1',
  title,
  description: opts.description,
  url: 'https://example.com',
  publishedAt: new Date().toISOString(),
  category: opts.category,
  source: { name: opts.sourceId || 'unknown', url: 'https://test.com' },
});

describe('topicIndexer', () => {
  it('detects politics from English keywords', () => {
    // REQUIRES en.ts to include: 'parliament': 'politics' and 'legislation': 'legal'
    const result = indexArticleTopics(
      makeArticle('Parliament votes on new legislation', { language: 'en' }),
      'en'
    );
    expect(result.primary).toBe('politics');
  });

  it('detects sports from French keywords', () => {
    // REQUIRES fr.ts to include: 'ligue 1': 'sports' and 'psg': 'sports'
    const result = indexArticleTopics(
      makeArticle('Victoire en Ligue 1 pour le PSG', { language: 'fr' }),
      'fr'
    );
    expect(result.primary).toBe('sports');
  });

  it('uses API category as signal', () => {
    const result = indexArticleTopics(
      makeArticle('New development announced', { category: 'technology', language: 'en' }),
      'en'
    );
    expect(result.primary).toBe('technology');
  });

  it('boosts topic from source outlet primaryTopics', () => {
    // REQUIRES media-outlets.ts: L'Équipe with domain 'lequipe.fr' and primaryTopics: ['sports']
    // L'Équipe covers sports — article mentioning "Paris" should lean sports
    const result = indexArticleTopics(
      makeArticle('Paris match results', { sourceId: 'lequipe', language: 'fr' }),
      'fr'
    );
    expect(result.primary).toBe('sports');
  });

  it('returns multiple secondary topics', () => {
    const result = indexArticleTopics(
      makeArticle('Election campaign focuses on climate policy and economy', { language: 'en' }),
      'en'
    );
    expect(result.secondary.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to common keywords for unknown language', () => {
    const result = indexArticleTopics(
      makeArticle('NATO summit discusses Ukraine defense', {}),
      'xx' // unknown language
    );
    expect(result.primary).toBe('defense');
  });

  it('returns empty topics for unclassifiable article', () => {
    const result = indexArticleTopics(
      makeArticle('Abc def ghi jkl', {}),
      'en'
    );
    expect(result.primary).toBeNull();
    expect(result.secondary).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utils/topicIndexer.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/topicIndexer.ts`:
```typescript
import type { Topic } from '@/data/keywords/taxonomy';
import { API_CATEGORY_MAP } from '@/data/keywords/taxonomy';
import { COMMON_KEYWORDS } from '@/data/keywords/common';
import { FR_KEYWORDS } from '@/data/keywords/fr';
import { EN_KEYWORDS } from '@/data/keywords/en';
import { DE_KEYWORDS } from '@/data/keywords/de';
import { ES_KEYWORDS } from '@/data/keywords/es';
import { IT_KEYWORDS } from '@/data/keywords/it';
import { findOutletBySourceId } from './mediaLookup';
import type { NewsArticle } from '@/types/news';

export interface TopicResult {
  primary: Topic | null;
  secondary: Topic[];
  scores: Record<string, number>;
}

const LANGUAGE_DICTIONARIES: Record<string, Record<string, Topic>> = {
  fr: FR_KEYWORDS,
  en: EN_KEYWORDS,
  de: DE_KEYWORDS,
  es: ES_KEYWORDS,
  it: IT_KEYWORDS,
};

const SCORE_THRESHOLD = 3.0;

/**
 * Score article topics using 3-layer approach:
 * Layer 1: keyword dictionary matching (weight: 2)
 * Layer 2: source outlet bias (weight: 1.5)
 * Layer 3: API category (weight: 1)
 */
export function indexArticleTopics(
  article: NewsArticle,
  language: string
): TopicResult {
  const scores: Record<string, number> = {};
  const text = `${article.title} ${article.description || ''}`.toLowerCase();

  // Layer 1: Keyword matching
  const langDict = LANGUAGE_DICTIONARIES[language] || {};
  const allKeywords = { ...COMMON_KEYWORDS, ...langDict };

  for (const [keyword, topic] of Object.entries(allKeywords)) {
    if (text.includes(keyword)) {
      scores[topic] = (scores[topic] || 0) + 2;
    }
  }

  // Layer 2: Source bias
  const outlet = findOutletBySourceId(article.source.name);
  if (outlet) {
    for (const topic of outlet.primaryTopics) {
      scores[topic] = (scores[topic] || 0) + 1.5;
    }
  }

  // Layer 3: API category
  if (article.category) {
    const mappedTopic = API_CATEGORY_MAP[article.category.toLowerCase()];
    if (mappedTopic) {
      scores[mappedTopic] = (scores[mappedTopic] || 0) + 1;
    }
  }

  // Determine primary and secondary
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const primary = sorted.length > 0 && sorted[0][1] >= SCORE_THRESHOLD
    ? sorted[0][0] as Topic
    : null;

  const secondary = sorted
    .slice(primary ? 1 : 0)
    .filter(([, score]) => score >= SCORE_THRESHOLD)
    .map(([topic]) => topic as Topic);

  return { primary, secondary, scores };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/utils/topicIndexer.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/topicIndexer.ts tests/utils/topicIndexer.test.ts
git commit -m "feat: add topic indexer engine with 3-layer scoring"
```

---

## Chunk 5: Updated Heat Calculation + NewsArticle Type

### Task 11: Update NewsArticle type to include topics

**Files:**
- Modify: `src/types/news.ts`

- [ ] **Step 1: Add topics field to NewsArticle**

Add to the `NewsArticle` interface in `src/types/news.ts`:
```typescript
  // After existing fields, add:
  primaryTopic?: string;
  secondaryTopics?: string[];
  language?: string;
```

- [ ] **Step 2: Commit**

```bash
git add src/types/news.ts
git commit -m "feat: add topic and language fields to NewsArticle type"
```

---

### Task 12: Update topic clustering with new heat formula

**Files:**
- Modify: `src/utils/topicClustering.ts`
- Create: `tests/utils/topicClustering.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/topicClustering.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { clusterArticles, calculateClusterHeat } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';

const makeArticle = (id: string, title: string, source: string, hoursAgo = 1): NewsArticle => ({
  id,
  title,
  description: '',
  url: 'https://example.com',
  publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  source: { name: source, url: `https://${source}.com` },
});

describe('clusterArticles', () => {
  it('groups articles with similar titles into one cluster', () => {
    const articles = [
      makeArticle('1', 'Fire breaks out in downtown Paris building', 'lemonde'),
      makeArticle('2', 'Paris downtown building fire causes evacuation', 'lefigaro'),
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(1);
    expect(clusters[0].articles.length).toBe(2);
  });

  it('keeps dissimilar articles in separate clusters', () => {
    const articles = [
      makeArticle('1', 'Fire breaks out in downtown Paris', 'lemonde'),
      makeArticle('2', 'New tech startup raises funding in Berlin', 'spiegel'),
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(2);
  });
});

describe('calculateClusterHeat', () => {
  it('returns higher heat for more unique sources', () => {
    const heat1 = calculateClusterHeat(1, 1, 1); // 1 source
    const heat3 = calculateClusterHeat(3, 3, 1); // 3 sources
    expect(heat3).toBeGreaterThan(heat1);
  });

  it('adds recency bonus for articles < 2 hours old', () => {
    const recent = calculateClusterHeat(2, 2, 0.5); // 0.5 hours ago
    const old = calculateClusterHeat(2, 2, 8);       // 8 hours ago
    expect(recent).toBeGreaterThan(old);
  });

  it('caps at 100', () => {
    const heat = calculateClusterHeat(10, 20, 0.1);
    expect(heat).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utils/topicClustering.test.ts
```
Expected: FAIL — functions not exported or wrong signature

- [ ] **Step 3: Rewrite topicClustering.ts with spec formula**

Rewrite `src/utils/topicClustering.ts` to implement the spec's heat formula:
```typescript
import type { NewsArticle } from '@/types/news';

// Stopwords for title normalization (English + French)
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'and', 'or', 'but', 'not', 'by', 'from', 'as', 'it', 'this',
  'that', 'has', 'have', 'had', 'be', 'been', 'will', 'would', 'can', 'could',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'en', 'est', 'sur',
  'dans', 'pour', 'par', 'avec', 'qui', 'que', 'son', 'ses', 'aux', 'ce', 'cette',
]);

export interface StoryCluster {
  articles: NewsArticle[];
  terms: Set<string>;
  uniqueSources: Set<string>;
  heatLevel: number;
  coverage: number;
}

/**
 * Normalize title: lowercase, strip punctuation, remove stopwords,
 * extract significant terms (3+ chars).
 */
function extractTerms(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüÿçñ-]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Jaccard similarity between two term sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const term of a) {
    if (b.has(term)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const CLUSTER_THRESHOLD = 0.25;

/**
 * Cluster articles by title similarity using Jaccard index.
 */
export function clusterArticles(articles: NewsArticle[]): StoryCluster[] {
  const clusters: StoryCluster[] = [];

  for (const article of articles) {
    const terms = extractTerms(article.title);
    let matched = false;

    for (const cluster of clusters) {
      if (jaccardSimilarity(terms, cluster.terms) >= CLUSTER_THRESHOLD) {
        cluster.articles.push(article);
        cluster.uniqueSources.add(article.source.name);
        // Merge terms
        for (const t of terms) cluster.terms.add(t);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        articles: [article],
        terms,
        uniqueSources: new Set([article.source.name]),
        heatLevel: 0,
        coverage: 1,
      });
    }
  }

  // Calculate heat for each cluster
  for (const cluster of clusters) {
    const newestArticleHoursAgo = Math.min(
      ...cluster.articles.map(a => {
        const diffMs = Date.now() - new Date(a.publishedAt).getTime();
        return diffMs / (1000 * 60 * 60);
      })
    );
    cluster.heatLevel = calculateClusterHeat(
      cluster.uniqueSources.size,
      cluster.articles.length,
      newestArticleHoursAgo
    );
    cluster.coverage = cluster.uniqueSources.size;
  }

  return clusters;
}

/**
 * Heat formula from spec:
 * heatScore = min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus)
 */
export function calculateClusterHeat(
  uniqueSources: number,
  articleCount: number,
  newestArticleHoursAgo: number
): number {
  let recencyBonus = 0;
  if (newestArticleHoursAgo < 2) recencyBonus = 10;
  else if (newestArticleHoursAgo < 6) recencyBonus = 5;

  return Math.min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus);
}

/**
 * Map heat level to color.
 */
export function heatLevelToColor(heat: number): string {
  if (heat <= 20) return '#94A3B8'; // grey (cold)
  if (heat <= 40) return '#F59E0B'; // amber (warming)
  if (heat <= 60) return '#F97316'; // orange (warm)
  if (heat <= 80) return '#EF4444'; // red (hot)
  return '#DC2626'; // deep red (very hot)
}

/**
 * Get color for an article based on its cluster's heat level.
 */
export function getArticleColor(
  article: NewsArticle,
  clusters: StoryCluster[]
): string {
  for (const cluster of clusters) {
    if (cluster.articles.some(a => a.id === article.id)) {
      return heatLevelToColor(cluster.heatLevel);
    }
  }
  return '#94A3B8';
}

/**
 * Convenience: analyze articles and return clusters.
 * The `scale` parameter is kept for API compatibility but no longer
 * changes the formula (spec uses a single universal formula).
 */
export function analyzeArticleHeat(
  articles: NewsArticle[],
  _scale?: string
): StoryCluster[] {
  return clusterArticles(articles);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/utils/topicClustering.test.ts
```
Expected: PASS

- [ ] **Step 5: Add heatLevelToColor test**

Add to `tests/utils/topicClustering.test.ts`:
```typescript
describe('heatLevelToColor', () => {
  it('returns grey for cold (0-20)', () => {
    expect(heatLevelToColor(10)).toBe('#94A3B8');
  });
  it('returns amber for warming (21-40)', () => {
    expect(heatLevelToColor(30)).toBe('#F59E0B');
  });
  it('returns deep red for very hot (81-100)', () => {
    expect(heatLevelToColor(95)).toBe('#DC2626');
  });
});
```
Also update the import at the top to include `heatLevelToColor`.

- [ ] **Step 6: Update Index.tsx to use new StoryCluster type**

Modify `src/pages/Index.tsx` — the `processFilteredArticles` function uses the old `TopicCluster` type. Update it to use `StoryCluster`:

```typescript
// Change the import:
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import type { StoryCluster } from '@/utils/topicClustering';

// Update processFilteredArticles:
function processFilteredArticles(
  articles: NewsArticle[],
  scale: ScaleFilter
): NewsArticle[] {
  let processed = geocodeArticles(articles);
  const scaleValue: ArticleScale = scale === 'all' ? 'international' : scale;

  if (scale !== 'all') {
    processed = processed.map(a => ({ ...a, scale: scaleValue }));
  }

  const clusters = analyzeArticleHeat(processed, scaleValue);
  const clusterMap = new Map<string, StoryCluster>();
  clusters.forEach(cluster => {
    cluster.articles.forEach(a => clusterMap.set(a.id, cluster));
  });

  return processed.map(article => {
    const cluster = clusterMap.get(article.id);
    return {
      ...article,
      color: cluster ? getArticleColor(article, clusters) : '#94A3B8',
      heatLevel: cluster?.heatLevel || 0,
      coverage: cluster?.coverage || 1,
    };
  });
}
```

Also add topic indexing to `processFilteredArticles` (same as cachedNews.ts integration):
```typescript
import { indexArticleTopics } from '@/utils/topicIndexer';

// Inside processFilteredArticles, after geocoding:
processed = processed.map(a => {
  const topics = indexArticleTopics(a, a.language || 'en');
  return {
    ...a,
    primaryTopic: topics.primary || undefined,
    secondaryTopics: topics.secondary.length > 0 ? topics.secondary : undefined,
  };
});
```

- [ ] **Step 7: Verify build passes**

```bash
npx vite build
```
Expected: Build succeeds

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/utils/topicClustering.ts tests/utils/topicClustering.test.ts src/pages/Index.tsx
git commit -m "feat: rewrite topic clustering with spec heat formula"
```

---

### Task 13: Integrate topic indexing into article processing

**Files:**
- Modify: `src/services/cachedNews.ts`
- Modify: `src/services/newsdata-api.ts`

- [ ] **Step 1: Update convertNewsDataArticle to pass language through**

In `src/services/newsdata-api.ts`, update `convertNewsDataArticle`:
```typescript
export function convertNewsDataArticle(article: NewsDataArticle): NewsArticle {
  return {
    id: article.article_id,
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.link,
    publishedAt: article.pubDate,
    category: article.category?.[0],
    language: article.language,  // ADD THIS LINE
    source: {
      name: article.source_id,
      url: article.source_url,
    },
    thumbnail: article.image_url,
    tags: article.keywords || [],
  };
}
```

Also ensure `NewsDataArticle` type in `src/types/news.ts` has `language?: string` field (check if it already does).

- [ ] **Step 2: Update processArticles in cachedNews.ts to run topic indexing**

In `src/services/cachedNews.ts`, update the `processArticles` function to add topic indexing:
```typescript
import { indexArticleTopics } from '@/utils/topicIndexer';

function processArticles(articles: NewsArticle[], scale: ArticleScale): NewsArticle[] {
  let processed = geocodeArticles(articles);
  processed = processed.map(a => {
    // Run topic indexer
    const topics = indexArticleTopics(a, a.language || 'en');
    return {
      ...a,
      scale,
      primaryTopic: topics.primary || undefined,
      secondaryTopics: topics.secondary.length > 0 ? topics.secondary : undefined,
    };
  });

  const clusters = analyzeArticleHeat(processed, scale);

  const clusterMap = new Map<string, typeof clusters[0]>();
  clusters.forEach(cluster => {
    cluster.articles.forEach(a => clusterMap.set(a.id, cluster));
  });

  return processed.map(article => {
    const cluster = clusterMap.get(article.id);
    return {
      ...article,
      color: cluster ? getArticleColor(article, clusters) : '#94A3B8',
      heatLevel: cluster?.heatLevel || 0,
      coverage: cluster?.coverage || 1,
    };
  });
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx vite build
```
Expected: Build succeeds

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/newsdata-api.ts src/services/cachedNews.ts src/types/news.ts
git commit -m "feat: integrate topic indexing into article processing pipeline"
```

---

## Summary

After completing all 13 tasks, the data foundation is in place:

- **Media database:** ~80-100 outlets with types, domains, reach coordinates, audience scales, and primary topics
- **Geocoding:** 500+ locations (up from 110) covering France deeply, Europe broadly, and major global cities
- **Topic indexation:** 3-layer scoring engine (keywords + source bias + API category) with dictionaries for FR, EN, DE, ES, IT + universal common terms
- **Heat calculation:** New spec-based formula using unique sources, article count, and recency bonus
- **Test suite:** Vitest set up with tests for geocoding, media lookup, topic indexer, and clustering

**Next plan to write:** Sub-project 3 — 3D Globe (Globe.gl integration replacing Leaflet)
