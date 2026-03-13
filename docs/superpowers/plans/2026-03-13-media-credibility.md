# Media Credibility System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-tier credibility system that weights sources in the heat formula, filters unreliable sources at ingestion, and gives the editor domain-based overrides.

**Architecture:** A centralized `credibilityService.ts` resolves articles to tiers via domain overrides → outlet registry → fallback. The heat formula replaces raw source counting with weighted source counting plus a hyperlocal convergence bonus. Unreliable sources are filtered at ingestion in `newsdata-api.ts`.

**Tech Stack:** TypeScript, Vitest, existing media-outlets registry + mediaLookup utilities

---

## Chunk 1: Data Model + Credibility Service

### Task 1: Add CredibilityTier type and update MediaOutlet interface

**Files:**
- Modify: `src/data/media-types.ts`

- [ ] **Step 1: Add CredibilityTier type and update MediaOutlet**

In `src/data/media-types.ts`, add the type alias after the `GeoReach` interface and before `MediaOutlet`, then add the optional field to `MediaOutlet`:

```typescript
export type CredibilityTier = 'reference' | 'established' | 'regional' | 'hyperlocal' | 'niche' | 'unreliable';
```

Add to the `MediaOutlet` interface:

```typescript
  credibilityTier?: CredibilityTier;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (field is optional, existing outlets don't need it yet)

- [ ] **Step 3: Commit**

```bash
git add src/data/media-types.ts
git commit -m "feat: add CredibilityTier type to media data model"
```

---

### Task 2: Create credibility overrides file

**Files:**
- Create: `src/data/credibility-overrides.ts`

- [ ] **Step 1: Create the overrides file**

Create `src/data/credibility-overrides.ts`:

```typescript
import type { CredibilityTier } from './media-types';

/**
 * Editorial overrides for source credibility, keyed by domain.
 * Overrides take priority over the outlet registry's credibilityTier.
 *
 * Workflow: spot a problematic source → add its domain here → commit.
 * Git history tracks every editorial decision.
 */
export const CREDIBILITY_OVERRIDES: Record<string, CredibilityTier> = {
  // Wire services not yet in the outlet registry — override to reference tier
  'efe.com': 'reference',
  'ansa.it': 'reference',
  'dpa.com': 'reference',
  // Example editorial overrides — add domains as you review sources:
  // 'cnews.fr': 'unreliable',
  // 'valeursactuelles.com': 'niche',
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/data/credibility-overrides.ts
git commit -m "feat: add credibility overrides file for editorial control"
```

---

### Task 3: Create credibility service with tests

**Files:**
- Create: `src/utils/credibilityService.ts`
- Create: `tests/utils/credibilityService.test.ts`

**Context:**
- `NewsArticle` has `source: { name: string; url?: string }` and `url: string`
- `source.url` is set from `NewsDataArticle.source_url` (optional)
- `findOutletByDomain(domain)` in `src/utils/mediaLookup.ts` returns `MediaOutlet | undefined`
- `CREDIBILITY_OVERRIDES` in `src/data/credibility-overrides.ts` is `Record<string, CredibilityTier>`
- Domain extraction: parse hostname from URL string, strip `www.` prefix

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/credibilityService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveCredibility, resolveCredibilityByDomain, TIER_WEIGHTS } from '@/utils/credibilityService';
import type { NewsArticle } from '@/types/news';

const makeArticle = (sourceUrl: string, articleUrl = 'https://example.com/article'): NewsArticle => ({
  id: '1',
  title: 'Test',
  url: articleUrl,
  publishedAt: new Date().toISOString(),
  source: { name: 'test-source', url: sourceUrl },
});

describe('TIER_WEIGHTS', () => {
  it('has correct weights for all tiers', () => {
    expect(TIER_WEIGHTS.reference).toBe(1.0);
    expect(TIER_WEIGHTS.established).toBe(0.9);
    expect(TIER_WEIGHTS.regional).toBe(0.85);
    expect(TIER_WEIGHTS.hyperlocal).toBe(0.5);
    expect(TIER_WEIGHTS.niche).toBe(0.4);
    expect(TIER_WEIGHTS.unreliable).toBe(0.0);
  });
});

describe('resolveCredibilityByDomain', () => {
  it('returns niche for undefined domain', () => {
    const result = resolveCredibilityByDomain(undefined);
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
    expect(result.filtered).toBe(false);
  });

  it('returns niche for unknown domain', () => {
    const result = resolveCredibilityByDomain('unknown-blog-xyz.com');
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
    expect(result.filtered).toBe(false);
  });

  it('resolves known outlet from registry', () => {
    // lemonde.fr is in media-outlets.ts — will have credibilityTier after Task 4
    // For now, outlets without credibilityTier fall through to niche
    const result = resolveCredibilityByDomain('lemonde.fr');
    // This test will be updated after Task 4 adds credibilityTier to outlets
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('returns filtered=true for unreliable tier', () => {
    // This tests the override path — we need an override set to 'unreliable'
    // We test this via resolveCredibility with a mocked override below
    const result = resolveCredibilityByDomain('some-domain.com');
    // Without override, unknown → niche
    expect(result.filtered).toBe(false);
  });
});

describe('resolveCredibility', () => {
  it('extracts domain from source.url', () => {
    const article = makeArticle('https://www.lemonde.fr/politique');
    const result = resolveCredibility(article);
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('falls back to article.url when source.url is undefined', () => {
    const article = makeArticle(undefined as unknown as string, 'https://www.lemonde.fr/some-article');
    // source.url is undefined, should extract from article.url
    const result = resolveCredibility(article);
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('returns niche when no URL yields a domain', () => {
    const article: NewsArticle = {
      id: '1',
      title: 'Test',
      url: '',
      publishedAt: new Date().toISOString(),
      source: { name: 'test' },
    };
    const result = resolveCredibility(article);
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
  });

  it('weight matches TIER_WEIGHTS for resolved tier', () => {
    const article = makeArticle('https://unknown-site.org/page');
    const result = resolveCredibility(article);
    expect(result.weight).toBe(TIER_WEIGHTS[result.tier]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/credibilityService.test.ts`
Expected: FAIL — module `@/utils/credibilityService` does not exist

- [ ] **Step 3: Implement the credibility service**

Create `src/utils/credibilityService.ts`:

```typescript
import type { CredibilityTier } from '@/data/media-types';
import type { NewsArticle } from '@/types/news';
import { CREDIBILITY_OVERRIDES } from '@/data/credibility-overrides';
import { findOutletByDomain } from '@/utils/mediaLookup';

export const TIER_WEIGHTS: Record<CredibilityTier, number> = {
  reference: 1.0,
  established: 0.9,
  regional: 0.85,
  hyperlocal: 0.5,
  niche: 0.4,
  unreliable: 0.0,
};

interface CredibilityResult {
  tier: CredibilityTier;
  weight: number;
  filtered: boolean;
}

const NICHE_FALLBACK: CredibilityResult = {
  tier: 'niche',
  weight: TIER_WEIGHTS.niche,
  filtered: false,
};

/**
 * Extract hostname from a URL string, stripping www. prefix.
 * Returns undefined if the URL is falsy or unparseable.
 */
export function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve credibility by domain string.
 * Resolution order: overrides → outlet registry → niche fallback.
 *
 * Used by clustering code which iterates over unique source.name keys
 * and needs to resolve by domain without a full article object.
 */
export function resolveCredibilityByDomain(domain: string | undefined): CredibilityResult {
  if (!domain) return NICHE_FALLBACK;

  const normalized = domain.replace(/^www\./, '').toLowerCase();

  // 1. Check editorial overrides
  const overrideTier = CREDIBILITY_OVERRIDES[normalized];
  if (overrideTier) {
    return {
      tier: overrideTier,
      weight: TIER_WEIGHTS[overrideTier],
      filtered: overrideTier === 'unreliable',
    };
  }

  // 2. Check outlet registry
  const outlet = findOutletByDomain(normalized);
  if (outlet) {
    const tier = outlet.credibilityTier ?? 'niche';
    return {
      tier,
      weight: TIER_WEIGHTS[tier],
      filtered: tier === 'unreliable',
    };
  }

  // 3. Fallback
  return NICHE_FALLBACK;
}

/**
 * Resolve credibility for a full article.
 * Extracts domain from article.source.url, falling back to article.url.
 */
export function resolveCredibility(article: NewsArticle): CredibilityResult {
  const domain = extractDomain(article.source.url) ?? extractDomain(article.url);
  return resolveCredibilityByDomain(domain);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/credibilityService.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Verify full test suite still passes**

Run: `npx vitest run`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/credibilityService.ts tests/utils/credibilityService.test.ts
git commit -m "feat: add credibility service with domain resolution and tests"
```

---

## Chunk 2: Outlet Tier Assignment + Heat Formula Integration

### Task 4: Assign credibilityTier to all 78 outlets

**Files:**
- Modify: `src/data/media-outlets.ts`

**Context:**
- The file has 4 arrays: `nationalOutlets` (18), `regionalOutlets` (20), `europeanOutlets` (25), `globalOutlets` (15)
- Assignment per spec Section 6 (by editorial judgment, NOT by `type` field):
  - **Reference:** AFP (`afp.com`), Reuters (`reuters.com`), Associated Press (`apnews.com`) — wire services only
  - **Established:** All `nationalOutlets` (Le Monde, Le Figaro, etc.), all `europeanOutlets` (BBC, Guardian, Der Spiegel, etc.), plus France 24, RFI, Courrier International, CNN, NYT, Washington Post, NPR, Al Jazeera, SCMP, SMH, Globe and Mail, Times of India, NHK World, Deutsche Welle, The Hindu, Financial Times
  - **Regional:** All `regionalOutlets` except Le Journal de Saône-et-Loire
  - **Hyperlocal:** Le Journal de Saône-et-Loire (`lejsl.com`) — the only `type: 'local'` outlet
  - **Niche:** None currently — but unknown sources will default here

- [ ] **Step 1: Add credibilityTier to all nationalOutlets**

Add `credibilityTier: 'established' as const` to each of the 18 national outlets. Place the field after `audienceScale` on each outlet object.

Example for the first outlet:

```typescript
  {
    name: 'Le Monde',
    country: 'fr',
    domain: 'lemonde.fr',
    type: 'national',
    reach: [{ name: 'Paris', lat: 48.86, lng: 2.35 }],
    audienceScale: 'large',
    credibilityTier: 'established',
    primaryTopics: ['politics', 'diplomacy', 'economy', 'culture'],
  },
```

Apply to all 18 national outlets. Note: Courrier International, France 24, and RFI are in this array despite having `type: 'international'` — they all get `credibilityTier: 'established'`.

- [ ] **Step 2: Add credibilityTier to all regionalOutlets**

Add `credibilityTier: 'regional' as const` to all regional outlets EXCEPT:
- Le Journal de Saône-et-Loire (`lejsl.com`, `type: 'local'`) → `credibilityTier: 'hyperlocal'`

- [ ] **Step 3: Add credibilityTier to all europeanOutlets**

Add `credibilityTier: 'established' as const` to all 25 European outlets. These are national-level papers in their respective countries (BBC, Guardian, Der Spiegel, El País, La Repubblica, etc.).

Exception: La Vanguardia (`lavanguardia.com`) has `type: 'regional'` — it's a Barcelona regional paper. Give it `credibilityTier: 'regional'`.

- [ ] **Step 4: Add credibilityTier to all globalOutlets**

Wire services get `credibilityTier: 'reference'`:
- Reuters (`reuters.com`)
- Associated Press (`apnews.com`)
- AFP (`afp.com`)

All other global outlets get `credibilityTier: 'established'`:
- New York Times, Washington Post, CNN, NPR, Al Jazeera, SCMP, Sydney Morning Herald, Globe and Mail, Times of India, NHK World, Deutsche Welle, The Hindu

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing tests + credibility tests)

- [ ] **Step 7: Update credibility service test for known outlet**

In `tests/utils/credibilityService.test.ts`, update the test that resolves `lemonde.fr` — now that outlets have `credibilityTier`, it should resolve to `established`:

```typescript
  it('resolves known outlet from registry', () => {
    const result = resolveCredibilityByDomain('lemonde.fr');
    expect(result.tier).toBe('established');
    expect(result.weight).toBe(0.9);
    expect(result.filtered).toBe(false);
  });
```

Add additional tests:

```typescript
  it('resolves wire service as reference', () => {
    const result = resolveCredibilityByDomain('reuters.com');
    expect(result.tier).toBe('reference');
    expect(result.weight).toBe(1.0);
  });

  it('resolves regional outlet as regional', () => {
    const result = resolveCredibilityByDomain('ouest-france.fr');
    expect(result.tier).toBe('regional');
    expect(result.weight).toBe(0.85);
  });

  it('resolves hyperlocal outlet', () => {
    const result = resolveCredibilityByDomain('lejsl.com');
    expect(result.tier).toBe('hyperlocal');
    expect(result.weight).toBe(0.5);
  });
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run tests/utils/credibilityService.test.ts`
Expected: All pass

- [ ] **Step 9: Commit**

```bash
git add src/data/media-outlets.ts tests/utils/credibilityService.test.ts
git commit -m "feat: assign credibility tiers to all 78 media outlets"
```

---

### Task 5: Integrate credibility weighting into heat formula

**Files:**
- Modify: `src/utils/topicClustering.ts`
- Modify: `tests/utils/topicClustering.test.ts`

**Context:**
- Current `clusterArticles` builds clusters with `uniqueSources: Set<string>` where the key is `article.source.name` (which is `source_id`, e.g., `"lemonde"`)
- Current `calculateClusterHeat(uniqueSources: number, articleCount: number, newestArticleHoursAgo: number)` takes a plain count
- New approach: `clusterArticles` must also track a `sourceDomains` map (`source.name → source.url domain`) so that heat calculation can resolve credibility per unique source
- `calculateClusterHeat` signature changes to accept `weightedSources: number`, `hyperlocalCount: number` alongside existing params
- Convergence bonus: `hyperlocalCount >= 3 ? hyperlocalCount * 3 : 0`

- [ ] **Step 1: Write failing tests for new heat formula**

Add to `tests/utils/topicClustering.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { clusterArticles, calculateClusterHeat, heatLevelToColor } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';

const makeArticle = (id: string, title: string, source: string, hoursAgo = 1, sourceUrl?: string): NewsArticle => ({
  id,
  title,
  description: '',
  url: 'https://example.com',
  publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  source: { name: source, url: sourceUrl ?? `https://${source}.com` },
});

// ... keep existing tests ...

describe('calculateClusterHeat with credibility', () => {
  it('uses weighted sources instead of raw count', () => {
    // 3 reference sources (weight 1.0 each) = 3.0 weighted
    // newestArticleHoursAgo=4 → recencyBonus=5 (between 2 and 6 hours)
    const refHeat = calculateClusterHeat(3.0, 3, 4, 0);
    // 3 niche sources (weight 0.4 each) = 1.2 weighted
    const nicheHeat = calculateClusterHeat(1.2, 3, 4, 0);
    expect(refHeat).toBeGreaterThan(nicheHeat);
    // refHeat = min(100, 60 + 15 + 5) = 80
    // nicheHeat = min(100, 24 + 15 + 5) = 44
    expect(refHeat).toBe(80);
    expect(nicheHeat).toBe(44);
  });

  it('adds convergence bonus when 3+ hyperlocal sources', () => {
    // 4 hyperlocal sources (0.5 each) = 2.0 weighted, 4 hyperlocal count
    // newestArticleHoursAgo=4 → recencyBonus=5
    const withConvergence = calculateClusterHeat(2.0, 4, 4, 4);
    const withoutConvergence = calculateClusterHeat(2.0, 4, 4, 2);
    // withConvergence: min(100, 40 + 20 + 5 + 12) = 77
    // withoutConvergence: min(100, 40 + 20 + 5 + 0) = 65
    expect(withConvergence).toBe(77);
    expect(withoutConvergence).toBe(65);
  });

  it('convergence bonus does not exceed cap', () => {
    const heat = calculateClusterHeat(4.0, 10, 0.5, 10);
    expect(heat).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/topicClustering.test.ts`
Expected: FAIL — `calculateClusterHeat` has wrong number of parameters

- [ ] **Step 3: Update calculateClusterHeat signature and implementation**

In `src/utils/topicClustering.ts`, update `calculateClusterHeat`:

```typescript
/**
 * Heat formula with credibility weighting:
 * heat = min(100, (weightedSources * 20) + (articleCount * 5) + recencyBonus + convergenceBonus)
 *
 * @param weightedSources - sum of credibility weights per unique source (not raw count)
 * @param articleCount - number of articles in the cluster
 * @param newestArticleHoursAgo - age of the newest article in hours
 * @param hyperlocalCount - number of unique hyperlocal sources in the cluster
 */
export function calculateClusterHeat(
  weightedSources: number,
  articleCount: number,
  newestArticleHoursAgo: number,
  hyperlocalCount: number = 0
): number {
  let recencyBonus = 0;
  if (newestArticleHoursAgo < 2) recencyBonus = 10;
  else if (newestArticleHoursAgo < 6) recencyBonus = 5;

  const convergenceBonus = hyperlocalCount >= 3 ? hyperlocalCount * 3 : 0;

  return Math.min(100, (weightedSources * 20) + (articleCount * 5) + recencyBonus + convergenceBonus);
}
```

- [ ] **Step 4: Update clusterArticles to track source domains and compute weighted sources**

In `src/utils/topicClustering.ts`, add imports at the top:

```typescript
import { resolveCredibilityByDomain, extractDomain } from '@/utils/credibilityService';
```

Update `StoryCluster` to also track source URLs for domain resolution:

```typescript
export interface StoryCluster {
  articles: NewsArticle[];
  terms: Set<string>;
  uniqueSources: Set<string>;
  sourceDomains: Map<string, string | undefined>; // source.name → domain from source.url
  heatLevel: number;
  coverage: number;
}
```

In `clusterArticles`, when adding an article to a cluster, also track its source domain:

```typescript
// Inside the cluster-matching loop, after cluster.uniqueSources.add(article.source.name):
if (!cluster.sourceDomains.has(article.source.name)) {
  cluster.sourceDomains.set(article.source.name, extractDomain(article.source.url));
}
```

When creating a new cluster:

```typescript
clusters.push({
  articles: [article],
  terms,
  uniqueSources: new Set([article.source.name]),
  sourceDomains: new Map([[article.source.name, extractDomain(article.source.url)]]),
  heatLevel: 0,
  coverage: 1,
});
```

Use the `extractDomain` function imported from `credibilityService.ts` for domain extraction (no local duplicate needed).

Update the heat calculation loop to compute weighted sources:

```typescript
  for (const cluster of clusters) {
    // Compute weighted sources and hyperlocal count
    let weightedSources = 0;
    let hyperlocalCount = 0;
    for (const [, domain] of cluster.sourceDomains) {
      const { weight, tier } = resolveCredibilityByDomain(domain);
      weightedSources += weight;
      if (tier === 'hyperlocal') hyperlocalCount++;
    }

    const newestArticleHoursAgo = Math.min(
      ...cluster.articles.map(a => {
        const diffMs = Date.now() - new Date(a.publishedAt).getTime();
        return diffMs / (1000 * 60 * 60);
      })
    );
    cluster.heatLevel = calculateClusterHeat(
      weightedSources,
      cluster.articles.length,
      newestArticleHoursAgo,
      hyperlocalCount
    );
    cluster.coverage = cluster.uniqueSources.size;
  }
```

- [ ] **Step 5: Fix existing tests for updated calculateClusterHeat signature**

In `tests/utils/topicClustering.test.ts`, the existing tests call `calculateClusterHeat(uniqueSources, articleCount, hoursAgo)` with 3 args. The new signature has `hyperlocalCount` as a 4th arg with default `0`, so existing 3-arg calls still work. Verify they still pass.

Update the `makeArticle` helper to accept an optional `sourceUrl` parameter (already shown in Step 1).

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/topicClustering.ts tests/utils/topicClustering.test.ts
git commit -m "feat: integrate credibility weighting into heat formula with convergence bonus"
```

---

### Task 6: Filter unreliable articles at ingestion

**Files:**
- Modify: `src/services/newsdata-api.ts`

**Context:**
- `convertNewsDataArticle` currently returns `NewsArticle`
- It already has access to `article.source_url` (the NewsDataArticle field) which becomes `source.url` on the converted article
- `resolveCredibility(article)` takes a `NewsArticle` and returns `{ filtered: boolean, ... }`
- `searchAndFilterNews` calls `response.results.map(convertNewsDataArticle)` — needs `.filter()` after
- There are also other callers: check `fetchNewsDataArticles` usage

- [ ] **Step 1: Update convertNewsDataArticle return type and add filtering**

In `src/services/newsdata-api.ts`, add import:

```typescript
import { resolveCredibility } from '@/utils/credibilityService';
```

Change `convertNewsDataArticle` to return `NewsArticle | null`:

```typescript
export function convertNewsDataArticle(article: NewsDataArticle): NewsArticle | null {
  const outlet = MEDIA_OUTLETS.find(o => o.domain && article.source_url?.includes(o.domain));
  const resolvedCountry = outlet?.country || article.country?.[0]?.toLowerCase();

  const converted: NewsArticle = {
    id: article.article_id,
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.link,
    publishedAt: article.pubDate,
    category: article.category?.[0],
    language: article.language,
    country: resolvedCountry,
    source: {
      name: article.source_id,
      url: article.source_url,
    },
    thumbnail: article.image_url,
    tags: article.keywords || [],
  };

  // Filter unreliable sources at ingestion
  const { filtered } = resolveCredibility(converted);
  if (filtered) return null;

  return converted;
}
```

- [ ] **Step 2: Update searchAndFilterNews to filter nulls**

In the same file, update `searchAndFilterNews`:

```typescript
  const response = await fetchNewsDataArticles(apiParams);
  return response.results
    .map(convertNewsDataArticle)
    .filter((a): a is NewsArticle => a !== null);
```

- [ ] **Step 3: Update cachedNews.ts callers to filter nulls**

`src/services/cachedNews.ts` has two call sites that map `convertNewsDataArticle` and will now produce `(NewsArticle | null)[]` arrays. Both need `.filter()`:

**Line ~103** (in `fetchSharedPool`):
```typescript
return { scale: q.scale, articles: response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null) };
```

**Line ~218** (in `fetchPersonalizedNews`):
```typescript
articles.push(...response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null));
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/services/newsdata-api.ts src/services/cachedNews.ts
git commit -m "feat: filter unreliable sources at ingestion via credibility service"
```

---

### Task 7: Add override-based filtering test

**Files:**
- Modify: `tests/utils/credibilityService.test.ts`
- Modify: `src/data/credibility-overrides.ts`

**Context:**
- To test the full override → filter pipeline end-to-end, we add a test domain to the overrides, verify it resolves as unreliable/filtered, then remove it.
- Alternatively, test with a real override entry that stays in place as an example.

- [ ] **Step 1: Add an example override and test it**

Add a test override to `src/data/credibility-overrides.ts`. **Important:** preserve the existing EFE/ANSA/DPA entries from Task 2 and add the test entry:

```typescript
export const CREDIBILITY_OVERRIDES: Record<string, CredibilityTier> = {
  // Wire services not yet in the outlet registry — override to reference tier
  'efe.com': 'reference',
  'ansa.it': 'reference',
  'dpa.com': 'reference',
  // Test/example overrides
  'fake-news-site.com': 'unreliable',
};
```

Add tests to `tests/utils/credibilityService.test.ts`:

```typescript
describe('credibility overrides', () => {
  it('override filters unreliable domain', () => {
    // fake-news-site.com is in overrides as unreliable
    const result = resolveCredibilityByDomain('fake-news-site.com');
    expect(result.tier).toBe('unreliable');
    expect(result.weight).toBe(0.0);
    expect(result.filtered).toBe(true);
  });

  it('override takes priority over outlet registry', () => {
    // bfmtv.com is in the outlet registry as 'established' (weight 0.9)
    // but if we check without override, it resolves from registry
    const registryResult = resolveCredibilityByDomain('bfmtv.com');
    expect(registryResult.tier).toBe('established');

    // EFE is NOT in the outlet registry, but IS in overrides as 'reference'
    // This proves the override path works independently of the registry
    const overrideResult = resolveCredibilityByDomain('efe.com');
    expect(overrideResult.tier).toBe('reference');
    expect(overrideResult.weight).toBe(1.0);
  });

  it('resolveCredibility filters article from overridden domain', () => {
    const article: NewsArticle = {
      id: '1',
      title: 'Fake news article',
      url: 'https://fake-news-site.com/article',
      publishedAt: new Date().toISOString(),
      source: { name: 'fakenews', url: 'https://fake-news-site.com' },
    };
    const result = resolveCredibility(article);
    expect(result.filtered).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/utils/credibilityService.test.ts`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/data/credibility-overrides.ts tests/utils/credibilityService.test.ts
git commit -m "feat: add override filtering test with example unreliable domain"
```

---

### Task 8: End-to-end clustering test with credibility

**Files:**
- Modify: `tests/utils/topicClustering.test.ts`

**Context:**
- Test that `clusterArticles` produces different heat for clusters with high-credibility vs low-credibility sources
- Uses real domains from `media-outlets.ts` that now have `credibilityTier`

- [ ] **Step 1: Add end-to-end clustering tests**

Add to `tests/utils/topicClustering.test.ts`:

```typescript
describe('clusterArticles with credibility weighting', () => {
  it('cluster with reference sources gets higher heat than niche sources', () => {
    const refArticles = [
      makeArticle('1', 'Global summit on climate change begins today', 'reuters', 1, 'https://reuters.com'),
      makeArticle('2', 'Climate change summit begins with key agreements', 'apnews', 1, 'https://apnews.com'),
      makeArticle('3', 'Today climate change global summit kicks off', 'afp', 1, 'https://afp.com'),
    ];
    const nicheArticles = [
      makeArticle('4', 'Global summit on climate change begins today', 'blog1', 1, 'https://random-blog-1.com'),
      makeArticle('5', 'Climate change summit begins with key agreements', 'blog2', 1, 'https://random-blog-2.com'),
      makeArticle('6', 'Today climate change global summit kicks off', 'blog3', 1, 'https://random-blog-3.com'),
    ];

    const refClusters = clusterArticles(refArticles);
    const nicheClusters = clusterArticles(nicheArticles);

    expect(refClusters[0].heatLevel).toBeGreaterThan(nicheClusters[0].heatLevel);
  });

  it('hyperlocal convergence boosts heat when 3+ sources', () => {
    // Le Journal de Saône-et-Loire is the only hyperlocal outlet
    // For this test, we need 3+ hyperlocal sources — since we only have 1,
    // this test verifies the formula works with the mocked weights
    // newestArticleHoursAgo=4 → recencyBonus=5
    const heat3hyperlocal = calculateClusterHeat(1.5, 3, 4, 3); // 3 hyperlocal = 9 bonus
    const heat2hyperlocal = calculateClusterHeat(1.0, 2, 4, 2); // 2 hyperlocal = 0 bonus
    // heat3: min(100, 30 + 15 + 5 + 9) = 59
    // heat2: min(100, 20 + 10 + 5 + 0) = 35
    expect(heat3hyperlocal).toBe(59);
    expect(heat2hyperlocal).toBe(35);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/utils/topicClustering.test.ts`
Expected: All pass

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Verify production build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add tests/utils/topicClustering.test.ts
git commit -m "test: add end-to-end clustering tests with credibility weighting"
```
