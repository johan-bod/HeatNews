# Query Strategy Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 40-query procedural shared pool with an anchor (8) + rotation pool (60) model that yields more unique articles from broader geography using fewer API calls.

**Architecture:** Query definitions in a flat data file (`queryDefinitions.ts`), rotation logic in `sharedPool.ts`, rotation index persisted in localStorage. `cachedNews.ts` calls the rewritten `sharedPool.ts` with the same return interface. Budget constant drops from 40 to 30.

**Tech Stack:** TypeScript, Vitest, localStorage

**Spec:** `docs/superpowers/specs/2026-03-13-query-strategy-design.md`

---

## Chunk 1: Query Definitions + Validation Tests

### Task 1: Create QueryDefinition type and anchor queries

**Files:**
- Create: `src/services/queryDefinitions.ts`
- Create: `tests/services/queryDefinitions.test.ts`

- [ ] **Step 1: Write validation tests for query definitions**

Create `tests/services/queryDefinitions.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ANCHOR_QUERIES, ROTATION_POOL, type QueryDefinition } from '@/services/queryDefinitions';

describe('QueryDefinition validation', () => {
  const allQueries = [...ANCHOR_QUERIES, ...ROTATION_POOL];

  describe('ANCHOR_QUERIES', () => {
    it('has exactly 8 anchor queries', () => {
      expect(ANCHOR_QUERIES).toHaveLength(8);
    });

    it('all anchors have category top', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.category).toBe('top');
      }
    });

    it('all anchors have prioritydomain top', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.prioritydomain).toBe('top');
      }
    });

    it('all anchor IDs start with anchor-', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.id).toMatch(/^anchor-/);
      }
    });
  });

  describe('ROTATION_POOL', () => {
    it('has exactly 60 rotation queries', () => {
      expect(ROTATION_POOL).toHaveLength(60);
    });

    it('all rotation IDs start with rot-', () => {
      for (const q of ROTATION_POOL) {
        expect(q.id).toMatch(/^rot-/);
      }
    });
  });

  describe('all queries', () => {
    it('have required fields (id, label, scale)', () => {
      for (const q of allQueries) {
        expect(q.id).toBeTruthy();
        expect(q.label).toBeTruthy();
        expect(['local', 'regional', 'national', 'international']).toContain(q.scale);
      }
    });

    it('have no duplicate IDs', () => {
      const ids = allQueries.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every scale has at least 5 queries', () => {
      const scales = ['local', 'regional', 'national', 'international'] as const;
      for (const scale of scales) {
        const count = allQueries.filter(q => q.scale === scale).length;
        expect(count).toBeGreaterThanOrEqual(5);
      }
    });

    it('languages defaults are valid arrays or undefined', () => {
      for (const q of allQueries) {
        if (q.languages !== undefined) {
          expect(Array.isArray(q.languages)).toBe(true);
          expect(q.languages.length).toBeGreaterThan(0);
        }
      }
    });

    it('countries are valid arrays or undefined', () => {
      for (const q of allQueries) {
        if (q.countries !== undefined) {
          expect(Array.isArray(q.countries)).toBe(true);
          expect(q.countries.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/queryDefinitions.test.ts`
Expected: FAIL — module `@/services/queryDefinitions` does not exist yet.

- [ ] **Step 3: Create queryDefinitions.ts with type + anchors + rotation pool**

Create `src/services/queryDefinitions.ts`:

```typescript
export interface QueryDefinition {
  id: string;
  label: string;
  scale: 'local' | 'regional' | 'national' | 'international';
  countries?: string[];
  languages?: string[];
  query?: string;
  category?: string;
  prioritydomain?: 'top' | 'medium';
  size?: number;
}

// --- Anchor queries: always run every refresh ---

export const ANCHOR_QUERIES: QueryDefinition[] = [
  {
    id: 'anchor-global',
    label: 'Global wire services',
    scale: 'international',
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-france',
    label: 'France national',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-uk',
    label: 'UK national',
    scale: 'national',
    countries: ['gb'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-germany',
    label: 'Germany national',
    scale: 'national',
    countries: ['de'],
    languages: ['de', 'en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-europe',
    label: 'Europe broad',
    scale: 'international',
    countries: ['fr', 'gb', 'de', 'es', 'it'],
    languages: ['en', 'fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-us-ca',
    label: 'US + Canada',
    scale: 'international',
    countries: ['us', 'ca'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-mena-africa',
    label: 'Middle East + Africa',
    scale: 'international',
    countries: ['ae', 'sa', 'eg', 'il', 'za', 'ng', 'ke'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-asia-pacific',
    label: 'Asia-Pacific',
    scale: 'international',
    countries: ['jp', 'kr', 'in', 'au'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
];

// --- Rotation pool: 22 drawn per refresh, cycling through all ~60 ---

export const ROTATION_POOL: QueryDefinition[] = [
  // === France deep (12) ===
  { id: 'rot-fr-local-1', label: 'Paris/Lyon/Marseille', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Paris OR Lyon OR Marseille' },
  { id: 'rot-fr-local-2', label: 'Toulouse/Nice/Bordeaux', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Toulouse OR Nice OR Bordeaux' },
  { id: 'rot-fr-local-3', label: 'Lille/Strasbourg/Nantes', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Lille OR Strasbourg OR Nantes' },
  { id: 'rot-fr-local-4', label: 'Rennes/Montpellier/Grenoble', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Rennes OR Montpellier OR Grenoble' },
  { id: 'rot-fr-region-1', label: 'Bretagne/Normandie', scale: 'regional', countries: ['fr'], languages: ['fr'], query: 'Bretagne OR Normandie' },
  { id: 'rot-fr-region-2', label: 'Provence/Occitanie', scale: 'regional', countries: ['fr'], languages: ['fr'], query: 'Provence OR Occitanie' },
  { id: 'rot-fr-region-3', label: 'Île-de-France/Hauts-de-France', scale: 'regional', countries: ['fr'], languages: ['fr'], query: '"Île-de-France" OR "Hauts-de-France"' },
  { id: 'rot-fr-region-4', label: 'Auvergne-Rhône-Alpes/Grand Est', scale: 'regional', countries: ['fr'], languages: ['fr'], query: '"Auvergne-Rhône-Alpes" OR "Grand Est"' },
  { id: 'rot-fr-politics', label: 'France politics', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'politics' },
  { id: 'rot-fr-economy', label: 'France economy', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'business' },
  { id: 'rot-fr-environment', label: 'France environment', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'environment' },
  { id: 'rot-fr-culture', label: 'France culture', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'food' },

  // === UK deep (6) ===
  { id: 'rot-uk-england', label: 'England', scale: 'national', countries: ['gb'], languages: ['en'] },
  { id: 'rot-uk-scotland', label: 'Scotland', scale: 'regional', countries: ['gb'], languages: ['en'], query: 'Scotland' },
  { id: 'rot-uk-wales-ni', label: 'Wales/Northern Ireland', scale: 'regional', countries: ['gb'], languages: ['en'], query: 'Wales OR "Northern Ireland"' },
  { id: 'rot-uk-london', label: 'London', scale: 'local', countries: ['gb'], languages: ['en'], query: 'London' },
  { id: 'rot-uk-midlands', label: 'Manchester/Birmingham', scale: 'local', countries: ['gb'], languages: ['en'], query: 'Manchester OR Birmingham' },
  { id: 'rot-uk-politics', label: 'UK politics', scale: 'national', countries: ['gb'], languages: ['en'], category: 'politics' },

  // === Europe (20) ===
  { id: 'rot-es-national', label: 'Spain', scale: 'national', countries: ['es'], languages: ['es', 'en'] },
  { id: 'rot-es-cities', label: 'Barcelona/Madrid', scale: 'local', countries: ['es'], languages: ['es', 'en'], query: 'Barcelona OR Madrid' },
  { id: 'rot-es-regions', label: 'Andalusia/Catalonia', scale: 'regional', countries: ['es'], languages: ['es', 'en'], query: 'Andalusia OR Catalonia' },
  { id: 'rot-it-national', label: 'Italy', scale: 'national', countries: ['it'], languages: ['it', 'en'] },
  { id: 'rot-it-cities', label: 'Rome/Milan', scale: 'local', countries: ['it'], languages: ['it', 'en'], query: 'Rome OR Milan' },
  { id: 'rot-it-regions', label: 'Sicily/Lombardy', scale: 'regional', countries: ['it'], languages: ['it', 'en'], query: 'Sicily OR Lombardy' },
  { id: 'rot-nl-be', label: 'Netherlands/Belgium', scale: 'national', countries: ['nl', 'be'], languages: ['nl', 'en'] },
  { id: 'rot-pt', label: 'Portugal', scale: 'national', countries: ['pt'], languages: ['pt', 'en'] },
  { id: 'rot-nordic-se-no', label: 'Sweden/Norway', scale: 'national', countries: ['se', 'no'], languages: ['en'] },
  { id: 'rot-nordic-dk-fi', label: 'Denmark/Finland', scale: 'national', countries: ['dk', 'fi'], languages: ['en'] },
  { id: 'rot-nordic-combined', label: 'Nordics combined', scale: 'international', countries: ['se', 'no', 'dk', 'fi'], languages: ['en'] },
  { id: 'rot-central-pl', label: 'Poland', scale: 'national', countries: ['pl'], languages: ['pl', 'en'] },
  { id: 'rot-central-cz-sk', label: 'Czech Republic/Slovakia', scale: 'national', countries: ['cz', 'sk'], languages: ['en'] },
  { id: 'rot-central-at-ch', label: 'Austria/Switzerland', scale: 'national', countries: ['at', 'ch'], languages: ['de', 'en'] },
  { id: 'rot-balkans-ro-bg', label: 'Romania/Bulgaria', scale: 'national', countries: ['ro', 'bg'], languages: ['en'] },
  { id: 'rot-balkans-gr-tr', label: 'Greece/Turkey', scale: 'national', countries: ['gr', 'tr'], languages: ['en'] },
  { id: 'rot-ie', label: 'Ireland', scale: 'national', countries: ['ie'], languages: ['en'] },
  { id: 'rot-baltic', label: 'Baltic states', scale: 'national', countries: ['ee', 'lv', 'lt'], languages: ['en'] },
  { id: 'rot-hu', label: 'Hungary', scale: 'national', countries: ['hu'], languages: ['en'] },
  { id: 'rot-ua', label: 'Ukraine', scale: 'national', countries: ['ua'], languages: ['en'] },

  // === Americas (8) ===
  { id: 'rot-us-east', label: 'US East Coast', scale: 'local', countries: ['us'], languages: ['en'], query: '"New York" OR Washington OR Miami' },
  { id: 'rot-us-west', label: 'US West Coast', scale: 'local', countries: ['us'], languages: ['en'], query: '"Los Angeles" OR "San Francisco" OR Seattle' },
  { id: 'rot-mx', label: 'Mexico', scale: 'national', countries: ['mx'], languages: ['es', 'en'] },
  { id: 'rot-br', label: 'Brazil', scale: 'national', countries: ['br'], languages: ['pt', 'en'] },
  { id: 'rot-latam-south', label: 'South America', scale: 'international', countries: ['ar', 'co', 'cl'], languages: ['es', 'en'] },
  { id: 'rot-caribbean', label: 'Caribbean', scale: 'international', countries: ['cu', 'jm', 'tt'], languages: ['en', 'es'] },
  { id: 'rot-ca-provinces', label: 'Canada', scale: 'national', countries: ['ca'], languages: ['en', 'fr'] },
  { id: 'rot-latam-central', label: 'Central America', scale: 'international', countries: ['pa', 'cr', 'gt'], languages: ['es', 'en'] },

  // === Middle East + Africa (7) ===
  { id: 'rot-gulf', label: 'Gulf states', scale: 'international', countries: ['ae', 'sa', 'qa', 'kw'], languages: ['en'] },
  { id: 'rot-levant', label: 'Levant', scale: 'international', countries: ['lb', 'sy', 'jo', 'iq'], languages: ['en'] },
  { id: 'rot-north-africa', label: 'North Africa', scale: 'international', countries: ['ma', 'dz', 'tn', 'eg'], languages: ['en', 'fr'] },
  { id: 'rot-west-africa', label: 'West Africa', scale: 'international', countries: ['ng', 'gh', 'sn', 'ci'], languages: ['en', 'fr'] },
  { id: 'rot-east-africa', label: 'East Africa', scale: 'international', countries: ['ke', 'et', 'tz', 'ug'], languages: ['en'] },
  { id: 'rot-southern-africa', label: 'Southern Africa', scale: 'international', countries: ['za', 'zw', 'mz'], languages: ['en'] },
  { id: 'rot-iran-turkey', label: 'Iran/Turkey', scale: 'international', countries: ['ir', 'tr'], languages: ['en'] },

  // === Asia-Pacific (7) ===
  { id: 'rot-jp', label: 'Japan', scale: 'national', countries: ['jp'], languages: ['en'] },
  { id: 'rot-kr', label: 'South Korea', scale: 'national', countries: ['kr'], languages: ['en'] },
  { id: 'rot-cn-tw', label: 'China/Taiwan', scale: 'international', countries: ['cn', 'tw'], languages: ['en'] },
  { id: 'rot-in', label: 'India', scale: 'national', countries: ['in'], languages: ['en'] },
  { id: 'rot-southeast-asia', label: 'Southeast Asia', scale: 'international', countries: ['th', 'vn', 'ph', 'id', 'my'], languages: ['en'] },
  { id: 'rot-au-nz', label: 'Australia/New Zealand', scale: 'national', countries: ['au', 'nz'], languages: ['en'] },
  { id: 'rot-central-asia', label: 'Central Asia', scale: 'international', countries: ['kz', 'uz'], languages: ['en'] },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/queryDefinitions.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/queryDefinitions.ts tests/services/queryDefinitions.test.ts
git commit -m "feat: add anchor + rotation pool query definitions with validation tests"
```

---

## Chunk 2: Rotation Logic + SharedPool Rewrite

### Task 2: Add rotation index helpers to cache.ts

**Files:**
- Modify: `src/utils/cache.ts:176` (append after existing code)

- [ ] **Step 1: Add rotation index get/set functions**

Append to the end of `src/utils/cache.ts`:

```typescript

/**
 * Rotation index for shared pool query cycling.
 * Stored directly in localStorage (not via cache wrapper — no TTL needed).
 */
const ROTATION_INDEX_KEY = 'heatstory_rotation_index';

export function getRotationIndex(): number {
  try {
    return parseInt(localStorage.getItem(ROTATION_INDEX_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function setRotationIndex(index: number): void {
  try {
    localStorage.setItem(ROTATION_INDEX_KEY, String(index));
  } catch {
    console.warn('Failed to save rotation index');
  }
}
```

- [ ] **Step 2: Run existing cache tests to verify no regression**

Run: `npx vitest run tests/utils/cache.test.ts`
Expected: All existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/utils/cache.ts
git commit -m "feat: add rotation index localStorage helpers to cache utility"
```

### Task 3: Rewrite sharedPool.ts with rotation logic

**Files:**
- Modify: `src/services/sharedPool.ts` (full rewrite)
- Modify: `tests/services/sharedPool.test.ts` (full rewrite)

- [ ] **Step 1: Write rotation logic tests**

Replace `tests/services/sharedPool.test.ts` entirely:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildRefreshQueries,
  sliceWithWrap,
  toSearchParams,
} from '@/services/sharedPool';
import { ANCHOR_QUERIES, ROTATION_POOL } from '@/services/queryDefinitions';

describe('sliceWithWrap', () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it('slices without wrapping', () => {
    expect(sliceWithWrap(items, 0, 3)).toEqual([0, 1, 2]);
    expect(sliceWithWrap(items, 5, 3)).toEqual([5, 6, 7]);
  });

  it('wraps around end of array', () => {
    expect(sliceWithWrap(items, 8, 4)).toEqual([8, 9, 0, 1]);
  });

  it('handles exact end boundary', () => {
    expect(sliceWithWrap(items, 7, 3)).toEqual([7, 8, 9]);
  });

  it('handles count larger than array', () => {
    const result = sliceWithWrap(items, 0, 12);
    expect(result).toHaveLength(12);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
  });
});

describe('buildRefreshQueries', () => {
  it('returns 30 total queries (8 anchor + 22 rotation)', () => {
    const { queries } = buildRefreshQueries(0);
    expect(queries).toHaveLength(30);
  });

  it('first 8 queries are always anchors', () => {
    const { queries } = buildRefreshQueries(0);
    const anchorIds = queries.slice(0, 8).map(q => q.id);
    expect(anchorIds).toEqual(ANCHOR_QUERIES.map(q => q.id));
  });

  it('anchor queries present regardless of rotation index', () => {
    const { queries: q0 } = buildRefreshQueries(0);
    const { queries: q30 } = buildRefreshQueries(30);
    const { queries: q55 } = buildRefreshQueries(55);

    for (const result of [q0, q30, q55]) {
      const anchorIds = result.slice(0, 8).map(q => q.id);
      expect(anchorIds).toEqual(ANCHOR_QUERIES.map(q => q.id));
    }
  });

  it('nextIndex advances by 22', () => {
    const { nextIndex } = buildRefreshQueries(0);
    expect(nextIndex).toBe(22);
  });

  it('nextIndex wraps around pool length', () => {
    const poolLen = ROTATION_POOL.length; // 60
    const { nextIndex } = buildRefreshQueries(50);
    expect(nextIndex).toBe((50 + 22) % poolLen); // 12
  });

  it('rotation slice starts at given index', () => {
    const { queries } = buildRefreshQueries(0);
    const rotationIds = queries.slice(8).map(q => q.id);
    const expectedIds = ROTATION_POOL.slice(0, 22).map(q => q.id);
    expect(rotationIds).toEqual(expectedIds);
  });

  it('rotation slice wraps correctly', () => {
    const { queries } = buildRefreshQueries(50);
    const rotationIds = queries.slice(8).map(q => q.id);
    // Should be items [50..59] + [0..11]
    const expected = [
      ...ROTATION_POOL.slice(50, 60),
      ...ROTATION_POOL.slice(0, 12),
    ].map(q => q.id);
    expect(rotationIds).toEqual(expected);
  });

  it('full cycle covers every rotation query exactly once', () => {
    const poolLen = ROTATION_POOL.length; // 60
    const seenIds = new Set<string>();
    let index = 0;
    const refreshCount = Math.ceil(poolLen / 22); // 3

    for (let i = 0; i < refreshCount; i++) {
      const { queries, nextIndex } = buildRefreshQueries(index);
      const rotationIds = queries.slice(8).map(q => q.id);
      rotationIds.forEach(id => seenIds.add(id));
      index = nextIndex;
    }

    // All 60 rotation queries should have been seen
    // (some may repeat on last partial cycle: 22+22+22=66, so 6 overlap)
    for (const q of ROTATION_POOL) {
      expect(seenIds.has(q.id)).toBe(true);
    }
  });
});

describe('toSearchParams', () => {
  it('maps countries to country param', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
      countries: ['fr', 'de'],
      languages: ['fr', 'en'],
    });
    expect(result.country).toEqual(['fr', 'de']);
    expect(result.language).toEqual(['fr', 'en']);
  });

  it('defaults language to en when languages omitted', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
    });
    expect(result.language).toBe('en');
  });

  it('defaults size to 10', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
    });
    expect(result.size).toBe(10);
  });

  it('passes through query, category, prioritydomain', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'local',
      query: 'Paris OR Lyon',
      category: 'top',
      prioritydomain: 'top',
    });
    expect(result.query).toBe('Paris OR Lyon');
    expect(result.category).toBe('top');
    expect(result.prioritydomain).toBe('top');
  });

  it('respects custom size', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
      size: 5,
    });
    expect(result.size).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/sharedPool.test.ts`
Expected: FAIL — `buildRefreshQueries`, `sliceWithWrap`, `toSearchParams` do not exist yet.

- [ ] **Step 3: Rewrite sharedPool.ts**

Replace `src/services/sharedPool.ts` entirely:

```typescript
import type { NewsDataSearchParams } from './newsdata-api';
import { ANCHOR_QUERIES, ROTATION_POOL, type QueryDefinition } from './queryDefinitions';

const ROTATION_SLICE_SIZE = 22;

/**
 * Slice `count` items from `arr` starting at `start`, wrapping around.
 */
export function sliceWithWrap<T>(arr: readonly T[], start: number, count: number): T[] {
  const len = arr.length;
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(start + i) % len]);
  }
  return result;
}

/**
 * Build the list of queries for one shared pool refresh.
 * Returns 8 anchors + 22 rotation queries + the next rotation index.
 */
export function buildRefreshQueries(rotationIndex: number): {
  queries: QueryDefinition[];
  nextIndex: number;
} {
  const rotationSlice = sliceWithWrap(ROTATION_POOL, rotationIndex, ROTATION_SLICE_SIZE);
  return {
    queries: [...ANCHOR_QUERIES, ...rotationSlice],
    nextIndex: (rotationIndex + ROTATION_SLICE_SIZE) % ROTATION_POOL.length,
  };
}

/**
 * Convert a QueryDefinition to NewsDataSearchParams.
 * Maps plural fields (countries, languages) to the API's singular params.
 */
export function toSearchParams(def: QueryDefinition): NewsDataSearchParams {
  const params: NewsDataSearchParams = {
    size: def.size ?? 10,
  };

  if (def.countries) {
    params.country = def.countries.length === 1 ? def.countries[0] : def.countries;
  }

  if (def.languages) {
    params.language = def.languages.length === 1 ? def.languages[0] : def.languages;
  } else {
    params.language = 'en';
  }

  if (def.query) params.query = def.query;
  if (def.category) params.category = def.category;
  if (def.prioritydomain) params.prioritydomain = def.prioritydomain;

  return params;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/sharedPool.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/sharedPool.ts tests/services/sharedPool.test.ts
git commit -m "feat: rewrite sharedPool with anchor + rotation pool model"
```

---

## Chunk 3: Integration + Budget Update

### Task 4: Update cachedNews.ts to use new sharedPool

**Files:**
- Modify: `src/services/cachedNews.ts:7,74-120`

- [ ] **Step 1: Update sharedPool import in cachedNews.ts**

On line 7, change:
```typescript
import { buildSharedPoolQueries } from './sharedPool';
```
to:
```typescript
import { buildRefreshQueries, toSearchParams } from './sharedPool';
```

- [ ] **Step 2: Add rotation index imports from cache**

On line 6, change:
```typescript
import { setCacheData, getCacheData, getCacheMetadata } from '@/utils/cache';
```
to:
```typescript
import { setCacheData, getCacheData, getCacheMetadata, getRotationIndex, setRotationIndex } from '@/utils/cache';
```

- [ ] **Step 3: Rewrite fetchSharedPool function**

Replace the `fetchSharedPool` function (lines 74-120) with:

```typescript
/**
 * Execute shared pool queries, respecting budget.
 * Fetches in batches to avoid overwhelming the API.
 */
async function fetchSharedPool(): Promise<{
  local: NewsArticle[];
  regional: NewsArticle[];
  national: NewsArticle[];
  international: NewsArticle[];
}> {
  const result = {
    local: [] as NewsArticle[],
    regional: [] as NewsArticle[],
    national: [] as NewsArticle[],
    international: [] as NewsArticle[],
  };

  if (!canMakeRequest(SHARED_POOL_BUDGET)) {
    console.warn('API budget insufficient for shared pool refresh');
    return result;
  }

  const rotationIndex = getRotationIndex();
  const { queries, nextIndex } = buildRefreshQueries(rotationIndex);

  // Execute in small batches (5 concurrent) to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        try {
          const params = toSearchParams(q);
          const response = await fetchNewsDataArticles(params);
          incrementUsage(1);
          return { scale: q.scale, articles: response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null) };
        } catch (error) {
          console.warn(`Shared pool query failed (${q.id}):`, error);
          return { scale: q.scale, articles: [] };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        const { scale, articles } = r.value;
        result[scale].push(...processArticles(articles, scale));
      }
    }
  }

  setRotationIndex(nextIndex);

  return result;
}
```

- [ ] **Step 4: Verify build compiles**

Run: `npx vitest run`
Expected: All tests PASS (existing tests still work, new tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/services/cachedNews.ts
git commit -m "feat: integrate rotation pool into fetchSharedPool"
```

### Task 5: Update budget constant

**Files:**
- Modify: `src/services/apiBudget.ts:6`
- Modify: `tests/services/apiBudget.test.ts`

- [ ] **Step 1: Change SHARED_POOL_BUDGET from 40 to 30**

In `src/services/apiBudget.ts` line 6, change:
```typescript
export const SHARED_POOL_BUDGET = 40;
```
to:
```typescript
export const SHARED_POOL_BUDGET = 30;
```

- [ ] **Step 2: Add budget constant assertion to tests**

In `tests/services/apiBudget.test.ts`, add a new test inside the `describe('apiBudget')` block (after line 16, before the first `describe('global budget')`):

```typescript
  it('shared pool budget is 30 requests', () => {
    expect(SHARED_POOL_BUDGET).toBe(30);
  });
```

Also update the import on line 12 to include `SHARED_POOL_BUDGET`:

Change:
```typescript
import {
  getDailyUsage,
  incrementUsage,
  canMakeRequest,
  getUserFetchCount,
  incrementUserFetch,
  canUserFetch,
  resetIfNewDay,
  DAILY_LIMIT,
  USER_DAILY_FETCHES,
  BUDGET_RESERVE,
} from '@/services/apiBudget';
```
to:
```typescript
import {
  getDailyUsage,
  incrementUsage,
  canMakeRequest,
  getUserFetchCount,
  incrementUserFetch,
  canUserFetch,
  resetIfNewDay,
  DAILY_LIMIT,
  SHARED_POOL_BUDGET,
  USER_DAILY_FETCHES,
  BUDGET_RESERVE,
} from '@/services/apiBudget';
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/services/apiBudget.ts tests/services/apiBudget.test.ts
git commit -m "chore: reduce shared pool budget from 40 to 30 queries/refresh"
```
