# Investigate Page Foundation (V1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/investigate` route that displays all sources covering a story cluster, grouped by credibility tier, with geographic spread summary.

**Architecture:** Route state carries cluster + article data from GlobePopup; refresh fallback re-derives from localStorage cache. New `getAllClusterArticles()` helper for uncapped tier-grouped article listing. Shared `formatTimeAgo()` extracted to utility.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind CSS, Vitest, Lucide icons

---

## Chunk 1: Shared Utilities

### Task 1: Extract `formatTimeAgo` to shared utility

**Files:**
- Create: `src/utils/formatTime.ts`
- Create: `tests/utils/formatTime.test.ts`
- Modify: `src/components/NewsDemo.tsx:22-31`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/utils/formatTime.test.ts
import { describe, it, expect, vi } from 'vitest';
import { formatTimeAgo } from '@/utils/formatTime';

describe('formatTimeAgo', () => {
  it('returns "Just now" for recent dates', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('Just now');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/formatTime.test.ts`
Expected: FAIL — module `@/utils/formatTime` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/utils/formatTime.ts
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/formatTime.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Update NewsDemo.tsx to import from shared utility**

In `src/components/NewsDemo.tsx`:
- Add import at top: `import { formatTimeAgo } from '@/utils/formatTime';`
- Delete the inline `formatTimeAgo` function (lines 22–31)
- Everything else stays the same — the function signature is identical

- [ ] **Step 6: Verify existing behavior unchanged**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/formatTime.ts tests/utils/formatTime.test.ts src/components/NewsDemo.tsx
git commit -m "refactor: extract formatTimeAgo to shared utility"
```

---

### Task 2: Add `getAllClusterArticles` to credibilityHelpers

**Files:**
- Modify: `src/components/globe/credibilityHelpers.ts:55-81`
- Modify: `tests/components/globePopupCredibility.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/components/globePopupCredibility.test.ts`, after the existing `getClusterArticles` describe block:

```typescript
describe('getAllClusterArticles', () => {
  const makeArticle = (id: string, name: string, url: string): NewsArticle => ({
    id,
    title: `Article by ${name}`,
    url: `https://${url}/article`,
    source: { name, url: `https://${url}` },
    publishedAt: new Date().toISOString(),
  } as NewsArticle);

  it('includes all articles (no exclusion)', () => {
    const articles = [
      makeArticle('1', 'AFP', 'afp.com'),
      makeArticle('2', 'Reuters', 'reuters.com'),
      makeArticle('3', 'Le Monde', 'lemonde.fr'),
    ];
    const result = getAllClusterArticles(articles);
    expect(result).toHaveLength(3);
  });

  it('has no cap (returns more than 5)', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(String(i), `Source ${i}`, `source${i}.com`)
    );
    const result = getAllClusterArticles(articles);
    expect(result).toHaveLength(8);
  });

  it('sorts by tier weight descending', () => {
    const articles = [
      makeArticle('1', 'Unknown Blog', 'randomblog.xyz'),  // niche
      makeArticle('2', 'Reuters', 'reuters.com'),           // reference
      makeArticle('3', 'Le Monde', 'lemonde.fr'),           // established
    ];
    const result = getAllClusterArticles(articles);
    expect(result[0].article.id).toBe('2');  // Reuters (reference) first
    expect(result[0].tier).toBe('reference');
  });

  it('returns ClusterArticleItem with correct tier info', () => {
    const articles = [makeArticle('1', 'Reuters', 'reuters.com')];
    const result = getAllClusterArticles(articles);
    expect(result[0].tier).toBe('reference');
    expect(result[0].tierLabel).toBe('Reference');
    expect(result[0].tierColor).toBe('text-blue-400');
  });
});
```

Also update the import at the top of the test file to include `getAllClusterArticles`:

```typescript
import { getTierLabel, getTierColor, getBreakdownLabel, buildSourceBreakdown, getClusterArticles, getAllClusterArticles } from '@/components/globe/credibilityHelpers';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: FAIL — `getAllClusterArticles` is not exported

- [ ] **Step 3: Add the implementation**

Add this function to `src/components/globe/credibilityHelpers.ts`, after the `getClusterArticles` function (after line 81):

```typescript
export function getAllClusterArticles(
  articles: NewsArticle[]
): ClusterArticleItem[] {
  const withTier = articles.map(article => {
    const domain = extractDomainFromArticle(article);
    const { tier } = resolveCredibilityByDomain(domain);
    return {
      article,
      tier,
      tierLabel: getTierLabel(tier),
      tierColor: getTierColor(tier),
      weight: TIER_WEIGHTS[tier],
    };
  });

  withTier.sort((a, b) => b.weight - a.weight);

  return withTier.map(({ article, tier, tierLabel, tierColor }) => ({
    article,
    tier,
    tierLabel,
    tierColor,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: PASS — all tests including the 4 new ones

- [ ] **Step 5: Commit**

```bash
git add src/components/globe/credibilityHelpers.ts tests/components/globePopupCredibility.test.ts
git commit -m "feat: add getAllClusterArticles for investigate page"
```

---

## Chunk 2: InvestigatePage Component

### Task 3: Create InvestigatePage with route state and fallback

**Files:**
- Create: `src/pages/InvestigatePage.tsx`
- Modify: `src/App.tsx`

This task creates the full page component and wires up the route. It includes all three sections (header, source list, geographic spread).

- [ ] **Step 1: Create InvestigatePage component**

```typescript
// src/pages/InvestigatePage.tsx
import { useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import { analyzeArticleHeat, heatLevelToColor } from '@/utils/topicClustering';
import { hexToRgbaArc, countDistinctLocations } from '@/utils/arcBuilder';
import { getAllClusterArticles, getTierLabel, getTierColor } from '@/components/globe/credibilityHelpers';
import type { ClusterArticleItem } from '@/components/globe/credibilityHelpers';
import type { CredibilityTier } from '@/data/media-types';
import { formatTimeAgo } from '@/utils/formatTime';
import { getCacheData } from '@/utils/cache';

interface InvestigateState {
  cluster: StoryCluster;
  article: NewsArticle;
}

function useInvestigateData() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as InvestigateState | null;

  return useMemo(() => {
    // Fast path: route state available
    if (state?.cluster && state?.article) {
      return { cluster: state.cluster, article: state.article, loading: false };
    }

    // Refresh fallback: re-derive from localStorage cache
    // Uses getCacheData which handles the 'news_cache_' prefix and expiry checks
    const articleId = searchParams.get('article');
    if (!articleId) return { cluster: null, article: null, loading: false };

    try {
      const localNews = getCacheData<NewsArticle[]>('local_news') || [];
      const regionalNews = getCacheData<NewsArticle[]>('regional_news') || [];
      const nationalNews = getCacheData<NewsArticle[]>('national_news') || [];
      const international = getCacheData<NewsArticle[]>('international_news') || [];
      const allArticles = [...localNews, ...regionalNews, ...nationalNews, ...international];

      if (allArticles.length === 0) return { cluster: null, article: null, loading: false };

      const clusters = analyzeArticleHeat(allArticles, 'international');
      for (const cluster of clusters) {
        const found = cluster.articles.find(a => a.id === articleId);
        if (found) return { cluster, article: found, loading: false };
      }
    } catch {
      // Cache read failed
    }

    return { cluster: null, article: null, loading: false };
  }, [state, searchParams]);
}

function groupByTier(items: ClusterArticleItem[]): { tier: CredibilityTier; items: ClusterArticleItem[] }[] {
  const groups: { tier: CredibilityTier; items: ClusterArticleItem[] }[] = [];
  let currentTier: CredibilityTier | null = null;

  for (const item of items) {
    if (item.tier !== currentTier) {
      groups.push({ tier: item.tier, items: [item] });
      currentTier = item.tier;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  return groups;
}

export default function InvestigatePage() {
  const navigate = useNavigate();
  const { cluster, article } = useInvestigateData();

  if (!cluster || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-ivory-100 text-lg mb-4">This story is no longer available.</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to map
          </button>
        </div>
      </div>
    );
  }

  const heatColor = heatLevelToColor(cluster.heatLevel);
  const distinctLocations = countDistinctLocations(cluster);
  const allItems = getAllClusterArticles(cluster.articles);
  const tierGroups = groupByTier(allItems);
  const articlesWithCoords = cluster.articles.filter(a => a.coordinates);

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors mb-6 block"
        >
          ← Back to map
        </button>

        {/* Story Header */}
        <h1 className="text-2xl font-bold text-ivory-100 mb-3">
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-ivory-200/60 mb-8">
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{
              backgroundColor: hexToRgbaArc(heatColor, 0.2),
              color: heatColor,
            }}
          >
            {cluster.heatLevel}
          </span>
          <span className="text-ivory-200/30">·</span>
          <span>{cluster.articles.length} sources</span>
          {distinctLocations >= 2 && (
            <>
              <span className="text-ivory-200/30">·</span>
              <span>across {distinctLocations} regions</span>
            </>
          )}
        </div>

        {/* Source List by Tier */}
        <div className="space-y-6 mb-10">
          {tierGroups.map(({ tier, items }) => (
            <div key={tier} className="border border-ivory-200/10 rounded-lg p-4">
              {/* Tier header */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ivory-200/40 mb-3">
                <span className={getTierColor(tier)}>●</span>
                <span>{getTierLabel(tier)}</span>
              </div>
              {/* Article rows */}
              <div className="divide-y divide-ivory-200/5">
                {items.map(({ article: clusterArticle }) => (
                  <div key={clusterArticle.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-ivory-100">
                          {clusterArticle.source.name}
                        </span>
                        <a
                          href={clusterArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-ivory-200/80 hover:text-ivory-100 transition-colors truncate"
                        >
                          {clusterArticle.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-ivory-200/40">
                            {formatTimeAgo(clusterArticle.publishedAt)}
                          </span>
                          {clusterArticle.coordinates && (
                            <MapPin className="w-3 h-3 text-ivory-200/30" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Geographic Spread */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
            Geographic Spread
          </h2>
          {articlesWithCoords.length > 0 ? (
            <>
              <p className="text-sm text-ivory-200/40 mb-2">
                This story is covered from {distinctLocations} distinct location{distinctLocations !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-1">
                {articlesWithCoords.map(a => (
                  <li key={a.id} className="text-sm text-ivory-200/60">
                    {a.source.name} — {(Math.round(a.coordinates!.lat * 10) / 10).toFixed(1)}, {(Math.round(a.coordinates!.lng * 10) / 10).toFixed(1)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ivory-200/40">
              No geographic data available for this cluster
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

In `src/App.tsx`, add import and route:

```typescript
// Add import at top:
import InvestigatePage from "./pages/InvestigatePage";

// Add route before the catch-all (before line 27):
<Route path="/investigate" element={<InvestigatePage />} />
```

The Routes block becomes:
```tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/investigate" element={<InvestigatePage />} />
  <Route
    path="/admin"
    element={
      <AdminRoute>
        <Admin />
      </AdminRoute>
    }
  />
  <Route path="*" element={<NotFound />} />
</Routes>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests to verify nothing breaks**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/InvestigatePage.tsx src/App.tsx
git commit -m "feat: add InvestigatePage component and /investigate route"
```

---

### Task 4: Add "Investigate this story" button to GlobePopup

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx`

- [ ] **Step 1: Add navigate import and button**

In `src/components/globe/GlobePopup.tsx`:

Add import at top:
```typescript
import { useNavigate } from 'react-router-dom';
```

Inside the component function, add after the existing variable declarations (after line 28):
```typescript
const navigate = useNavigate();
const showInvestigate = cluster && cluster.articles.length >= 2;
```

Add the "Investigate this story" button. Place it after the "Read article" link (after line 187), before the closing `</div>` of the popup:

```tsx
{showInvestigate && (
  <button
    onClick={() => {
      navigate(`/investigate?article=${article.id}`, {
        state: { cluster, article },
      });
    }}
    className="mt-2 flex items-center gap-1.5 font-body text-xs text-amber-400 hover:text-amber-300 transition-colors"
  >
    Investigate this story →
  </button>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobePopup.tsx
git commit -m "feat: add Investigate this story button to GlobePopup"
```

---

### Task 5: Write InvestigatePage tests

**Files:**
- Create: `tests/pages/investigatePage.test.ts`

- [ ] **Step 1: Write tests for the data derivation and grouping logic**

Since InvestigatePage is a React component with routing dependencies, we test the pure logic functions it uses rather than rendering the full component. The key behaviors to verify are `getAllClusterArticles` (already tested in Task 2) and `groupByTier`. Extract `groupByTier` as an export for testability.

In `src/pages/InvestigatePage.tsx`, change:
```typescript
function groupByTier(items: ClusterArticleItem[]): { tier: CredibilityTier; items: ClusterArticleItem[] }[] {
```
to:
```typescript
export function groupByTier(items: ClusterArticleItem[]): { tier: CredibilityTier; items: ClusterArticleItem[] }[] {
```

Then write the test:

```typescript
// tests/pages/investigatePage.test.ts
import { describe, it, expect } from 'vitest';
import { groupByTier } from '@/pages/InvestigatePage';
import type { ClusterArticleItem } from '@/components/globe/credibilityHelpers';
import type { NewsArticle } from '@/types/news';

function makeItem(id: string, tier: string): ClusterArticleItem {
  return {
    article: {
      id,
      title: `Article ${id}`,
      url: `https://example.com/${id}`,
      publishedAt: new Date().toISOString(),
      source: { name: `Source ${id}`, url: `https://source${id}.com` },
    } as NewsArticle,
    tier: tier as any,
    tierLabel: tier,
    tierColor: `text-${tier}`,
  };
}

describe('groupByTier', () => {
  it('groups consecutive items by tier', () => {
    const items = [
      makeItem('1', 'reference'),
      makeItem('2', 'reference'),
      makeItem('3', 'established'),
      makeItem('4', 'niche'),
    ];
    const groups = groupByTier(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].tier).toBe('reference');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].tier).toBe('established');
    expect(groups[1].items).toHaveLength(1);
    expect(groups[2].tier).toBe('niche');
    expect(groups[2].items).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupByTier([])).toEqual([]);
  });

  it('returns single group when all same tier', () => {
    const items = [
      makeItem('1', 'regional'),
      makeItem('2', 'regional'),
    ];
    const groups = groupByTier(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/pages/investigatePage.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/pages/investigatePage.test.ts src/pages/InvestigatePage.tsx
git commit -m "test: add groupByTier tests for InvestigatePage"
```
