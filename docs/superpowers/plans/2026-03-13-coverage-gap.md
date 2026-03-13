# Coverage Gap Visualization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface when a story cluster is missing coverage from high-credibility source tiers (wire services, national outlets), with a one-line indicator in GlobePopup and a fuller section on InvestigatePage.

**Architecture:** Pure utility `analyzeCoverageGap(cluster)` resolves each article's tier via existing `resolveCredibilityByDomain`, checks for absent reference/established tiers and ratio imbalance. Results rendered in GlobePopup (teaser) and InvestigatePage (detail).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Lucide icons

---

## Chunk 1: Coverage Gap Feature

### Task 1: Create `analyzeCoverageGap` utility with tests

**Files:**
- Create: `src/utils/coverageGap.ts`
- Create: `tests/utils/coverageGap.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/utils/coverageGap.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(id: string, sourceUrl: string): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://${sourceUrl}/article-${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://${sourceUrl}` },
  } as NewsArticle;
}

function makeCluster(articles: NewsArticle[]): StoryCluster {
  return {
    articles,
    terms: new Set<string>(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel: 50,
    coverage: articles.length,
  };
}

describe('analyzeCoverageGap', () => {
  it('returns no gap when both reference and established are present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),      // reference
      makeArticle('2', 'lemonde.fr'),        // established
      makeArticle('3', 'randomblog.xyz'),    // niche
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(false);
    expect(result.missingTiers).toEqual([]);
    expect(result.gapLabel).toBe('');
    expect(result.imbalanceNote).toBeNull();
  });

  it('flags both reference and established missing', () => {
    const cluster = makeCluster([
      makeArticle('1', 'randomblog.xyz'),
      makeArticle('2', 'anotherblog.com'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toContain('reference');
    expect(result.missingTiers).toContain('established');
    expect(result.gapLabel).toBe('No wire service or national coverage');
  });

  it('flags only reference missing when established is present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'lemonde.fr'),        // established
      makeArticle('2', 'randomblog.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toEqual(['reference']);
    expect(result.gapLabel).toBe('No wire service coverage');
  });

  it('flags only established missing when reference is present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),       // reference
      makeArticle('2', 'randomblog.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toEqual(['established']);
    expect(result.gapLabel).toBe('No national outlet coverage');
  });

  it('detects imbalance when top tiers < 20% and bottom tiers > 60%', () => {
    // 1 reference + 9 niche = 10% top tier, 90% bottom tier
    const articles = [
      makeArticle('0', 'reuters.com'),  // reference
      ...Array.from({ length: 9 }, (_, i) =>
        makeArticle(String(i + 1), `blog${i}.xyz`)  // niche
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.imbalanceNote).toBe('Coverage is predominantly from independent/local sources');
  });

  it('does not flag imbalance when top tiers >= 20%', () => {
    // 2 reference + 3 niche = 40% top tier
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),
      makeArticle('2', 'afp.com'),
      makeArticle('3', 'blog1.xyz'),
      makeArticle('4', 'blog2.xyz'),
      makeArticle('5', 'blog3.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.imbalanceNote).toBeNull();
  });

  it('flags imbalance independently of missing tiers', () => {
    // Both reference and established present, but heavily outnumbered
    // 1 reference + 1 established + 8 niche = 20% top, 80% bottom
    // Top tiers = 2/10 = 20%, NOT less than 20%, so imbalance should NOT fire
    const articles = [
      makeArticle('0', 'reuters.com'),
      makeArticle('1', 'lemonde.fr'),
      ...Array.from({ length: 8 }, (_, i) =>
        makeArticle(String(i + 2), `blog${i}.xyz`)
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    // 20% is NOT less than 20%, so imbalance should not fire
    expect(result.missingTiers).toEqual([]);
    expect(result.imbalanceNote).toBeNull();
  });

  it('returns hasGap true when only imbalance fires (no missing tiers)', () => {
    // 1 reference + 1 established + 18 niche = 10% top, 90% bottom
    const articles = [
      makeArticle('0', 'reuters.com'),
      makeArticle('1', 'lemonde.fr'),
      ...Array.from({ length: 18 }, (_, i) =>
        makeArticle(String(i + 2), `blog${i}.xyz`)
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    expect(result.missingTiers).toEqual([]);
    expect(result.hasGap).toBe(true);
    expect(result.imbalanceNote).toBe('Coverage is predominantly from independent/local sources');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/coverageGap.test.ts`
Expected: FAIL — module `@/utils/coverageGap` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/utils/coverageGap.ts
import type { CredibilityTier } from '@/data/media-types';
import type { StoryCluster } from './topicClustering';
import { resolveCredibilityByDomain, extractDomain } from './credibilityService';

export interface CoverageGapResult {
  hasGap: boolean;
  missingTiers: CredibilityTier[];
  gapLabel: string;
  imbalanceNote: string | null;
}

const NO_GAP: CoverageGapResult = {
  hasGap: false,
  missingTiers: [],
  gapLabel: '',
  imbalanceNote: null,
};

export function analyzeCoverageGap(cluster: StoryCluster): CoverageGapResult {
  const tierCounts = new Map<CredibilityTier, number>();

  for (const article of cluster.articles) {
    const domain = extractDomain(article.source.url) ?? extractDomain(article.url);
    const { tier } = resolveCredibilityByDomain(domain);
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  const total = cluster.articles.length;
  if (total === 0) return NO_GAP;

  // Primary signal: missing top tiers
  const hasReference = (tierCounts.get('reference') || 0) > 0;
  const hasEstablished = (tierCounts.get('established') || 0) > 0;

  const missingTiers: CredibilityTier[] = [];
  let gapLabel = '';

  if (!hasReference && !hasEstablished) {
    missingTiers.push('reference', 'established');
    gapLabel = 'No wire service or national coverage';
  } else if (!hasReference) {
    missingTiers.push('reference');
    gapLabel = 'No wire service coverage';
  } else if (!hasEstablished) {
    missingTiers.push('established');
    gapLabel = 'No national outlet coverage';
  }

  // Secondary signal: imbalance
  const topCount = (tierCounts.get('reference') || 0) + (tierCounts.get('established') || 0);
  const bottomCount = (tierCounts.get('niche') || 0) + (tierCounts.get('hyperlocal') || 0);
  const topRatio = topCount / total;
  const bottomRatio = bottomCount / total;

  const imbalanceNote =
    topRatio < 0.2 && bottomRatio > 0.6
      ? 'Coverage is predominantly from independent/local sources'
      : null;

  const hasGap = missingTiers.length > 0 || imbalanceNote !== null;

  if (!hasGap) return NO_GAP;

  return { hasGap, missingTiers, gapLabel, imbalanceNote };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/coverageGap.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/coverageGap.ts tests/utils/coverageGap.test.ts
git commit -m "feat: add analyzeCoverageGap utility for tier gap detection"
```

---

### Task 2: Add gap indicator to GlobePopup

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx`

- [ ] **Step 1: Add import and gap computation**

In `src/components/globe/GlobePopup.tsx`:

Add import at top (after the existing lucide import line):
```typescript
import { AlertTriangle } from 'lucide-react';
```

Update the existing lucide import to include AlertTriangle — the current import is:
```typescript
import { ExternalLink, Flame, MapPin } from 'lucide-react';
```
Change to:
```typescript
import { AlertTriangle, ExternalLink, Flame, MapPin } from 'lucide-react';
```

Add import for the gap utility:
```typescript
import { analyzeCoverageGap } from '@/utils/coverageGap';
```

Inside the component function, after the `showInvestigate` variable (after line 31), add:
```typescript
const coverageGap = cluster ? analyzeCoverageGap(cluster) : null;
```

- [ ] **Step 2: Add gap indicator line to JSX**

Add the gap indicator after the source breakdown `<div>` (after line 82, the closing `</div>` of the "Source + reach badge" section) and before the topic tags section:

```tsx
{/* Coverage gap indicator */}
{coverageGap?.hasGap && (
  <div className="flex items-center gap-1 mb-2">
    <AlertTriangle className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
    <span className="font-body text-[10px] text-amber-400/70">
      {coverageGap.gapLabel}
    </span>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/globe/GlobePopup.tsx
git commit -m "feat: add coverage gap indicator to GlobePopup"
```

---

### Task 3: Add Coverage Analysis section to InvestigatePage

**Files:**
- Modify: `src/pages/InvestigatePage.tsx`

- [ ] **Step 1: Add imports**

In `src/pages/InvestigatePage.tsx`:

Add to the lucide import (line 4):
```typescript
import { AlertTriangle, MapPin } from 'lucide-react';
```

Add import for the gap utility:
```typescript
import { analyzeCoverageGap } from '@/utils/coverageGap';
```

- [ ] **Step 2: Add gap computation**

Inside the `InvestigatePage` component, after the `articlesWithCoords` variable (after line 98), add:

```typescript
const coverageGap = analyzeCoverageGap(cluster);
```

- [ ] **Step 3: Add Coverage Analysis section to JSX**

Add the Coverage Analysis section between the source list `</div>` (after line 176) and the Geographic Spread `<div>` (line 178). Insert:

```tsx
{/* Coverage Analysis */}
{coverageGap.hasGap && (
  <div className="mb-10">
    <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
      Coverage Analysis
    </h2>
    <div className="flex items-center gap-2 text-sm text-amber-400/80">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{coverageGap.gapLabel}</span>
    </div>
    {coverageGap.imbalanceNote && (
      <p className="text-sm text-ivory-200/40 mt-2">
        {coverageGap.imbalanceNote}
      </p>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: add Coverage Analysis section to InvestigatePage"
```
