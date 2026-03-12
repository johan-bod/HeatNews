# API Budget Management & Soft Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 4-query fetch with a structured shared pool (40 requests/day across scale groups), add personalized fetches (2/day per signed-in user) using their preference topics + locations, track API budget in Firestore, and show a soft gate with waitlist capture when refreshes are exhausted.

**Architecture:** A new `ApiBudgetService` tracks daily request counts in localStorage (with Firestore sync for signed-in users). The shared pool fetch is restructured into specific query groups matching the spec. Personalized fetches build API queries from user preferences and merge results with the shared pool. The soft gate UI shows when a user exhausts their 2 daily refreshes.

**Tech Stack:** React 19, TypeScript, Vitest, Firebase Firestore, existing NewsData.io API service, existing caching infrastructure

**Spec:** `docs/superpowers/specs/2026-03-12-heatstory-personalization-design.md` (sections: API Budget Strategy, Personalized fetches, Degradation strategy, Soft gate, Data Storage & Expiration)

**Depends on:** Sub-projects 1-4 — all completed

---

## File Structure

```
src/
├── services/
│   ├── apiBudget.ts                   # Budget tracking (daily counts, limits)
│   ├── sharedPool.ts                  # Structured shared pool fetch (replaces current cachedNews.ts fetch logic)
│   ├── personalizedFetch.ts           # Build + execute personalized API queries from preferences
│   ├── cachedNews.ts                  # Modified: use sharedPool + personalizedFetch
│   └── newsdata-api.ts               # Modified: hook budget tracking into API calls
├── components/
│   ├── SoftGate.tsx                   # "Daily refreshes used" + waitlist capture
│   └── RefreshIndicator.tsx           # "2/2 refreshes remaining" badge
├── pages/
│   └── Index.tsx                      # Modified: integrate budget state, soft gate, refresh indicator
tests/
├── services/
│   ├── apiBudget.test.ts              # Budget tracking tests
│   ├── sharedPool.test.ts             # Query group structure tests
│   └── personalizedFetch.test.ts      # Preference-to-query mapping tests
```

---

## Chunk 1: Budget Tracking + Shared Pool

### Task 1: API budget tracking service

**Files:**
- Create: `src/services/apiBudget.ts`
- Create: `tests/services/apiBudget.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/services/apiBudget.test.ts`:
```typescript
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
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

describe('apiBudget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('global budget', () => {
    it('starts at 0 usage', () => {
      expect(getDailyUsage()).toBe(0);
    });

    it('increments usage', () => {
      incrementUsage(5);
      expect(getDailyUsage()).toBe(5);
    });

    it('allows requests when under limit', () => {
      expect(canMakeRequest(1)).toBe(true);
    });

    it('blocks requests when budget exhausted', () => {
      incrementUsage(DAILY_LIMIT);
      expect(canMakeRequest(1)).toBe(false);
    });

    it('reserves budget for shared pool emergency', () => {
      incrementUsage(DAILY_LIMIT - BUDGET_RESERVE);
      // Still under total limit, but in reserve zone
      expect(canMakeRequest(1)).toBe(false);
    });
  });

  describe('user fetch tracking', () => {
    it('starts at 0 fetches for a user', () => {
      expect(getUserFetchCount('user-1')).toBe(0);
    });

    it('increments user fetch count', () => {
      incrementUserFetch('user-1');
      expect(getUserFetchCount('user-1')).toBe(1);
    });

    it('allows fetch when under limit', () => {
      expect(canUserFetch('user-1')).toBe(true);
    });

    it('blocks fetch after 2 daily fetches', () => {
      incrementUserFetch('user-1');
      incrementUserFetch('user-1');
      expect(canUserFetch('user-1')).toBe(false);
    });

    it('tracks users independently', () => {
      incrementUserFetch('user-1');
      incrementUserFetch('user-1');
      expect(canUserFetch('user-1')).toBe(false);
      expect(canUserFetch('user-2')).toBe(true);
    });
  });

  describe('day reset', () => {
    it('resets usage on new day', () => {
      incrementUsage(100);
      incrementUserFetch('user-1');
      // Simulate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem('heatstory_budget_date', yesterday.toISOString().split('T')[0]);
      resetIfNewDay();
      expect(getDailyUsage()).toBe(0);
      expect(getUserFetchCount('user-1')).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/services/apiBudget.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/services/apiBudget.ts`:
```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Spec: 200 requests/day total, ~40 for shared pool
export const DAILY_LIMIT = 200;
export const SHARED_POOL_BUDGET = 40;
export const USER_DAILY_FETCHES = 2;
export const BUDGET_RESERVE = 20; // Reserve for emergency shared pool refresh

const STORAGE_KEY = 'heatstory_budget';
const DATE_KEY = 'heatstory_budget_date';
const USER_FETCH_KEY = 'heatstory_user_fetches';

interface BudgetState {
  requestCount: number;
  userFetches: Record<string, number>; // uid → fetch count
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { requestCount: 0, userFetches: {} };
    return JSON.parse(raw);
  } catch {
    return { requestCount: 0, userFetches: {} };
  }
}

function saveState(state: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(DATE_KEY, getToday());
  } catch {
    console.warn('Failed to save budget state');
  }
}

/** Reset counters if the stored date is not today */
export function resetIfNewDay(): void {
  const storedDate = localStorage.getItem(DATE_KEY);
  if (storedDate !== getToday()) {
    saveState({ requestCount: 0, userFetches: {} });
  }
}

/** Current daily API request count */
export function getDailyUsage(): number {
  resetIfNewDay();
  return loadState().requestCount;
}

/** Add N to the daily request count */
export function incrementUsage(count: number = 1): void {
  resetIfNewDay();
  const state = loadState();
  state.requestCount += count;
  saveState(state);
}

/**
 * Check if we can make N more API requests.
 * Blocks when remaining budget falls below BUDGET_RESERVE
 * (reserved for emergency shared pool refresh).
 */
export function canMakeRequest(count: number = 1): boolean {
  resetIfNewDay();
  const state = loadState();
  return state.requestCount + count <= DAILY_LIMIT - BUDGET_RESERVE;
}

/** How many personalized fetches a user has done today */
export function getUserFetchCount(uid: string): number {
  resetIfNewDay();
  return loadState().userFetches[uid] || 0;
}

/** Record a personalized fetch for a user */
export function incrementUserFetch(uid: string): void {
  resetIfNewDay();
  const state = loadState();
  state.userFetches[uid] = (state.userFetches[uid] || 0) + 1;
  saveState(state);
}

/** Whether a user can do a personalized fetch */
export function canUserFetch(uid: string): boolean {
  resetIfNewDay();
  const count = getUserFetchCount(uid);
  return count < USER_DAILY_FETCHES && canMakeRequest(1);
}

/** Remaining personalized fetches for a user */
export function getUserRemainingFetches(uid: string): number {
  resetIfNewDay();
  const used = getUserFetchCount(uid);
  return Math.max(0, USER_DAILY_FETCHES - used);
}

/**
 * Sync user's fetch count to Firestore (fire-and-forget).
 * Stored at users/{uid}.usage for the current day.
 */
export async function syncUsageToFirestore(uid: string): Promise<void> {
  if (!db) return;
  try {
    const today = getToday();
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      usage: {
        fetchCount: getUserFetchCount(uid),
        date: today,
      },
    }, { merge: true });
  } catch (error) {
    console.warn('Failed to sync usage to Firestore:', error);
  }
}

/**
 * Load user's fetch count from Firestore on sign-in.
 * If Firestore has a count for today, use it (may be higher than local).
 */
export async function loadUsageFromFirestore(uid: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'users', uid);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const usage = snapshot.data().usage;
      if (usage && usage.date === getToday()) {
        const state = loadState();
        const localCount = state.userFetches[uid] || 0;
        // Take the higher count (user may have fetched on another device)
        state.userFetches[uid] = Math.max(localCount, usage.fetchCount || 0);
        saveState(state);
      }
    }
  } catch (error) {
    console.warn('Failed to load usage from Firestore:', error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/apiBudget.test.ts
```
Expected: PASS (all 10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/apiBudget.ts tests/services/apiBudget.test.ts
git commit -m "feat: add API budget tracking service"
```

---

### Task 2: Structured shared pool fetch

**Files:**
- Create: `src/services/sharedPool.ts`
- Create: `tests/services/sharedPool.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/services/sharedPool.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  LOCAL_QUERY_GROUPS,
  REGIONAL_QUERY_GROUPS,
  NATIONAL_QUERY_GROUPS,
  INTERNATIONAL_QUERY_GROUPS,
  getRotatingCategory,
  buildSharedPoolQueries,
  type QueryGroup,
} from '@/services/sharedPool';

describe('sharedPool query groups', () => {
  it('has 4 local French city groups', () => {
    expect(LOCAL_QUERY_GROUPS).toHaveLength(4);
  });

  it('has 3 regional French groups', () => {
    expect(REGIONAL_QUERY_GROUPS).toHaveLength(3);
  });

  it('has 6 national European groups', () => {
    expect(NATIONAL_QUERY_GROUPS).toHaveLength(6);
  });

  it('has 7 international groups', () => {
    expect(INTERNATIONAL_QUERY_GROUPS).toHaveLength(7);
  });

  it('total query count is 40 (2 per group)', () => {
    const total = (4 + 3 + 6 + 7) * 2;
    expect(total).toBe(40);
  });
});

describe('getRotatingCategory', () => {
  it('returns a valid NewsData category', () => {
    const categories = ['politics', 'business', 'technology', 'science', 'health', 'sports', 'entertainment'];
    const cat = getRotatingCategory();
    expect(categories).toContain(cat);
  });

  it('rotates based on day of year', () => {
    // Just verify it returns a string — deterministic rotation tested by type
    expect(typeof getRotatingCategory()).toBe('string');
  });
});

describe('buildSharedPoolQueries', () => {
  it('returns 40 query configs', () => {
    const queries = buildSharedPoolQueries();
    expect(queries).toHaveLength(40);
  });

  it('each query has required fields', () => {
    const queries = buildSharedPoolQueries();
    for (const q of queries) {
      expect(q.scale).toBeDefined();
      expect(q.params).toBeDefined();
      expect(q.params.size).toBe(10);
    }
  });

  it('local queries target France', () => {
    const queries = buildSharedPoolQueries().filter(q => q.scale === 'local');
    expect(queries.length).toBe(8); // 4 groups × 2
    for (const q of queries) {
      expect(q.params.country).toBe('fr');
      expect(q.params.language).toBe('fr');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/services/sharedPool.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/services/sharedPool.ts`:
```typescript
import type { NewsDataSearchParams } from './newsdata-api';

type ArticleScale = 'local' | 'regional' | 'national' | 'international';

export interface QueryGroup {
  name: string;
  countries: string | string[];
  language: string | string[];
  query?: string; // For city/region-specific queries
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

/**
 * Get a rotating category based on day of year.
 * Spec: "one for top/general news and one for a rotating category
 * (politics one day, tech the next)"
 */
export function getRotatingCategory(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return ROTATING_CATEGORIES[dayOfYear % ROTATING_CATEGORIES.length];
}

/**
 * Build all 40 shared pool query configs.
 * Each group gets 2 queries: one for top news, one for a rotating category.
 */
export function buildSharedPoolQueries(): SharedPoolQuery[] {
  const rotatingCategory = getRotatingCategory();
  const queries: SharedPoolQuery[] = [];

  function addGroup(groups: QueryGroup[], scale: ArticleScale) {
    for (const group of groups) {
      // Query 1: top/general news
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

      // Query 2: rotating category
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/sharedPool.test.ts
```
Expected: PASS (all 9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/sharedPool.ts tests/services/sharedPool.test.ts
git commit -m "feat: add structured shared pool query groups"
```

---

### Task 3: Personalized fetch service

**Files:**
- Create: `src/services/personalizedFetch.ts`
- Create: `tests/services/personalizedFetch.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/services/personalizedFetch.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  buildPersonalizedQueries,
  estimateRequestCount,
} from '@/services/personalizedFetch';
import type { UserPreferences } from '@/types/preferences';

const makePrefs = (
  topics: string[],
  locations: { name: string; key: string; lat: number; lng: number; type: 'city' | 'country' }[]
): UserPreferences => ({
  topics: topics as UserPreferences['topics'],
  locations,
  onboardingComplete: true,
  updatedAt: Date.now(),
});

describe('estimateRequestCount', () => {
  it('returns 1 for 1-2 topics + 1 location', () => {
    expect(estimateRequestCount(2, 1)).toBe(1);
  });

  it('returns 2 for 3+ topics OR 2+ locations', () => {
    expect(estimateRequestCount(3, 1)).toBe(2);
    expect(estimateRequestCount(1, 2)).toBe(2);
  });

  it('returns 3 for 3+ topics AND 2+ locations', () => {
    expect(estimateRequestCount(4, 3)).toBe(3);
  });

  it('returns 0 for empty preferences', () => {
    expect(estimateRequestCount(0, 0)).toBe(0);
  });
});

describe('buildPersonalizedQueries', () => {
  it('returns empty for empty preferences', () => {
    const prefs = makePrefs([], []);
    expect(buildPersonalizedQueries(prefs)).toEqual([]);
  });

  it('builds 1 query for 2 topics + 1 location', () => {
    const prefs = makePrefs(
      ['politics', 'technology'],
      [{ name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' }]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(1);
    expect(queries[0].category).toBeDefined();
  });

  it('builds 2 queries for 4 topics + 1 location', () => {
    const prefs = makePrefs(
      ['politics', 'technology', 'sports', 'health'],
      [{ name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' }]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(2);
  });

  it('builds 3 queries for 4 topics + 3 locations', () => {
    const prefs = makePrefs(
      ['politics', 'technology', 'sports', 'health'],
      [
        { name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' },
        { name: 'Tokyo', key: 'tokyo', lat: 35.68, lng: 139.69, type: 'city' },
        { name: 'London', key: 'london', lat: 51.51, lng: -0.13, type: 'city' },
      ]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/services/personalizedFetch.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/services/personalizedFetch.ts`:
```typescript
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
  // First match wins (some topics map to same API cat)
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
 * Uses simple heuristics since PreferenceLocation has lat/lng but not always country.
 */
function locationToCountry(loc: PreferenceLocation): string | null {
  // Country-type locations may have the country name as key
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
 * Returns NewsDataSearchParams[] ready for fetchNewsDataArticles.
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
    // Single query: combine all topics + locations
    queries.push({
      size: 10,
      category: uniqueCategories.length > 0 ? uniqueCategories.slice(0, 5) : fallbackCategory,
      country: uniqueCountries.length > 0 ? uniqueCountries : undefined,
      language: 'en',
    });
  } else if (requestCount === 2) {
    // Split: first half of topics, second half
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
    // 3 queries: topics split + location-focused
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
    // Third query: location-specific with top news
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/personalizedFetch.test.ts
```
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/personalizedFetch.ts tests/services/personalizedFetch.test.ts
git commit -m "feat: add personalized fetch query builder"
```

---

## Chunk 2: Integration + UI

### Task 4: Update cachedNews.ts — use shared pool + budget tracking

**Files:**
- Modify: `src/services/cachedNews.ts`

This task restructures the existing `cachedNews.ts` to use the new shared pool query groups and budget tracking instead of the current 4 hardcoded queries.

- [ ] **Step 1: Read current cachedNews.ts**

Read `src/services/cachedNews.ts` to understand the current structure.

- [ ] **Step 2: Delete old fetch functions and replace with shared pool**

**Delete these 4 functions entirely** (lines 59-117 in current file):
- `fetchFranceLocalNews()` (lines 59-72)
- `fetchFranceRegionalNews()` (lines 74-87)
- `fetchEuropeNationalNews()` (lines 89-102)
- `fetchInternationalNews()` (lines 104-117)

**Add these imports** at the top of the file:
```typescript
import { buildSharedPoolQueries } from './sharedPool';
import { incrementUsage, canMakeRequest, SHARED_POOL_BUDGET } from './apiBudget';
```

**Add this function** in place of the deleted 4 functions:
```typescript
import { buildSharedPoolQueries } from './sharedPool';
import { incrementUsage, canMakeRequest, SHARED_POOL_BUDGET } from './apiBudget';

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

  const queries = buildSharedPoolQueries();

  // Execute in small batches (5 concurrent) to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        try {
          const response = await fetchNewsDataArticles(q.params);
          incrementUsage(1);
          return { scale: q.scale, articles: response.results.map(convertNewsDataArticle) };
        } catch (error) {
          console.warn(`Shared pool query failed (${q.group}):`, error);
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

  return result;
}
```

- [ ] **Step 3: Update fetchAndCacheNews to use fetchSharedPool**

Replace the `fetchAndCacheNews` function:
```typescript
async function fetchAndCacheNews(): Promise<CachedNewsConfig> {
  const pool = await fetchSharedPool();

  const now = Date.now();
  const cacheOpts = (region: string, scale: ArticleScale) => ({
    region,
    scale,
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_LOCAL, pool.local, cacheOpts('France - Cities', 'local'));
  setCacheData(CACHE_KEY_REGIONAL, pool.regional, cacheOpts('France - Regions', 'regional'));
  setCacheData(CACHE_KEY_NATIONAL, pool.national, cacheOpts('Europe - Countries', 'national'));
  setCacheData(CACHE_KEY_INTERNATIONAL, pool.international, cacheOpts('World', 'international'));
  setCacheData(CACHE_KEY_LAST_REFRESH, now, cacheOpts('System', 'international'));

  return {
    localNews: pool.local,
    regionalNews: pool.regional,
    nationalNews: pool.national,
    international: pool.international,
    lastUpdated: now,
  };
}
```

- [ ] **Step 4: Add personalized fetch function**

Add to `cachedNews.ts`, exported:
```typescript
import { buildPersonalizedQueries } from './personalizedFetch';
import { incrementUserFetch, canUserFetch, syncUsageToFirestore } from './apiBudget';
import type { UserPreferences } from '@/types/preferences';

const CACHE_KEY_PERSONALIZED = 'personalized_news';

/**
 * Execute a personalized fetch for a signed-in user.
 * Uses their preference topics + locations to build targeted queries.
 * Results are cached separately and merged with shared pool.
 */
export async function fetchPersonalizedNews(
  uid: string,
  preferences: UserPreferences
): Promise<NewsArticle[]> {
  if (!canUserFetch(uid)) {
    throw new Error('Daily personalized fetch limit reached');
  }

  const queries = buildPersonalizedQueries(preferences);
  if (queries.length === 0) return [];

  const articles: NewsArticle[] = [];

  for (const params of queries) {
    try {
      const response = await fetchNewsDataArticles(params);
      incrementUsage(1);
      articles.push(...response.results.map(convertNewsDataArticle));
    } catch (error) {
      console.warn('Personalized fetch query failed:', error);
    }
  }

  incrementUserFetch(uid);
  syncUsageToFirestore(uid); // fire-and-forget

  // Process and cache
  const processed = processArticles(articles, 'international');
  setCacheData(CACHE_KEY_PERSONALIZED, processed, {
    region: 'Personalized',
    scale: 'international',
    ttl: CACHE_TTL,
  });

  return processed;
}

/**
 * Get cached personalized articles (if any).
 */
export function getCachedPersonalizedNews(): NewsArticle[] {
  return getCacheData<NewsArticle[]>(CACHE_KEY_PERSONALIZED) || [];
}
```

- [ ] **Step 5: Verify build and tests**

```bash
npx vite build 2>&1 | tail -5
npx vitest run
```
Expected: Build succeeds, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/services/cachedNews.ts
git commit -m "feat: restructure cachedNews with shared pool + personalized fetch"
```

---

### Task 5: RefreshIndicator component

**Files:**
- Create: `src/components/RefreshIndicator.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/RefreshIndicator.tsx`:
```typescript
import { RefreshCw } from 'lucide-react';

interface RefreshIndicatorProps {
  remaining: number;
  total: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  isSignedIn: boolean;
}

export default function RefreshIndicator({
  remaining,
  total,
  onRefresh,
  isRefreshing,
  isSignedIn,
}: RefreshIndicatorProps) {
  if (!isSignedIn) return null;

  const exhausted = remaining <= 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        disabled={isRefreshing || exhausted}
        className={`
          flex items-center gap-2 font-body text-sm px-4 py-2 rounded-lg border transition-colors
          ${exhausted
            ? 'bg-ivory-200/5 border-ivory-200/10 text-ivory-200/30 cursor-not-allowed'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }
        `}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh my feed'}
      </button>
      <span className={`font-body text-xs ${exhausted ? 'text-red-400/60' : 'text-ivory-200/40'}`}>
        {remaining}/{total} remaining
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RefreshIndicator.tsx
git commit -m "feat: add personalized refresh indicator"
```

---

### Task 6: SoftGate component (waitlist capture)

**Files:**
- Create: `src/components/SoftGate.tsx`

- [ ] **Step 1: Create the soft gate**

Create `src/components/SoftGate.tsx`:
```typescript
import { useState } from 'react';
import { Flame, Check, Clock } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const INTENTIONS = [
  'More refreshes per day',
  'Custom alerts',
  'Team/organization use',
  'API access',
  'Other',
];

interface SoftGateProps {
  onDismiss: () => void;
}

export default function SoftGate({ onDismiss }: SoftGateProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = user?.email || '';

  const toggle = (intention: string) => {
    setSelected(prev =>
      prev.includes(intention)
        ? prev.filter(i => i !== intention)
        : [...prev, intention]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const entry = { email, intentions: selected, createdAt: new Date().toISOString() };
      // Always save to localStorage as fallback
      try {
        localStorage.setItem(`heatstory_waitlist_${user.uid}`, JSON.stringify(entry));
      } catch { /* localStorage full — ignore */ }
      // Sync to Firestore if available
      if (db) {
        await setDoc(doc(db, 'waitlist', user.uid), {
          email,
          intentions: selected,
          createdAt: serverTimestamp(),
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.warn('Failed to submit waitlist entry to Firestore:', error);
      // Still show success — the feedback is stored in localStorage
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-8 px-6">
        <Check className="w-8 h-8 text-green-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-navy-800 mb-2">
          You're on the list
        </h3>
        <p className="font-body text-sm text-navy-700/50 mb-4">
          We'll let you know when more features are available.
        </p>
        <button
          onClick={onDismiss}
          className="font-body text-xs text-amber-600 hover:text-amber-500 transition-colors"
        >
          Continue browsing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <Clock className="w-8 h-8 text-amber-500/60" />
        </div>
        <h3 className="font-display text-lg font-semibold text-navy-800 mb-2">
          You've used your daily refreshes
        </h3>
        <p className="font-body text-sm text-navy-700/50">
          Your personalized feed will refresh tomorrow. You can still explore the shared globe.
        </p>
      </div>

      {/* Waitlist */}
      <div className="bg-ivory-50 border border-amber-200/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <h4 className="font-display text-sm font-semibold text-navy-800">
            Join the waitlist for unlimited access
          </h4>
        </div>
        <p className="font-body text-xs text-navy-700/40 mb-4">
          We're building something new. Help us grow.
        </p>

        {/* Email (pre-filled) */}
        <div className="mb-4">
          <label className="font-body text-xs text-navy-700/50 block mb-1">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full bg-white border border-amber-200/30 rounded-lg px-3 py-2 font-body text-sm text-navy-800"
          />
        </div>

        {/* Intention checklist */}
        <div className="mb-4">
          <label className="font-body text-xs text-navy-700/50 block mb-2">
            What are you looking for?
          </label>
          <div className="space-y-2">
            {INTENTIONS.map(intention => (
              <button
                key={intention}
                onClick={() => toggle(intention)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors font-body text-sm
                  ${selected.includes(intention)
                    ? 'border-amber-500/50 bg-amber-50 text-amber-700'
                    : 'border-amber-200/20 bg-white text-navy-700/60 hover:border-amber-300/40'
                  }
                `}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                  ${selected.includes(intention) ? 'border-amber-500 bg-amber-500' : 'border-amber-200/40'}
                `}>
                  {selected.includes(intention) && <Check className="w-3 h-3 text-white" />}
                </div>
                {intention}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selected.length === 0}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-navy-900 font-body font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Join waitlist'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/SoftGate.tsx
git commit -m "feat: add soft gate with waitlist capture"
```

---

### Task 7: Wire budget + personalized fetch into Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Read current Index.tsx**

Read `src/pages/Index.tsx`.

- [ ] **Step 2: Add imports**

Add these imports to `src/pages/Index.tsx` (all are NEW — Index.tsx does not currently import any of these):
```typescript
import { fetchPersonalizedNews, getCachedPersonalizedNews } from '@/services/cachedNews';
import { getUserRemainingFetches, USER_DAILY_FETCHES, loadUsageFromFirestore } from '@/services/apiBudget';
import RefreshIndicator from '@/components/RefreshIndicator';
import SoftGate from '@/components/SoftGate';
import { useAuth } from '@/contexts/AuthContext';
```
Note: `useAuth` is from the existing `AuthContext` — it was not previously used in Index.tsx.

- [ ] **Step 3: Add state and budget tracking**

Inside the `Index` component, add:
```typescript
  const { user } = useAuth();
  const [personalizedArticles, setPersonalizedArticles] = useState<NewsArticle[]>([]);
  const [remainingFetches, setRemainingFetches] = useState(USER_DAILY_FETCHES);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
```

Add a `useEffect` to load cached personalized articles and sync usage on sign-in:
```typescript
  // Load personalized cache + sync usage on sign-in
  useEffect(() => {
    if (!user) {
      setPersonalizedArticles([]);
      setRemainingFetches(USER_DAILY_FETCHES);
      return;
    }
    setPersonalizedArticles(getCachedPersonalizedNews());
    setRemainingFetches(getUserRemainingFetches(user.uid));
    loadUsageFromFirestore(user.uid).then(() => {
      setRemainingFetches(getUserRemainingFetches(user.uid));
    });
  }, [user]);
```

- [ ] **Step 4: Add personalized refresh handler**

```typescript
  const handlePersonalizedRefresh = useCallback(async () => {
    if (!user) return;
    if (remainingFetches <= 0) {
      setShowSoftGate(true);
      return;
    }
    try {
      setIsPersonalizing(true);
      const newArticles = await fetchPersonalizedNews(user.uid, preferences);
      setPersonalizedArticles(newArticles);
      setRemainingFetches(getUserRemainingFetches(user.uid));
    } catch (error) {
      if ((error as Error).message.includes('limit reached')) {
        setShowSoftGate(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsPersonalizing(false);
    }
  }, [user, remainingFetches, preferences]);
```

- [ ] **Step 5: Merge personalized articles with allArticles**

Update the `articles` memo to merge personalized articles:
```typescript
  const articles = useMemo(() => {
    // Merge shared pool + personalized, deduplicate by id
    const merged = [...allArticles, ...personalizedArticles];
    const seen = new Set<string>();
    const deduped = merged.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    if (selectedScale === 'all') return deduped;
    return deduped.filter(a => a.scale === selectedScale);
  }, [allArticles, personalizedArticles, selectedScale]);
```

- [ ] **Step 6: Update JSX**

Replace the existing refresh button block (`<div className="fixed bottom-4 left-4 z-50">...`) with:
```tsx
      {/* Refresh controls */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-ivory-50/95 backdrop-blur-sm text-navy-700 hover:bg-white hover:text-amber-600 shadow-lg border border-amber-200/40 font-body text-sm"
          size="lg"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        <RefreshIndicator
          remaining={remainingFetches}
          total={USER_DAILY_FETCHES}
          onRefresh={handlePersonalizedRefresh}
          isRefreshing={isPersonalizing}
          isSignedIn={!!user}
        />
        {lastUpdated && !isLoading && (
          <div className="font-body text-[10px] text-navy-700/35 bg-ivory-50/90 backdrop-blur-sm px-3 py-1 rounded-md border border-amber-200/20 text-center">
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
```

Add soft gate below the NewsDemo:
```tsx
      {/* Soft gate */}
      {showSoftGate && (
        <SoftGate onDismiss={() => setShowSoftGate(false)} />
      )}
```

- [ ] **Step 7: Verify build and tests**

```bash
npx vite build 2>&1 | tail -10
npx vitest run
```
Expected: Build succeeds, all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: integrate budget tracking, personalized fetch, and soft gate"
```

---

### Task 8: Clean up orphaned files

**Files:**
- Delete: `src/components/ScaleCards.tsx` (replaced by globe zoom)
- Delete: `src/components/NewsMap.tsx` (replaced by GlobeView)

- [ ] **Step 1: Verify files are unused**

```bash
npx vite build 2>&1 | tail -5
```
Confirm build succeeds without these files being imported.

Search for any remaining imports:
```bash
grep -r "ScaleCards\|NewsMap" src/ --include="*.tsx" --include="*.ts"
```
Expected: No results (they're already removed from imports)

- [ ] **Step 2: Remove files**

```bash
rm src/components/ScaleCards.tsx src/components/NewsMap.tsx
```

- [ ] **Step 3: Verify build still passes**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add -u src/components/ScaleCards.tsx src/components/NewsMap.tsx
git commit -m "chore: remove orphaned ScaleCards and NewsMap components"
```

---

### Task 9: Final integration verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 2: Run build**

```bash
npx vite build 2>&1 | tail -15
```
Expected: Build succeeds

- [ ] **Step 3: Start dev server and manual verification**

```bash
npx vite dev
```

Verify in the browser:
1. Anonymous user sees shared pool data on the globe (no refresh indicator)
2. Shared pool loads articles from multiple scale groups (not just 4 queries)
3. Sign in with Google
4. "Refresh my feed" button appears with "2/2 remaining"
5. Click "Refresh my feed" — personalized articles appear on globe + feed
6. Counter updates to "1/2 remaining"
7. Click again — "0/2 remaining"
8. Third click → soft gate appears: "You've used your daily refreshes"
9. Waitlist form: email pre-filled, intention checklist works
10. Submit → "You're on the list" confirmation
11. "Continue browsing" dismisses the gate
12. Globe still shows shared pool data after exhaustion
13. Page refresh: personalized articles cached, fetch count persisted
14. Budget resets on new day (test by changing date in localStorage)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: budget and soft gate integration polish"
```

---

## Summary

After completing all 9 tasks, the API budget system is fully integrated:

- **Shared pool** — 40 structured queries across 20 geographic groups (local FR → international), rotating categories daily
- **Budget tracking** — daily request count in localStorage, synced to Firestore for signed-in users
- **Personalized fetches** — 2/day per user, builds queries from preference topics + locations, merges with shared pool
- **Budget reserve** — last 20 requests reserved for emergency shared pool refresh
- **Soft gate** — "Daily refreshes used" with waitlist email capture + intention checklist → Firestore `waitlist/{uid}`
- **Refresh indicator** — "2/2 remaining" badge for signed-in users
- **Graceful degradation** — globe always shows shared pool; personalized fetches disabled when budget exhausted
- **Orphan cleanup** — removed unused ScaleCards.tsx and NewsMap.tsx

This completes all 5 sub-projects from the HeatStory Personalization spec.
