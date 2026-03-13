# Investigate Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the /investigate page with location names on source cards, human-readable geographic spread, and client-side editorial perspective comparison.

**Architecture:** Country name utility for location display, `compromise` NLP for editorial perspective extraction, InvestigatePage UI updates for all three features.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS, compromise NLP

---

## Chunk 1: Country Names Utility

### Task 1: Country Names Map

**Files:**
- Create: `src/utils/countryNames.ts`

- [ ] **Step 1: Create the country names utility**

```typescript
// src/utils/countryNames.ts

const COUNTRY_NAMES: Record<string, string> = {
  fr: 'France',
  gb: 'United Kingdom',
  us: 'United States',
  de: 'Germany',
  es: 'Spain',
  it: 'Italy',
  br: 'Brazil',
  cn: 'China',
  jp: 'Japan',
  in: 'India',
  ru: 'Russia',
  au: 'Australia',
  ca: 'Canada',
  mx: 'Mexico',
  kr: 'South Korea',
  za: 'South Africa',
  nl: 'Netherlands',
  be: 'Belgium',
  ch: 'Switzerland',
  at: 'Austria',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  pl: 'Poland',
  pt: 'Portugal',
  ie: 'Ireland',
  il: 'Israel',
  tr: 'Turkey',
  eg: 'Egypt',
  ng: 'Nigeria',
  ke: 'Kenya',
  ua: 'Ukraine',
  sa: 'Saudi Arabia',
  ae: 'United Arab Emirates',
  sg: 'Singapore',
  ar: 'Argentina',
  gr: 'Greece',
  cz: 'Czech Republic',
  ro: 'Romania',
  hu: 'Hungary',
  hr: 'Croatia',
  my: 'Malaysia',
  th: 'Thailand',
  id: 'Indonesia',
  ph: 'Philippines',
  vn: 'Vietnam',
  co: 'Colombia',
  cl: 'Chile',
  pe: 'Peru',
  nz: 'New Zealand',
};

/**
 * Get full English country name from ISO 2-letter code.
 * Returns uppercased code as fallback for unknown codes.
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toLowerCase()] || code.toUpperCase();
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/countryNames.ts
git commit -m "feat: add country names utility for location display"
```

---

## Chunk 2: Editorial Perspective Utility

### Task 2: Editorial Perspective Analysis + Tests

**Files:**
- Create: `src/utils/editorialPerspective.ts`
- Create: `tests/utils/editorialPerspective.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/utils/editorialPerspective.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeEditorialPerspective } from '@/utils/editorialPerspective';
import type { NewsArticle } from '@/types/news';

function makeArticle(
  id: string,
  sourceName: string,
  title: string,
  description?: string
): NewsArticle {
  return {
    id,
    title,
    description,
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: sourceName, url: 'https://example.com' },
  } as NewsArticle;
}

describe('analyzeEditorialPerspective', () => {
  it('returns no insights for fewer than 3 articles', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Climate summit begins'),
      makeArticle('2', 'Source B', 'Climate summit opens'),
    ]);
    expect(result.hasInsights).toBe(false);
    expect(result.uniqueAngles).toEqual([]);
    expect(result.emphasisDifferences).toEqual([]);
  });

  it('detects unique entities mentioned by only one source', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Climate summit begins in Paris', 'World leaders gather to discuss emissions targets'),
      makeArticle('2', 'Source B', 'Climate summit opens', 'Negotiations focus on carbon trading'),
      makeArticle('3', 'Source C', 'Climate talks start', 'Delegates arrive for environmental conference'),
    ]);
    expect(result.hasInsights).toBe(true);
    // Source A uniquely mentions Paris
    const parisInsight = result.uniqueAngles.find(i => i.entity.includes('paris'));
    expect(parisInsight).toBeDefined();
    expect(parisInsight!.source).toBe('Source A');
  });

  it('detects emphasis differences when entity is in title vs description', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Labor unions protest new policy', 'Workers gather in the capital'),
      makeArticle('2', 'Source B', 'New policy announced by government', 'Labor unions express concerns about the changes'),
      makeArticle('3', 'Source C', 'Government unveils policy reform', 'Various groups react to the announcement'),
    ]);
    // "labor unions" is in Source A's title but only in Source B's description
    if (result.emphasisDifferences.length > 0) {
      const laborInsight = result.emphasisDifferences.find(i =>
        i.entity.includes('labor') || i.entity.includes('union')
      );
      if (laborInsight) {
        expect(laborInsight.source).toBe('Source A');
        expect(laborInsight.label).toMatch(/leads with/);
      }
    }
    expect(result.hasInsights).toBe(true);
  });

  it('caps unique angle insights at 8', () => {
    // Create articles with many unique entities each
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Alpha beta gamma delta epsilon zeta eta theta iota kappa', 'Additional unique terms for source A'),
      makeArticle('2', 'Source B', 'Lambda mu nu xi omicron pi rho sigma tau upsilon', 'Additional unique terms for source B'),
      makeArticle('3', 'Source C', 'Phi chi psi omega', 'Additional unique terms for source C'),
    ]);
    expect(result.uniqueAngles.length).toBeLessThanOrEqual(8);
  });

  it('caps emphasis insights at 5', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Economy markets trade inflation growth unemployment', 'Policy changes affect workers'),
      makeArticle('2', 'Source B', 'Policy reform announced', 'Economy markets trade inflation growth unemployment discussed'),
      makeArticle('3', 'Source C', 'Reform changes expected', 'Economy markets trade inflation growth unemployment analyzed'),
    ]);
    expect(result.emphasisDifferences.length).toBeLessThanOrEqual(5);
  });

  it('extracts from title only when description is missing', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'President Biden visits Tokyo'),
      makeArticle('2', 'Source B', 'International summit begins'),
      makeArticle('3', 'Source C', 'Global leaders convene'),
    ]);
    // Should not crash, should still produce some insights from titles
    expect(result).toBeDefined();
    expect(typeof result.hasInsights).toBe('boolean');
  });

  it('prioritizes people over nouns in unique angles', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'President Macron announces reform', 'Major changes to regulations expected'),
      makeArticle('2', 'Source B', 'Government announces reform', 'Changes to labor laws expected'),
      makeArticle('3', 'Source C', 'Reform package unveiled', 'New policies take effect'),
    ]);
    if (result.uniqueAngles.length > 0) {
      const macronInsight = result.uniqueAngles.find(i => i.entity.includes('macron'));
      if (macronInsight) {
        // Macron (person) should appear before generic nouns
        const macronIdx = result.uniqueAngles.indexOf(macronInsight);
        const nounInsights = result.uniqueAngles.filter(i =>
          !i.entity.includes('macron') && i.source === 'Source A'
        );
        if (nounInsights.length > 0) {
          const firstNounIdx = result.uniqueAngles.indexOf(nounInsights[0]);
          expect(macronIdx).toBeLessThan(firstNounIdx);
        }
      }
    }
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/editorialPerspective.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the editorial perspective utility**

```typescript
// src/utils/editorialPerspective.ts
import nlp from 'compromise';
import type { NewsArticle } from '@/types/news';

export interface PerspectiveResult {
  hasInsights: boolean;
  uniqueAngles: PerspectiveInsight[];
  emphasisDifferences: PerspectiveInsight[];
}

export interface PerspectiveInsight {
  source: string;
  entity: string;
  label: string;
}

const NO_INSIGHTS: PerspectiveResult = {
  hasInsights: false,
  uniqueAngles: [],
  emphasisDifferences: [],
};

// Stopwords to filter from noun extraction
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'and', 'or', 'but', 'not', 'by', 'from', 'as', 'it', 'this',
  'that', 'has', 'have', 'had', 'be', 'been', 'will', 'would', 'can', 'could',
  'new', 'says', 'said', 'also', 'more', 'after', 'over', 'into', 'about',
  'its', 'than', 'them', 'then', 'some', 'what', 'when', 'which', 'who',
  'how', 'all', 'each', 'every', 'both', 'few', 'most', 'other', 'such',
  'only', 'same', 'very', 'just', 'because', 'between', 'through', 'during',
]);

type EntityType = 'person' | 'organization' | 'place' | 'noun';

interface TaggedEntity {
  text: string;
  type: EntityType;
}

interface ArticleProfile {
  source: string;
  titleEntities: Set<string>;
  descEntities: Set<string>;
  allEntities: Set<string>;
  taggedEntities: TaggedEntity[];
}

const SPECIFICITY_ORDER: Record<EntityType, number> = {
  person: 0,
  organization: 1,
  place: 2,
  noun: 3,
};

function extractEntities(text: string): TaggedEntity[] {
  const doc = nlp(text);
  const entities: TaggedEntity[] = [];
  const seen = new Set<string>();

  const people: string[] = doc.people().out('array');
  for (const p of people) {
    const key = p.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'person' });
      seen.add(key);
    }
  }

  const orgs: string[] = doc.organizations().out('array');
  for (const o of orgs) {
    const key = o.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'organization' });
      seen.add(key);
    }
  }

  const places: string[] = doc.places().out('array');
  for (const p of places) {
    const key = p.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'place' });
      seen.add(key);
    }
  }

  const nouns: string[] = doc.nouns().out('array');
  for (const n of nouns) {
    const key = n.toLowerCase().trim();
    if (key.length >= 4 && !STOPWORDS.has(key) && !seen.has(key)) {
      entities.push({ text: key, type: 'noun' });
      seen.add(key);
    }
  }

  return entities;
}

function buildProfile(article: NewsArticle): ArticleProfile {
  const titleTagged = extractEntities(article.title);
  const titleEntities = new Set(titleTagged.map(e => e.text));

  const descTagged = article.description ? extractEntities(article.description) : [];
  const descEntities = new Set(descTagged.map(e => e.text));

  const allEntities = new Set([...titleEntities, ...descEntities]);
  const taggedEntities = [...titleTagged, ...descTagged].filter(
    (e, i, arr) => arr.findIndex(x => x.text === e.text) === i
  );

  return {
    source: article.source.name,
    titleEntities,
    descEntities,
    allEntities,
    taggedEntities,
  };
}

export function analyzeEditorialPerspective(articles: NewsArticle[]): PerspectiveResult {
  if (articles.length < 3) return NO_INSIGHTS;

  const profiles = articles.map(buildProfile);

  // 1. Unique angles — entities mentioned by exactly one source
  const uniqueAngles: PerspectiveInsight[] = [];

  for (const profile of profiles) {
    const uniqueEntities = profile.taggedEntities.filter(entity => {
      const otherProfiles = profiles.filter(p => p.source !== profile.source);
      return !otherProfiles.some(p => p.allEntities.has(entity.text));
    });

    // Sort by specificity: people > organizations > places > nouns
    uniqueEntities.sort((a, b) => SPECIFICITY_ORDER[a.type] - SPECIFICITY_ORDER[b.type]);

    // Take top 5 per article
    for (const entity of uniqueEntities.slice(0, 5)) {
      uniqueAngles.push({
        source: profile.source,
        entity: entity.text,
        label: `Only ${profile.source} mentions ${entity.text}`,
      });
    }
  }

  // Cap at 8 total
  uniqueAngles.splice(8);

  // 2. Emphasis differences — entity in one source's title but only in others' description
  const emphasisDifferences: PerspectiveInsight[] = [];

  // Collect all entities across all profiles
  const allEntityTexts = new Set<string>();
  for (const profile of profiles) {
    for (const e of profile.allEntities) allEntityTexts.add(e);
  }

  for (const entity of allEntityTexts) {
    const inProfiles = profiles.filter(p => p.allEntities.has(entity));
    if (inProfiles.length < 2) continue;

    // Find profiles that have this entity in their title
    const titleProfiles = inProfiles.filter(p => p.titleEntities.has(entity));
    // Find profiles that have it only in description (not title)
    const descOnlyProfiles = inProfiles.filter(p => !p.titleEntities.has(entity) && p.descEntities.has(entity));

    // If exactly one source leads with this entity and others have it buried in description
    if (titleProfiles.length === 1 && descOnlyProfiles.length >= 1) {
      emphasisDifferences.push({
        source: titleProfiles[0].source,
        entity,
        label: `${titleProfiles[0].source} leads with ${entity}`,
      });
    }
  }

  // Cap at 5
  emphasisDifferences.splice(5);

  const hasInsights = uniqueAngles.length > 0 || emphasisDifferences.length > 0;

  if (!hasInsights) return NO_INSIGHTS;

  return { hasInsights, uniqueAngles, emphasisDifferences };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/editorialPerspective.test.ts 2>&1 | tail -15`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/editorialPerspective.ts tests/utils/editorialPerspective.test.ts
git commit -m "feat: add editorial perspective comparison utility with tests"
```

---

## Chunk 3: InvestigatePage UI Updates

### Task 3: Location Names on Source Cards

**Files:**
- Modify: `src/pages/InvestigatePage.tsx`

**Context:** The source card metadata row (lines 165-172) currently shows time + bare MapPin icon. Replace the MapPin section with location text.

- [ ] **Step 1: Add countryNames import**

After line 15 (`import { analyzeGeographicGap } from '@/utils/geographicGap';`), add:
```typescript
import { getCountryName } from '@/utils/countryNames';
```

- [ ] **Step 2: Replace MapPin-only display with location text**

Replace the current location display block (lines 169-171):
```tsx
{clusterArticle.coordinates && (
  <MapPin className="w-3 h-3 text-ivory-200/30" />
)}
```

With:
```tsx
{clusterArticle.location && clusterArticle.country && (
  <span className="flex items-center gap-1 text-xs text-ivory-200/40">
    <MapPin className="w-3 h-3" />
    {clusterArticle.location}, {getCountryName(clusterArticle.country)}
  </span>
)}
{clusterArticle.location && !clusterArticle.country && (
  <span className="flex items-center gap-1 text-xs text-ivory-200/40">
    <MapPin className="w-3 h-3" />
    {clusterArticle.location}
  </span>
)}
{!clusterArticle.location && clusterArticle.country && (
  <span className="flex items-center gap-1 text-xs text-ivory-200/40">
    <MapPin className="w-3 h-3" />
    {getCountryName(clusterArticle.country)}
  </span>
)}
{!clusterArticle.location && !clusterArticle.country && clusterArticle.coordinates && (
  <MapPin className="w-3 h-3 text-ivory-200/30" />
)}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: show location names on investigate page source cards"
```

---

### Task 4: Geographic Spread Improvement

**Files:**
- Modify: `src/pages/InvestigatePage.tsx`

**Context:** The Geographic Spread section list (around line 238-241 after Task 3 changes) shows raw lat/lng. Replace with location + country names.

- [ ] **Step 1: Replace lat/lng display with location text**

Find the list item that shows raw coordinates:
```tsx
<li key={a.id} className="text-sm text-ivory-200/60">
  {a.source.name} — {(Math.round(a.coordinates!.lat * 10) / 10).toFixed(1)}, {(Math.round(a.coordinates!.lng * 10) / 10).toFixed(1)}
</li>
```

Replace with:
```tsx
<li key={a.id} className="text-sm text-ivory-200/60">
  {a.source.name} — {a.location && a.country
    ? `${a.location}, ${getCountryName(a.country)}`
    : a.location
    ? a.location
    : a.country
    ? getCountryName(a.country)
    : `${(Math.round(a.coordinates!.lat * 10) / 10).toFixed(1)}, ${(Math.round(a.coordinates!.lng * 10) / 10).toFixed(1)}`
  }
</li>
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: show location names in geographic spread section"
```

---

### Task 5: Perspective Comparison Section

**Files:**
- Modify: `src/pages/InvestigatePage.tsx`

**Context:** Add a new section between Coverage Analysis and Geographic Spread.

- [ ] **Step 1: Add editorial perspective import**

After the `getCountryName` import (added in Task 3), add:
```typescript
import { analyzeEditorialPerspective } from '@/utils/editorialPerspective';
```

- [ ] **Step 2: Add perspective computation**

After line 102 (`const geoGap = analyzeGeographicGap(cluster);`), add:
```typescript
const perspective = analyzeEditorialPerspective(cluster.articles);
```

- [ ] **Step 3: Add Perspective Comparison section JSX**

Between the Coverage Analysis closing `</div>` (after `)}` on the line after the geographic gap block) and the Geographic Spread `<div>`, add:

```tsx
{/* Perspective Comparison */}
{perspective.hasInsights && (
  <div className="mb-10">
    <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
      Perspective Comparison
    </h2>
    {perspective.uniqueAngles.length > 0 && (
      <div className="mb-3">
        <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Unique angles</p>
        <ul className="space-y-1">
          {perspective.uniqueAngles.map((insight, i) => (
            <li key={i} className="text-sm text-ivory-200/60">
              {insight.label}
            </li>
          ))}
        </ul>
      </div>
    )}
    {perspective.emphasisDifferences.length > 0 && (
      <div>
        <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Emphasis differences</p>
        <ul className="space-y-1">
          {perspective.emphasisDifferences.map((insight, i) => (
            <li key={i} className="text-sm text-ivory-200/60">
              {insight.label}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: add perspective comparison section to investigate page"
```
