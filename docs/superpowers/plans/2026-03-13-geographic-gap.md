# Geographic Gap Detection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface when a story cluster is covered from some geographic regions but missing from others, at both country and administrative-region levels.

**Architecture:** A pure utility function `analyzeGeographicGap(cluster)` groups articles by country and resolves coordinates to administrative regions (starting with France's 13 regions). Results shown alongside existing credibility gap in GlobePopup (country-level teaser) and InvestigatePage (full regional detail).

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS, Lucide icons

---

## Chunk 1: Core Logic & Data

### Task 1: Administrative Regions Data

**Files:**
- Create: `src/data/administrative-regions.ts`

- [ ] **Step 1: Create the administrative regions data file**

```typescript
// src/data/administrative-regions.ts

export interface AdminRegion {
  name: string;
  country: string;  // lowercase ISO 2-letter code — must match article.country
  lat: number;
  lng: number;
  major: boolean;
}

export const ADMIN_REGIONS: AdminRegion[] = [
  // France — 13 metropolitan regions
  { name: 'Île-de-France', country: 'fr', lat: 48.8566, lng: 2.3522, major: true },
  { name: 'Auvergne-Rhône-Alpes', country: 'fr', lat: 45.7640, lng: 4.8357, major: true },
  { name: 'Provence-Alpes-Côte d\'Azur', country: 'fr', lat: 43.2965, lng: 5.3698, major: true },
  { name: 'Occitanie', country: 'fr', lat: 43.6047, lng: 1.4442, major: true },
  { name: 'Nouvelle-Aquitaine', country: 'fr', lat: 44.8378, lng: -0.5792, major: true },
  { name: 'Hauts-de-France', country: 'fr', lat: 50.6292, lng: 3.0573, major: true },
  { name: 'Grand Est', country: 'fr', lat: 48.5734, lng: 7.7521, major: false },
  { name: 'Pays de la Loire', country: 'fr', lat: 47.2184, lng: -1.5536, major: false },
  { name: 'Bretagne', country: 'fr', lat: 48.1173, lng: -1.6778, major: false },
  { name: 'Normandie', country: 'fr', lat: 49.4432, lng: 1.0999, major: false },
  { name: 'Bourgogne-Franche-Comté', country: 'fr', lat: 47.3220, lng: 5.0415, major: false },
  { name: 'Centre-Val de Loire', country: 'fr', lat: 47.9029, lng: 1.9093, major: false },
  { name: 'Corse', country: 'fr', lat: 41.9192, lng: 8.7386, major: false },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/data/administrative-regions.ts 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/data/administrative-regions.ts
git commit -m "feat: add France administrative regions data for geographic gap detection"
```

---

### Task 2: Geographic Gap Utility + Tests

**Files:**
- Create: `src/utils/geographicGap.ts`
- Create: `tests/utils/geographicGap.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/utils/geographicGap.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeGeographicGap, resolveRegion } from '@/utils/geographicGap';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(
  id: string,
  overrides: Partial<NewsArticle> = {}
): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://example.com/article-${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://example.com` },
    ...overrides,
  } as NewsArticle;
}

function makeCluster(
  articles: NewsArticle[],
  heatLevel: number = 50
): StoryCluster {
  return {
    articles,
    terms: new Set<string>(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel,
    coverage: articles.length,
  };
}

describe('resolveRegion', () => {
  it('returns nearest French region for coordinates near Paris', () => {
    const region = resolveRegion(48.86, 2.35, 'fr');
    expect(region).toBe('Île-de-France');
  });

  it('returns nearest French region for coordinates near Lyon', () => {
    const region = resolveRegion(45.76, 4.84, 'fr');
    expect(region).toBe('Auvergne-Rhône-Alpes');
  });

  it('returns null for country with no region data', () => {
    const region = resolveRegion(51.5, -0.12, 'gb');
    expect(region).toBeNull();
  });
});

describe('analyzeGeographicGap', () => {
  it('returns no gap for cluster with fewer than 3 articles', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'fr' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(false);
  });

  it('returns no gap when only 1 article has country data', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2'),
      makeArticle('3'),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(false);
    expect(result.countryGapLabel).toBe('');
  });

  it('flags single-country cluster as country gap', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'fr' }),
      makeArticle('3', { country: 'fr' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('Only covered by French media');
    expect(result.coveredCountries).toEqual(['fr']);
  });

  it('flags single-country cluster with no region data (country gap only)', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'gb' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'gb' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('Only covered by British media');
    expect(result.regionalBreakdown).toEqual([]);
  });

  it('does not flag country gap for multi-country cluster', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'us' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.countryGapLabel).toBe('');
    expect(result.coveredCountries).toContain('fr');
    expect(result.coveredCountries).toContain('gb');
    expect(result.coveredCountries).toContain('us');
  });

  it('skips regional analysis when heatLevel < 50', () => {
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 45.76, lng: 4.84 } }),
        makeArticle('3', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
      ],
      30 // below threshold
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true); // country gap still fires
    expect(result.regionalBreakdown).toEqual([]);
  });

  it('detects missing major regions when heatLevel >= 50', () => {
    // Only Paris and Lyon covered — Marseille, Toulouse, Bordeaux, Lille missing
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 45.76, lng: 4.84 } }),
        makeArticle('3', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
      ],
      70
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.regionalBreakdown).toHaveLength(1);
    const fr = result.regionalBreakdown[0];
    expect(fr.country).toBe('fr');
    expect(fr.coveredRegions).toContain('Île-de-France');
    expect(fr.coveredRegions).toContain('Auvergne-Rhône-Alpes');
    expect(fr.missingRegions).toContain('Provence-Alpes-Côte d\'Azur');
    expect(fr.missingRegions).toContain('Occitanie');
    expect(fr.missingRegions).toContain('Nouvelle-Aquitaine');
    expect(fr.missingRegions).toContain('Hauts-de-France');
    expect(fr.regionGapLabel).toMatch(/Not covered in/);
  });

  it('returns hasGeoGap true for multi-country with regional gap only', () => {
    // Multi-country so no country gap, but fr has regional gap
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('3', { country: 'gb' }),
      ],
      70
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe(''); // no country gap
    expect(result.regionalBreakdown.length).toBeGreaterThan(0);
  });

  it('returns no gap for multi-country cluster without regional gaps', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'us' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    // No coordinates so no regional analysis, multi-country so no country gap
    expect(result.hasGeoGap).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/geographicGap.test.ts 2>&1 | tail -10`
Expected: FAIL — module `@/utils/geographicGap` not found

- [ ] **Step 3: Implement the geographic gap utility**

```typescript
// src/utils/geographicGap.ts
import type { StoryCluster } from './topicClustering';
import { ADMIN_REGIONS } from '@/data/administrative-regions';

export interface GeographicGapResult {
  hasGeoGap: boolean;
  coveredCountries: string[];
  countryGapLabel: string;
  regionalBreakdown: RegionalGap[];
}

export interface RegionalGap {
  country: string;       // ISO 2-letter code (e.g., "fr") — matches article.country
  coveredRegions: string[];
  missingRegions: string[];
  regionGapLabel: string;
}

const NO_GAP: GeographicGapResult = {
  hasGeoGap: false,
  coveredCountries: [],
  countryGapLabel: '',
  regionalBreakdown: [],
};

const COUNTRY_DEMONYMS: Record<string, string> = {
  fr: 'French',
  gb: 'British',
  us: 'American',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  br: 'Brazilian',
  cn: 'Chinese',
  jp: 'Japanese',
  in: 'Indian',
  ru: 'Russian',
  au: 'Australian',
  ca: 'Canadian',
  mx: 'Mexican',
  kr: 'South Korean',
  za: 'South African',
  nl: 'Dutch',
  be: 'Belgian',
  ch: 'Swiss',
  at: 'Austrian',
  se: 'Swedish',
  no: 'Norwegian',
  dk: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  pt: 'Portuguese',
  ie: 'Irish',
  il: 'Israeli',
  tr: 'Turkish',
  eg: 'Egyptian',
  ng: 'Nigerian',
  ke: 'Kenyan',
  ua: 'Ukrainian',
  sa: 'Saudi',
  ae: 'Emirati',
  sg: 'Singaporean',
  ar: 'Argentine',
  gr: 'Greek',
};

/**
 * Resolve coordinates to the nearest administrative region for a given country.
 * Returns null if the country has no region data defined.
 */
export function resolveRegion(lat: number, lng: number, country: string): string | null {
  const countryRegions = ADMIN_REGIONS.filter(r => r.country === country);
  if (countryRegions.length === 0) return null;

  let nearest = countryRegions[0];
  let minDist = Number.MAX_VALUE;

  for (const region of countryRegions) {
    const dLat = lat - region.lat;
    const dLng = lng - region.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }

  return nearest.name;
}

/**
 * Analyze a story cluster for geographic coverage gaps.
 * Operates at two levels: country-level and region-level.
 */
export function analyzeGeographicGap(cluster: StoryCluster): GeographicGapResult {
  if (cluster.articles.length < 3) return NO_GAP;

  // Group articles by country (skip undefined)
  const countryGroups = new Map<string, typeof cluster.articles>();
  for (const article of cluster.articles) {
    if (!article.country) continue;
    const country = article.country.toLowerCase();
    if (!countryGroups.has(country)) countryGroups.set(country, []);
    countryGroups.get(country)!.push(article);
  }

  const articlesWithCountry = Array.from(countryGroups.values()).reduce((sum, g) => sum + g.length, 0);

  // Need at least 2 articles with country data
  if (articlesWithCountry < 2) return NO_GAP;

  const coveredCountries = Array.from(countryGroups.keys());

  // Level 1: Country-level gap
  let countryGapLabel = '';
  let countryGapFired = false;

  if (coveredCountries.length === 1) {
    const country = coveredCountries[0];
    const demonym = COUNTRY_DEMONYMS[country] || country.toUpperCase();
    countryGapLabel = `Only covered by ${demonym} media`;
    countryGapFired = true;
  }

  // Level 2: Region-level gaps (only for heatLevel >= 50)
  const regionalBreakdown: RegionalGap[] = [];

  if (cluster.heatLevel >= 50) {
    for (const [country, articles] of countryGroups) {
      // Need 2+ articles with coordinates in this country
      const withCoords = articles.filter(a => a.coordinates);
      if (withCoords.length < 2) continue;

      // Check if this country has region data
      const countryRegions = ADMIN_REGIONS.filter(r => r.country === country);
      if (countryRegions.length === 0) continue;

      // Resolve each article to a region
      const coveredRegionSet = new Set<string>();
      for (const article of withCoords) {
        const region = resolveRegion(article.coordinates!.lat, article.coordinates!.lng, country);
        if (region) coveredRegionSet.add(region);
      }

      // Find missing major regions
      const majorRegions = countryRegions.filter(r => r.major);
      const missingRegions = majorRegions
        .filter(r => !coveredRegionSet.has(r.name))
        .map(r => r.name);

      if (missingRegions.length > 0) {
        const coveredRegions = Array.from(coveredRegionSet);
        regionalBreakdown.push({
          country,
          coveredRegions,
          missingRegions,
          regionGapLabel: `Not covered in ${missingRegions.join(', ')}`,
        });
      }
    }
  }

  const regionalGapFired = regionalBreakdown.length > 0;
  const hasGeoGap = countryGapFired || regionalGapFired;

  if (!hasGeoGap) return NO_GAP;

  return {
    hasGeoGap,
    coveredCountries,
    countryGapLabel,
    regionalBreakdown,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/geographicGap.test.ts 2>&1 | tail -15`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/geographicGap.ts tests/utils/geographicGap.test.ts
git commit -m "feat: add geographic gap detection utility with tests"
```

---

## Chunk 2: UI Integration

### Task 3: GlobePopup Geographic Gap Indicator

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx`

**Context:** The GlobePopup already imports `analyzeCoverageGap` and shows a credibility gap indicator (lines 86-94). Add a geographic gap indicator directly below it. The popup only shows the country-level label — regional detail is intentionally omitted (popup is a teaser).

- [ ] **Step 1: Add geographic gap import and computation**

After line 9 (`import { analyzeCoverageGap } from '@/utils/coverageGap';`), add:
```typescript
import { analyzeGeographicGap } from '@/utils/geographicGap';
```

After line 33 (`const coverageGap = cluster ? analyzeCoverageGap(cluster) : null;`), add:
```typescript
const geoGap = cluster ? analyzeGeographicGap(cluster) : null;
```

- [ ] **Step 2: Add geographic gap indicator JSX**

After the coverage gap indicator block (after line 94, the closing `)}` of `{coverageGap?.hasGap && (...)}`), add:
```tsx
{/* Geographic gap indicator */}
{geoGap?.hasGeoGap && geoGap.countryGapLabel && (
  <div className="flex items-center gap-1 mb-2">
    <AlertTriangle className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
    <span className="font-body text-[10px] text-amber-400/70">
      {geoGap.countryGapLabel}
    </span>
  </div>
)}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobePopup.tsx
git commit -m "feat: add geographic gap indicator to GlobePopup"
```

---

### Task 4: InvestigatePage Geographic Gap Content

**Files:**
- Modify: `src/pages/InvestigatePage.tsx`

**Context:** The InvestigatePage already has a Coverage Analysis section (lines 180-196) that renders when `coverageGap.hasGap` is true. Two changes needed: (1) update the section conditional to also show when geographic gap fires, (2) add geographic gap content below the existing credibility gap info.

- [ ] **Step 1: Add geographic gap import and computation**

After line 14 (`import { analyzeCoverageGap } from '@/utils/coverageGap';`), add:
```typescript
import { analyzeGeographicGap } from '@/utils/geographicGap';
```

After line 100 (`const coverageGap = analyzeCoverageGap(cluster);`), add:
```typescript
const geoGap = analyzeGeographicGap(cluster);
```

- [ ] **Step 2: Update Coverage Analysis section conditional**

Change line 181 from:
```tsx
{coverageGap.hasGap && (
```
to:
```tsx
{(coverageGap.hasGap || geoGap.hasGeoGap) && (
```

- [ ] **Step 3: Add geographic gap content inside Coverage Analysis**

After the imbalance note block (after line 194, the closing `)}` of `{coverageGap.imbalanceNote && (...)}`), add the geographic gap content before the section's closing `</div>`:

```tsx
{/* Geographic gap */}
{geoGap.hasGeoGap && (
  <div className="mt-3">
    {geoGap.countryGapLabel && (
      <div className="flex items-center gap-2 text-sm text-amber-400/80">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{geoGap.countryGapLabel}</span>
      </div>
    )}
    {geoGap.regionalBreakdown.map((rg) => (
      <div key={rg.country} className="mt-2">
        {rg.coveredRegions.length > 0 && (
          <p className="text-sm text-ivory-200/40">
            Covered in {rg.coveredRegions.join(', ')}
          </p>
        )}
        {rg.missingRegions.length > 0 && (
          <p className="text-sm text-amber-400/60">
            Not covered in {rg.missingRegions.join(', ')}
          </p>
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: add geographic gap content to InvestigatePage Coverage Analysis"
```
