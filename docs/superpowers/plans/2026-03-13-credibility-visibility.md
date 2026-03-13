# Credibility Visibility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the 6-tier credibility system in the globe popup (tier badge, source breakdown, cluster article list) and add a static HowItWorks explainer section to the homepage.

**Architecture:** No new data systems. Clusters are reconstructed in `Index.tsx` from already-loaded articles via `analyzeArticleHeat()`, then threaded as a prop through `MapSection → GlobeView → GlobePopup`. Tier resolution uses the existing synchronous `resolveCredibilityByDomain()`. A new static `HowItWorks` component renders below the feed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-13-credibility-visibility-design.md`

---

## Chunk 1: Data Threading + GlobePopup Enhancement

### Task 1: Thread clusters from Index.tsx to GlobePopup

**Files:**
- Modify: `src/pages/Index.tsx:57-71,83-117,392-401`
- Modify: `src/components/MapSection.tsx:10-15,26,41`
- Modify: `src/components/globe/GlobeView.tsx:25-33,55-60,483-488`

- [ ] **Step 1: Add clusters state and reconstruction in Index.tsx**

In `Index.tsx`, add a `clusters` memo derived from `allArticles` via `useMemo`. After the existing `articles` memo (line 105-117), add:

```typescript
const clusters = useMemo(() => {
  if (allArticles.length === 0) return [];
  return analyzeArticleHeat(allArticles, 'international');
}, [allArticles]);
```

**Important:** Use `allArticles` (the unfiltered set passed to `MapSection`), not `articles` (which is scale-filtered). The globe displays `allArticles`, so clusters must be built from the same set — otherwise `clusters.find(...)` in the popup would miss articles. `analyzeArticleHeat` is already imported (line 19).

- [ ] **Step 2: Pass clusters prop through MapSection**

In `src/components/MapSection.tsx`:

Add `clusters` to the `MapSectionProps` interface:
```typescript
// old
interface MapSectionProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number, alt?: number) => void, flyToResults?: (articles: NewsArticle[]) => void) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
}

// new — add import and prop
import type { StoryCluster } from '@/utils/topicClustering';

interface MapSectionProps {
  articles: NewsArticle[];
  clusters: StoryCluster[];
  onFlyToReady?: (flyTo: (lat: number, lng: number, alt?: number) => void, flyToResults?: (articles: NewsArticle[]) => void) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
}
```

Destructure it in the component signature:
```typescript
// old
export default function MapSection({ articles, onFlyToReady, preferenceLocations, searchResultIds }: MapSectionProps) {

// new
export default function MapSection({ articles, clusters, onFlyToReady, preferenceLocations, searchResultIds }: MapSectionProps) {
```

Pass it to `GlobeView`:
```typescript
// old
<GlobeView articles={articles} onFlyToReady={onFlyToReady} preferenceLocations={preferenceLocations} searchResultIds={searchResultIds} />

// new
<GlobeView articles={articles} clusters={clusters} onFlyToReady={onFlyToReady} preferenceLocations={preferenceLocations} searchResultIds={searchResultIds} />
```

- [ ] **Step 3: Pass clusters prop through GlobeView**

In `src/components/globe/GlobeView.tsx`:

Add `clusters` to the `GlobeViewProps` interface:
```typescript
import type { StoryCluster } from '@/utils/topicClustering';

interface GlobeViewProps {
  articles: NewsArticle[];
  clusters: StoryCluster[];
  onFlyToReady?: (
    flyTo: (lat: number, lng: number, alt?: number) => void,
    flyToResults?: (articles: NewsArticle[]) => void
  ) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
}
```

Destructure in the function:
```typescript
// old
export default function GlobeView({
  articles,
  onFlyToReady,
  preferenceLocations = [],
  searchResultIds,
}: GlobeViewProps) {

// new
export default function GlobeView({
  articles,
  clusters,
  onFlyToReady,
  preferenceLocations = [],
  searchResultIds,
}: GlobeViewProps) {
```

Pass to `GlobePopup`:
```typescript
// old (line 483-488)
<GlobePopup
  article={selectedArticle}
  position={popupPosition}
  onClose={() => setSelectedArticle(null)}
/>

// new
<GlobePopup
  article={selectedArticle}
  clusters={clusters}
  position={popupPosition}
  onClose={() => setSelectedArticle(null)}
/>
```

- [ ] **Step 4: Pass clusters in Index.tsx MapSection render**

In `Index.tsx`, update the `<MapSection>` render (around line 393):
```typescript
// old
<MapSection
  articles={allArticles}
  onFlyToReady={(fn, fnResults) => {
    setGlobeFlyTo(() => fn);
    if (fnResults) setGlobeFlyToResults(() => fnResults);
  }}
  preferenceLocations={preferences.locations}
  searchResultIds={searchResultIds}
/>

// new
<MapSection
  articles={allArticles}
  clusters={clusters}
  onFlyToReady={(fn, fnResults) => {
    setGlobeFlyTo(() => fn);
    if (fnResults) setGlobeFlyToResults(() => fnResults);
  }}
  preferenceLocations={preferences.locations}
  searchResultIds={searchResultIds}
/>
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors (clusters prop threads cleanly)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx src/components/MapSection.tsx src/components/globe/GlobeView.tsx
git commit -m "feat: thread StoryCluster[] from Index through to GlobePopup"
```

---

### Task 2: Add credibility tier badge to GlobePopup

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx:1-97`
- Create: `tests/components/globePopupCredibility.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/globePopupCredibility.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTierLabel, getTierColor, getBreakdownLabel } from '@/components/globe/credibilityHelpers';

describe('credibilityHelpers', () => {
  describe('getTierLabel', () => {
    it('returns correct label for each tier', () => {
      expect(getTierLabel('reference')).toBe('Reference');
      expect(getTierLabel('established')).toBe('Established');
      expect(getTierLabel('regional')).toBe('Regional');
      expect(getTierLabel('hyperlocal')).toBe('Hyperlocal');
      expect(getTierLabel('niche')).toBe('Niche');
    });
  });

  describe('getTierColor', () => {
    it('returns correct Tailwind class for each tier', () => {
      expect(getTierColor('reference')).toBe('text-blue-400');
      expect(getTierColor('established')).toBe('text-emerald-400');
      expect(getTierColor('regional')).toBe('text-teal-400');
      expect(getTierColor('hyperlocal')).toBe('text-amber-400');
      expect(getTierColor('niche')).toBe('text-slate-400');
    });
  });

  describe('getBreakdownLabel', () => {
    it('returns singular breakdown labels', () => {
      expect(getBreakdownLabel('reference', 1)).toBe('wire service');
      expect(getBreakdownLabel('established', 1)).toBe('national');
      expect(getBreakdownLabel('regional', 1)).toBe('regional');
      expect(getBreakdownLabel('hyperlocal', 1)).toBe('local');
      expect(getBreakdownLabel('niche', 1)).toBe('independent');
    });

    it('returns plural for wire services', () => {
      expect(getBreakdownLabel('reference', 2)).toBe('wire services');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: FAIL — module `@/components/globe/credibilityHelpers` not found

- [ ] **Step 3: Create credibilityHelpers module**

Create `src/components/globe/credibilityHelpers.ts`:

```typescript
import type { CredibilityTier } from '@/data/media-types';

const TIER_LABELS: Record<CredibilityTier, string> = {
  reference: 'Reference',
  established: 'Established',
  regional: 'Regional',
  hyperlocal: 'Hyperlocal',
  niche: 'Niche',
  unreliable: 'Unreliable',
};

const TIER_COLORS: Record<CredibilityTier, string> = {
  reference: 'text-blue-400',
  established: 'text-emerald-400',
  regional: 'text-teal-400',
  hyperlocal: 'text-amber-400',
  niche: 'text-slate-400',
  unreliable: 'text-red-400',
};

const BREAKDOWN_LABELS: Record<CredibilityTier, string> = {
  reference: 'wire service',
  established: 'national',
  regional: 'regional',
  hyperlocal: 'local',
  niche: 'independent',
  unreliable: 'unreliable',
};

export function getTierLabel(tier: CredibilityTier): string {
  return TIER_LABELS[tier];
}

export function getTierColor(tier: CredibilityTier): string {
  return TIER_COLORS[tier];
}

export function getBreakdownLabel(tier: CredibilityTier, count: number): string {
  const label = BREAKDOWN_LABELS[tier];
  if (tier === 'reference' && count > 1) return label + 's';
  return label;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Add tier badge to GlobePopup**

In `src/components/globe/GlobePopup.tsx`, add imports:

```typescript
import { resolveCredibilityByDomain, extractDomain } from '@/utils/credibilityService';
import { getTierLabel, getTierColor } from './credibilityHelpers';
import type { StoryCluster } from '@/utils/topicClustering';
```

Update the props interface:
```typescript
interface GlobePopupProps {
  article: NewsArticle;
  clusters: StoryCluster[];
  position: { x: number; y: number };
  onClose: () => void;
}
```

Destructure `clusters` in the component:
```typescript
export default function GlobePopup({ article, clusters, position, onClose }: GlobePopupProps) {
```

Add tier resolution after `const heatLevel`:
```typescript
const heatLevel = article.heatLevel || 0;
const { tier } = resolveCredibilityByDomain(extractDomain(article.source.url));
```

In the source line (the `<div>` at line 40-48), replace:
```tsx
{/* old */}
<span className="font-body text-xs text-ivory-200/60">
  {article.source.name}
</span>

{/* new */}
<span className="font-body text-xs text-ivory-200/60">
  {article.source.name}
</span>
<span className="font-body text-[10px] text-ivory-200/30">·</span>
<span className={`font-body text-[10px] ${getTierColor(tier)}`}>
  {getTierLabel(tier)}
</span>
```

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/components/globe/credibilityHelpers.ts src/components/globe/GlobePopup.tsx tests/components/globePopupCredibility.test.ts
git commit -m "feat: add credibility tier badge to globe popup"
```

---

### Task 3: Add source breakdown to GlobePopup

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx`
- Modify: `src/components/globe/credibilityHelpers.ts`
- Modify: `tests/components/globePopupCredibility.test.ts`

- [ ] **Step 1: Write the failing test for buildSourceBreakdown**

Add to `tests/components/globePopupCredibility.test.ts`:

```typescript
import { getTierLabel, getTierColor, getBreakdownLabel, buildSourceBreakdown } from '@/components/globe/credibilityHelpers';

describe('buildSourceBreakdown', () => {
  it('counts sources by tier', () => {
    const sourceDomains = new Map<string, string | undefined>([
      ['AFP', 'afp.com'],
      ['Reuters', 'reuters.com'],
      ['Le Monde', 'lemonde.fr'],
      ['Ouest-France', 'ouest-france.fr'],
    ]);
    // This test depends on the credibility registry resolving these domains.
    // We test the grouping logic, not the resolution.
    const result = buildSourceBreakdown(sourceDomains);
    expect(result.total).toBe(4);
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('returns empty for single source', () => {
    const sourceDomains = new Map<string, string | undefined>([
      ['AFP', 'afp.com'],
    ]);
    const result = buildSourceBreakdown(sourceDomains);
    expect(result.total).toBe(1);
    expect(result.summary).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: FAIL — `buildSourceBreakdown` not exported

- [ ] **Step 3: Implement buildSourceBreakdown**

Add to `src/components/globe/credibilityHelpers.ts`:

Note: `resolveCredibilityByDomain` and `TIER_WEIGHTS` are needed. Add them to the existing `credibilityService` import at the top of the file:

```typescript
import { resolveCredibilityByDomain, TIER_WEIGHTS } from '@/utils/credibilityService';

export function buildSourceBreakdown(
  sourceDomains: Map<string, string | undefined>
): { total: number; summary: string } {
  const total = sourceDomains.size;
  if (total <= 1) return { total, summary: '' };

  const tierCounts = new Map<CredibilityTier, number>();

  for (const [, domain] of sourceDomains) {
    const { tier } = resolveCredibilityByDomain(domain);
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  // Sort tiers by weight descending
  const sortedTiers = [...tierCounts.entries()]
    .sort(([a], [b]) => TIER_WEIGHTS[b] - TIER_WEIGHTS[a]);

  const parts = sortedTiers.map(
    ([tier, count]) => `${count} ${getBreakdownLabel(tier, count)}`
  );

  return { total, summary: parts.join(', ') };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: PASS

- [ ] **Step 5: Add source breakdown to GlobePopup UI**

In `src/components/globe/GlobePopup.tsx`, add import:
```typescript
import { getTierLabel, getTierColor, buildSourceBreakdown } from './credibilityHelpers';
```

Add cluster lookup after tier resolution:
```typescript
const cluster = clusters.find(c => c.articles.some(a => a.id === article.id));
const breakdown = cluster ? buildSourceBreakdown(cluster.sourceDomains) : null;
```

Replace the existing coverage badge (lines 44-48):
```tsx
{/* old */}
{article.coverage && article.coverage > 1 && (
  <span className="font-body text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
    {article.coverage} sources
  </span>
)}

{/* new */}
{breakdown && breakdown.total > 1 && (
  <span className="font-body text-[10px] text-ivory-200/40">
    Covered by {breakdown.total} sources: {breakdown.summary}
  </span>
)}
```

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/components/globe/credibilityHelpers.ts src/components/globe/GlobePopup.tsx tests/components/globePopupCredibility.test.ts
git commit -m "feat: add source breakdown with tier counts to globe popup"
```

---

### Task 4: Add cluster article list to GlobePopup

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx`
- Modify: `src/components/globe/credibilityHelpers.ts`
- Modify: `tests/components/globePopupCredibility.test.ts`

- [ ] **Step 1: Write the failing test for getClusterArticles**

Add to `tests/components/globePopupCredibility.test.ts`:

```typescript
import { getTierLabel, getTierColor, getBreakdownLabel, buildSourceBreakdown, getClusterArticles } from '@/components/globe/credibilityHelpers';
import type { NewsArticle } from '@/types/news';

describe('getClusterArticles', () => {
  const makeArticle = (id: string, name: string, url: string): NewsArticle => ({
    id,
    title: `Article by ${name}`,
    url: `https://${url}/article`,
    source: { name, url: `https://${url}` },
    publishedAt: new Date().toISOString(),
  } as NewsArticle);

  it('excludes the current article', () => {
    const articles = [
      makeArticle('1', 'AFP', 'afp.com'),
      makeArticle('2', 'Reuters', 'reuters.com'),
      makeArticle('3', 'Le Monde', 'lemonde.fr'),
    ];
    const result = getClusterArticles(articles, '1');
    expect(result.map(a => a.article.id)).toEqual(['2', '3']);
  });

  it('limits to 5 items', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(String(i), `Source ${i}`, `source${i}.com`)
    );
    const result = getClusterArticles(articles, '0');
    expect(result.length).toBe(5);
  });

  it('returns remaining count when more than 5', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(String(i), `Source ${i}`, `source${i}.com`)
    );
    const result = getClusterArticles(articles, '0');
    expect(result.length).toBe(5);
    // 7 remaining articles (excluding current), showing 5 → 2 more
  });

  it('sorts by tier weight descending (reference before niche)', () => {
    const articles = [
      makeArticle('1', 'Current', 'current.com'),
      makeArticle('2', 'Unknown Blog', 'randomblog.xyz'),  // niche (fallback)
      makeArticle('3', 'Reuters', 'reuters.com'),           // reference
    ];
    const result = getClusterArticles(articles, '1');
    // Reuters (reference, weight 1.0) should sort before unknown blog (niche, weight 0.4)
    expect(result[0].article.id).toBe('3');
    expect(result[1].article.id).toBe('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: FAIL — `getClusterArticles` not exported

- [ ] **Step 3: Implement getClusterArticles**

Add to `src/components/globe/credibilityHelpers.ts`. Note: `resolveCredibilityByDomain`, `TIER_WEIGHTS`, and `CredibilityTier` are already imported from Tasks 2-3.

```typescript
import type { NewsArticle } from '@/types/news';

const MAX_CLUSTER_ITEMS = 5;

export interface ClusterArticleItem {
  article: NewsArticle;
  tier: CredibilityTier;
  tierLabel: string;
  tierColor: string;
}

export function getClusterArticles(
  articles: NewsArticle[],
  currentArticleId: string
): ClusterArticleItem[] {
  const others = articles.filter(a => a.id !== currentArticleId);

  // Resolve tier for each, sort by weight descending
  const withTier = others.map(article => {
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

  return withTier.slice(0, MAX_CLUSTER_ITEMS).map(({ article, tier, tierLabel, tierColor }) => ({
    article,
    tier,
    tierLabel,
    tierColor,
  }));
}

function extractDomainFromArticle(article: NewsArticle): string | undefined {
  try {
    const url = article.source.url || article.url;
    if (!url) return undefined;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: PASS

- [ ] **Step 5: Add cluster article list to GlobePopup UI**

In `src/components/globe/GlobePopup.tsx`, add import:
```typescript
import { getTierLabel, getTierColor, buildSourceBreakdown, getClusterArticles } from './credibilityHelpers';
```

Add cluster articles computation after the breakdown:
```typescript
const clusterArticles = cluster ? getClusterArticles(cluster.articles, article.id) : [];
const remainingCount = cluster
  ? cluster.articles.filter(a => a.id !== article.id).length - clusterArticles.length
  : 0;
```

Add the cluster article list JSX after the source breakdown div, before the heat bar:
```tsx
{/* Cluster article list */}
{clusterArticles.length > 0 && (
  <div className="mb-3">
    <p className="font-body text-[10px] text-ivory-200/40 mb-1.5">Other coverage:</p>
    <div className="space-y-1">
      {clusterArticles.map(({ article: clusterArticle, tierLabel, tierColor }) => (
        <a
          key={clusterArticle.id}
          href={clusterArticle.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 group"
        >
          <span className="font-body text-[10px] text-ivory-200/60 truncate group-hover:text-ivory-50 transition-colors">
            <span className="text-ivory-200/80">{clusterArticle.source.name}</span>
            {' — '}
            <span className="italic">"{clusterArticle.title}"</span>
          </span>
          <span className={`font-body text-[9px] flex-shrink-0 ${tierColor}`}>
            {tierLabel}
          </span>
        </a>
      ))}
      {remainingCount > 0 && (
        <p className="font-body text-[9px] text-ivory-200/30">
          and {remainingCount} more source{remainingCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 6: Adjust popup max height**

The popup currently constrains via the `top` position calculation. Update the top calculation to account for the taller popup:

```typescript
// old
top: Math.min(position.y, window.innerHeight - 300),

// new
top: Math.min(position.y, window.innerHeight - 450),
```

Add `max-h-[70vh] overflow-y-auto` to the popup container div classes:
```typescript
// old
className="fixed z-50 w-80 bg-navy-900/95 backdrop-blur-md border border-amber-500/20 rounded-lg shadow-2xl shadow-black/50 p-4"

// new
className="fixed z-50 w-80 max-h-[70vh] overflow-y-auto bg-navy-900/95 backdrop-blur-md border border-amber-500/20 rounded-lg shadow-2xl shadow-black/50 p-4"
```

- [ ] **Step 7: Verify build and run all tests**

Run: `npx tsc --noEmit && npx vitest run tests/components/globePopupCredibility.test.ts`
Expected: No type errors, all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/components/globe/credibilityHelpers.ts src/components/globe/GlobePopup.tsx tests/components/globePopupCredibility.test.ts
git commit -m "feat: add cluster article list with tier badges to globe popup"
```

---

## Chunk 2: HowItWorks Explainer + Final Integration

### Task 5: Create HowItWorks component

**Files:**
- Create: `src/components/HowItWorks.tsx`

- [ ] **Step 1: Create the HowItWorks component**

Create `src/components/HowItWorks.tsx`:

```tsx
export default function HowItWorks() {
  return (
    <section className="w-full bg-navy-900 border-t border-ivory-200/5">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Column 1: Source Credibility */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">
              {/* TODO: rewrite copy */}
              Source credibility
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">
              {/* TODO: rewrite copy */}
              Every source is classified into one of six credibility tiers —
              from wire services like AFP and Reuters down to independent outlets.
              This tier determines how much weight a source carries in our heat calculation.
            </p>
          </div>

          {/* Column 2: Coverage Patterns */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">
              {/* TODO: rewrite copy */}
              Coverage patterns
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">
              {/* TODO: rewrite copy */}
              When multiple independent sources cover the same story, the heat goes up.
              A story reported by three wire services and two regional papers
              is more significant than one covered by a single outlet.
            </p>
          </div>

          {/* Column 3: Emerging Stories */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">
              {/* TODO: rewrite copy */}
              Emerging stories
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">
              {/* TODO: rewrite copy */}
              Our convergence bonus detects when unrelated sources start covering the
              same event simultaneously — a signal that something important is developing,
              even before major outlets pick it up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/HowItWorks.tsx
git commit -m "feat: add static HowItWorks explainer section"
```

---

### Task 6: Render HowItWorks in Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx:436,443`

- [ ] **Step 1: Import and render HowItWorks**

In `src/pages/Index.tsx`, add import:
```typescript
import HowItWorks from '../components/HowItWorks';
```

Add `<HowItWorks />` after `<NewsDemo>` (line 436) and before the soft gate / `</main>` (line 438):

```tsx
<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} />

<HowItWorks />

{/* Soft gate */}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: render HowItWorks section on homepage between feed and footer"
```

---

### Task 7: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new `globePopupCredibility.test.ts`

- [ ] **Step 2: Run dev server and visually verify**

Run: `npm run dev`

Verify:
1. Globe popup shows tier badge next to source name (e.g. "AFP · Reference")
2. Globe popup shows source breakdown when coverage > 1
3. Globe popup shows cluster article list with clickable links
4. HowItWorks section appears below the feed
5. Popup scrolls if content exceeds viewport

- [ ] **Step 3: Final commit if any fixes needed**

If any visual or functional fixes are needed, commit them:
```bash
git add -A
git commit -m "fix: polish credibility visibility UI"
```
