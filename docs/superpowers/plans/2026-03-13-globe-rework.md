# Globe Rework & Search Relocation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the globe interaction model with click-to-activate scroll, territory halos, search relocation above the globe, and filter+fly behavior.

**Architecture:** Add a `territoryHalos.ts` utility for generating country heat maps and radial blob polygons, a `GlobeOverlay.tsx` for the click-to-activate dormant/active state, update `GlobeView.tsx` to merge country and blob polygons into a single `polygonsData` array with type discriminator, and restructure `Index.tsx` to move search above the globe with `baseArticles` ref + `searchResultIds` overlay for dim/highlight behavior.

**Tech Stack:** React 19, TypeScript, Globe.gl (TrackballControls), Tailwind CSS, Vitest

---

## File Structure

| File | Responsibility | Status |
|------|---------------|--------|
| `src/utils/territoryHalos.ts` | Country heat aggregation, radial blob polygon generation, audience-scale-to-radius mapping, crossfade opacity calculation | **Create** |
| `tests/utils/territoryHalos.test.ts` | Tests for territory halo utilities | **Create** |
| `src/components/globe/GlobeOverlay.tsx` | Click-to-activate overlay, "Scrolling page" transition toast | **Create** |
| `src/components/globe/useGlobeInteraction.ts` | Hook managing dormant/active state, max-dezoom release, scroll interception | **Create** |
| `src/types/news.ts` | Add `country?: string` field | **Modify** |
| `src/services/newsdata-api.ts` | Map `country` from API response | **Modify** |
| `src/components/globe/GlobeMarkers.ts` | Add `opacity` field to `GlobeMarkerData` | **Modify** |
| `src/utils/globeUtils.ts` | Add centroid + bounding-box altitude calculation | **Modify** |
| `tests/utils/globeUtils.test.ts` | Tests for new globe utilities | **Create** |
| `src/components/globe/GlobeControls.ts` | Add `setActive(boolean)` to hook for dormant/active state | **Modify** |
| `src/components/globe/GlobeView.tsx` | Integrate territory halos, interaction hook, search dimming, flyToResults | **Modify** |
| `src/components/MapSection.tsx` | Pass new props through | **Modify** |
| `src/components/GlobeLegend.tsx` | Update interaction hint text | **Modify** |
| `src/pages/Index.tsx` | Move search above globe, add baseArticles ref + searchResultIds, wire flyToResults | **Modify** |

---

## Chunk 1: Data Foundation & Territory Halos

### Task 1: Add `country` field to NewsArticle and map it

**Files:**
- Modify: `src/types/news.ts:15` (add field to interface)
- Modify: `src/services/newsdata-api.ts:76-91` (map country in convertNewsDataArticle)

- [ ] **Step 1: Add `country` field to `NewsArticle` interface**

In `src/types/news.ts`, add after the `language?: string;` field (line 27):

```typescript
  country?: string;
```

- [ ] **Step 2: Map `country` in `convertNewsDataArticle`**

In `src/services/newsdata-api.ts`, add this import at the top:

```typescript
import { MEDIA_OUTLETS } from '@/data/media-outlets';
```

Then inside the `convertNewsDataArticle` function, before the return statement, add a country resolution step:

```typescript
  // Resolve country: prefer media-outlets lookup, fall back to API response
  const outlet = MEDIA_OUTLETS.find(o => o.domain && article.source_url?.includes(o.domain));
  const resolvedCountry = outlet?.country || article.country?.[0]?.toLowerCase();
```

And in the return object, add after `language: article.language,`:

```typescript
    country: resolvedCountry,
```

This implements the spec's two-step country resolution: first look up the source domain in `media-outlets.ts` for a reliable country code, then fall back to the API response's `country` array.

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/types/news.ts src/services/newsdata-api.ts
git commit -m "feat: add country field to NewsArticle, map from API response"
```

---

### Task 2: Territory halo utilities — country heat aggregation

**Files:**
- Create: `src/utils/territoryHalos.ts`
- Create: `tests/utils/territoryHalos.test.ts`

- [ ] **Step 1: Write failing tests for country heat aggregation**

Create `tests/utils/territoryHalos.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  type CountryHeatEntry,
} from '@/utils/territoryHalos';
import type { NewsArticle } from '@/types/news';

function makeArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: '1',
    title: 'Test',
    url: 'https://example.com',
    publishedAt: new Date().toISOString(),
    source: { name: 'test' },
    heatLevel: 50,
    color: '#F97316',
    country: 'fr',
    ...overrides,
  };
}

describe('aggregateCountryHeat', () => {
  it('returns empty map for empty articles', () => {
    const result = aggregateCountryHeat([]);
    expect(result.size).toBe(0);
  });

  it('aggregates by country, taking max heat', () => {
    const articles = [
      makeArticle({ id: '1', country: 'fr', heatLevel: 30, color: '#F59E0B' }),
      makeArticle({ id: '2', country: 'fr', heatLevel: 80, color: '#EF4444' }),
      makeArticle({ id: '3', country: 'us', heatLevel: 50, color: '#F97316' }),
    ];
    const result = aggregateCountryHeat(articles);
    expect(result.get('fr')).toEqual({ heat: 80, color: '#EF4444' });
    expect(result.get('us')).toEqual({ heat: 50, color: '#F97316' });
  });

  it('skips articles without country', () => {
    const articles = [
      makeArticle({ id: '1', country: undefined, heatLevel: 90 }),
      makeArticle({ id: '2', country: 'de', heatLevel: 40, color: '#F59E0B' }),
    ];
    const result = aggregateCountryHeat(articles);
    expect(result.size).toBe(1);
    expect(result.has('de')).toBe(true);
  });
});

describe('heatToFillOpacity', () => {
  it('returns 0.05 for cold articles (heat 0-20)', () => {
    expect(heatToFillOpacity(10)).toBe(0.05);
    expect(heatToFillOpacity(20)).toBe(0.05);
  });

  it('returns 0.12 for warming articles (heat 21-50)', () => {
    expect(heatToFillOpacity(30)).toBe(0.12);
    expect(heatToFillOpacity(50)).toBe(0.12);
  });

  it('returns 0.2 for hot articles (heat 51-80)', () => {
    expect(heatToFillOpacity(60)).toBe(0.2);
  });

  it('returns 0.3 for very hot articles (heat 81-100)', () => {
    expect(heatToFillOpacity(90)).toBe(0.3);
  });

  it('returns 0 for heat 0', () => {
    expect(heatToFillOpacity(0)).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement country heat aggregation**

Create `src/utils/territoryHalos.ts`:

```typescript
import type { NewsArticle } from '@/types/news';

// --- Country heat aggregation ---

export interface CountryHeatEntry {
  heat: number;
  color: string;
}

/**
 * Aggregate articles by country code, taking max heat per country.
 * Returns Map<countryCode, { heat, color }>.
 */
export function aggregateCountryHeat(
  articles: NewsArticle[]
): Map<string, CountryHeatEntry> {
  const map = new Map<string, CountryHeatEntry>();

  for (const article of articles) {
    if (!article.country || article.heatLevel == null) continue;

    const existing = map.get(article.country);
    if (!existing || article.heatLevel > existing.heat) {
      map.set(article.country, {
        heat: article.heatLevel,
        color: article.color || '#94A3B8',
      });
    }
  }

  return map;
}

/**
 * Map heat level to polygon fill opacity.
 * Spec: 0-20 → 0.05, 21-50 → 0.12, 51-80 → 0.2, 81-100 → 0.3
 */
export function heatToFillOpacity(heat: number): number {
  if (heat <= 20) return 0.05;
  if (heat <= 50) return 0.12;
  if (heat <= 80) return 0.2;
  return 0.3;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/territoryHalos.ts tests/utils/territoryHalos.test.ts
git commit -m "feat: add country heat aggregation utilities"
```

---

### Task 3: Territory halo utilities — radial blob generation

**Files:**
- Modify: `src/utils/territoryHalos.ts` (add blob functions)
- Modify: `tests/utils/territoryHalos.test.ts` (add blob tests)

- [ ] **Step 1: Write failing tests for radial blob generation**

Append to `tests/utils/territoryHalos.test.ts`:

```typescript
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  audienceScaleToRadiusKm,
  generateBlobPolygon,
  type CountryHeatEntry,
} from '@/utils/territoryHalos';

// (update the existing import to include new exports)

describe('audienceScaleToRadiusKm', () => {
  it('maps small to 50km', () => {
    expect(audienceScaleToRadiusKm('small')).toBe(50);
  });

  it('maps medium to 150km', () => {
    expect(audienceScaleToRadiusKm('medium')).toBe(150);
  });

  it('maps large to 400km', () => {
    expect(audienceScaleToRadiusKm('large')).toBe(400);
  });

  it('defaults to 80km for undefined', () => {
    expect(audienceScaleToRadiusKm(undefined)).toBe(80);
  });
});

describe('generateBlobPolygon', () => {
  it('generates a 32-point circle polygon', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 100);
    // GeoJSON polygon: outer ring has N+1 points (first = last)
    expect(blob.type).toBe('Feature');
    expect(blob.geometry.type).toBe('Polygon');
    expect(blob.geometry.coordinates[0]).toHaveLength(33); // 32 + closing point
  });

  it('first and last points are the same (closed ring)', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 100);
    const ring = blob.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('center of blob is approximately at the given lat/lng', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 50);
    const ring = blob.geometry.coordinates[0];
    // Average of all points (excluding closing) should be near center
    const avgLng = ring.slice(0, -1).reduce((s, p) => s + p[0], 0) / 32;
    const avgLat = ring.slice(0, -1).reduce((s, p) => s + p[1], 0) / 32;
    expect(avgLng).toBeCloseTo(2.35, 0);
    expect(avgLat).toBeCloseTo(48.86, 0);
  });

  it('larger radius produces wider spread', () => {
    const small = generateBlobPolygon(48.86, 2.35, 50);
    const large = generateBlobPolygon(48.86, 2.35, 400);
    // Compare max longitude spread
    const spreadSmall = Math.max(...small.geometry.coordinates[0].map(p => p[0])) -
                        Math.min(...small.geometry.coordinates[0].map(p => p[0]));
    const spreadLarge = Math.max(...large.geometry.coordinates[0].map(p => p[0])) -
                        Math.min(...large.geometry.coordinates[0].map(p => p[0]));
    expect(spreadLarge).toBeGreaterThan(spreadSmall);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: FAIL — `audienceScaleToRadiusKm` and `generateBlobPolygon` not exported

- [ ] **Step 3: Implement radial blob generation**

Add to `src/utils/territoryHalos.ts`:

```typescript
// --- Audience scale mapping ---

const AUDIENCE_RADIUS_KM: Record<string, number> = {
  small: 50,
  medium: 150,
  large: 400,
};

const DEFAULT_RADIUS_KM = 80;

/**
 * Map audienceScale to territory radius in kilometers.
 * Spec: small=50km, medium=150km, large=400km, default=80km.
 */
export function audienceScaleToRadiusKm(
  scale: 'small' | 'medium' | 'large' | undefined
): number {
  if (!scale) return DEFAULT_RADIUS_KM;
  return AUDIENCE_RADIUS_KM[scale] ?? DEFAULT_RADIUS_KM;
}

// --- Radial blob polygon generation ---

interface BlobFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: Record<string, unknown>;
}

const BLOB_POINTS = 32;
const KM_PER_DEGREE_LAT = 111.32;

/**
 * Generate a GeoJSON circle polygon at the given lat/lng with the given
 * radius in km. Uses a 32-point approximation.
 */
export function generateBlobPolygon(
  lat: number,
  lng: number,
  radiusKm: number
): BlobFeature {
  const latOffset = radiusKm / KM_PER_DEGREE_LAT;
  // Adjust for longitude compression at higher latitudes
  const lngOffset = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  const coords: [number, number][] = [];
  for (let i = 0; i < BLOB_POINTS; i++) {
    const angle = (2 * Math.PI * i) / BLOB_POINTS;
    coords.push([
      lng + lngOffset * Math.cos(angle),
      lat + latOffset * Math.sin(angle),
    ]);
  }
  // Close the ring
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: All 16 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/territoryHalos.ts tests/utils/territoryHalos.test.ts
git commit -m "feat: add radial blob polygon generation and audience scale mapping"
```

---

### Task 4: Territory halo utilities — crossfade opacity

**Files:**
- Modify: `src/utils/territoryHalos.ts` (add crossfade function)
- Modify: `tests/utils/territoryHalos.test.ts` (add crossfade tests)

- [ ] **Step 1: Write failing tests for crossfade opacity**

Append to `tests/utils/territoryHalos.test.ts`:

```typescript
import {
  // ... existing imports ...
  crossfadeOpacity,
} from '@/utils/territoryHalos';

describe('crossfadeOpacity', () => {
  it('returns { country: 1, blob: 0 } above 3500km', () => {
    expect(crossfadeOpacity(5000)).toEqual({ country: 1, blob: 0 });
    expect(crossfadeOpacity(3500)).toEqual({ country: 1, blob: 0 });
  });

  it('returns { country: 0, blob: 1 } below 2500km', () => {
    expect(crossfadeOpacity(1000)).toEqual({ country: 0, blob: 1 });
    expect(crossfadeOpacity(2500)).toEqual({ country: 0, blob: 1 });
  });

  it('returns interpolated values in 2500-3500km range', () => {
    const mid = crossfadeOpacity(3000);
    expect(mid.country).toBeCloseTo(0.5, 1);
    expect(mid.blob).toBeCloseTo(0.5, 1);
  });

  it('country + blob always sum to 1 within the crossfade range', () => {
    for (const alt of [2600, 2800, 3000, 3200, 3400]) {
      const { country, blob } = crossfadeOpacity(alt);
      expect(country + blob).toBeCloseTo(1, 5);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: FAIL — `crossfadeOpacity` not exported

- [ ] **Step 3: Implement crossfade opacity**

Add to `src/utils/territoryHalos.ts`:

```typescript
// --- Altitude crossfade ---

const CROSSFADE_LOW = 2500;  // km — below this, only blobs
const CROSSFADE_HIGH = 3500; // km — above this, only country fills

/**
 * Compute opacity multipliers for country fills and radial blobs
 * based on current altitude in km.
 *
 * Crossfade range: 2500–3500km
 * - Above 3500km: country=1, blob=0
 * - Below 2500km: country=0, blob=1
 * - Between: linear interpolation
 */
export function crossfadeOpacity(altitudeKm: number): {
  country: number;
  blob: number;
} {
  if (altitudeKm >= CROSSFADE_HIGH) return { country: 1, blob: 0 };
  if (altitudeKm <= CROSSFADE_LOW) return { country: 0, blob: 1 };

  const t = (altitudeKm - CROSSFADE_LOW) / (CROSSFADE_HIGH - CROSSFADE_LOW);
  return { country: t, blob: 1 - t };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/territoryHalos.test.ts`
Expected: All 20 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/territoryHalos.ts tests/utils/territoryHalos.test.ts
git commit -m "feat: add altitude crossfade opacity calculation"
```

---

### Task 5: Add centroid and fly-to-results utilities to globeUtils

**Files:**
- Modify: `src/utils/globeUtils.ts` (add centroid + altitude functions)
- Create: `tests/utils/globeUtils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/utils/globeUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeResultsCentroid, computeFlyToAltitude } from '@/utils/globeUtils';
import type { NewsArticle } from '@/types/news';

function makeArticle(lat: number, lng: number, heatLevel = 50): NewsArticle {
  return {
    id: `${lat}-${lng}`,
    title: 'Test',
    url: 'https://example.com',
    publishedAt: new Date().toISOString(),
    source: { name: 'test' },
    coordinates: { lat, lng },
    heatLevel,
  };
}

describe('computeResultsCentroid', () => {
  it('returns null for empty array', () => {
    expect(computeResultsCentroid([])).toBeNull();
  });

  it('returns null if no articles have coordinates', () => {
    const articles = [{
      id: '1', title: 'T', url: '', publishedAt: '', source: { name: 's' },
    }] as NewsArticle[];
    expect(computeResultsCentroid(articles)).toBeNull();
  });

  it('returns the single article position for one article', () => {
    const result = computeResultsCentroid([makeArticle(48.86, 2.35)]);
    expect(result!.lat).toBeCloseTo(48.86, 1);
    expect(result!.lng).toBeCloseTo(2.35, 1);
  });

  it('computes heat-weighted centroid', () => {
    const articles = [
      makeArticle(0, 0, 10),   // cold, low weight
      makeArticle(50, 10, 90), // hot, high weight
    ];
    const result = computeResultsCentroid(articles);
    // Should be pulled towards the hot article
    expect(result!.lat).toBeGreaterThan(25);
    expect(result!.lng).toBeGreaterThan(5);
  });
});

describe('computeFlyToAltitude', () => {
  it('returns 0.3 for tightly clustered results', () => {
    const articles = [
      makeArticle(48.86, 2.35),
      makeArticle(48.87, 2.36),
    ];
    expect(computeFlyToAltitude(articles)).toBeCloseTo(0.3, 1);
  });

  it('returns higher altitude for widely spread results', () => {
    const articles = [
      makeArticle(0, 0),
      makeArticle(50, 50),
    ];
    const alt = computeFlyToAltitude(articles);
    expect(alt).toBeGreaterThan(1);
    expect(alt).toBeLessThanOrEqual(2.5);
  });

  it('caps at 2.5', () => {
    const articles = [
      makeArticle(-50, -170),
      makeArticle(60, 170),
    ];
    expect(computeFlyToAltitude(articles)).toBe(2.5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/globeUtils.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement centroid and altitude functions**

Add to `src/utils/globeUtils.ts`:

```typescript
import type { NewsArticle } from '@/types/news';

/**
 * Compute heat-weighted geographic centroid of articles.
 * Returns null if no articles have coordinates.
 */
export function computeResultsCentroid(
  articles: NewsArticle[]
): { lat: number; lng: number } | null {
  const withCoords = articles.filter(a => a.coordinates);
  if (withCoords.length === 0) return null;

  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;

  for (const a of withCoords) {
    const weight = Math.max(1, a.heatLevel || 1);
    weightedLat += a.coordinates!.lat * weight;
    weightedLng += a.coordinates!.lng * weight;
    totalWeight += weight;
  }

  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
  };
}

/**
 * Compute globe altitude to fit the bounding box of result articles.
 * Formula: max(0.3, min(2.5, maxSpreadDegrees / 40))
 */
export function computeFlyToAltitude(articles: NewsArticle[]): number {
  const withCoords = articles.filter(a => a.coordinates);
  if (withCoords.length <= 1) return 0.3;

  const lats = withCoords.map(a => a.coordinates!.lat);
  const lngs = withCoords.map(a => a.coordinates!.lng);

  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const maxSpread = Math.max(latSpread, lngSpread);

  return Math.max(0.3, Math.min(2.5, maxSpread / 40));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/globeUtils.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/globeUtils.ts tests/utils/globeUtils.test.ts
git commit -m "feat: add centroid and fly-to altitude calculation utilities"
```

---

### Task 6: Add opacity field to GlobeMarkerData

**Files:**
- Modify: `src/components/globe/GlobeMarkers.ts`

- [ ] **Step 1: Add `opacity` field to `GlobeMarkerData` interface**

In `src/components/globe/GlobeMarkers.ts`, add to the `GlobeMarkerData` interface:

```typescript
export interface GlobeMarkerData {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  opacity: number;  // ADD THIS — 0.0 to 1.0, used for search dimming
  heatLevel: number;
  article: NewsArticle;
  label: string;
}
```

- [ ] **Step 2: Update `articlesToMarkers` to accept optional `searchResultIds`**

Modify the `articlesToMarkers` function to accept a second parameter:

```typescript
export function articlesToMarkers(
  articles: NewsArticle[],
  searchResultIds?: Set<string> | null
): GlobeMarkerData[] {
  return articles
    .filter(a => a.coordinates)
    .map(a => ({
      id: a.id,
      lat: a.coordinates!.lat,
      lng: a.coordinates!.lng,
      size: getMarkerSize(a.heatLevel || 0),
      color: getMarkerColor(a.heatLevel || 0),
      opacity: searchResultIds ? (searchResultIds.has(a.id) ? 1.0 : 0.1) : 1.0,
      heatLevel: a.heatLevel || 0,
      article: a,
      label: a.title,
    }));
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobeMarkers.ts
git commit -m "feat: add opacity field to GlobeMarkerData for search dimming"
```

---

## Chunk 2: Globe Interaction, Search Relocation & Page Structure

### Task 7: Globe interaction hook — dormant/active state

**Files:**
- Create: `src/components/globe/useGlobeInteraction.ts`

- [ ] **Step 1: Create the interaction hook**

Create `src/components/globe/useGlobeInteraction.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_DEZOOM_BUFFER = 3;

interface UseGlobeInteractionOptions {
  /** Current altitude in km (from globe controls change event) */
  altitudeKm: number;
  /** Minimum altitude the globe can reach (in km) */
  minAltitudeKm?: number;
  /** Whether this is a mobile device (disables overlay) */
  isMobile: boolean;
  /** Callback when transitioning to dormant */
  onDeactivate?: () => void;
}

interface UseGlobeInteractionReturn {
  /** Whether the globe is in active (interactive) state */
  isActive: boolean;
  /** Call when user clicks on the globe */
  activate: () => void;
  /** Call to manually deactivate (Escape, click outside) */
  deactivate: () => void;
  /** Handle wheel events — call in the globe container's onWheel */
  handleWheel: (e: React.WheelEvent) => void;
  /** Whether to show the "Scrolling page" transition toast */
  showScrollToast: boolean;
}

export function useGlobeInteraction({
  altitudeKm,
  minAltitudeKm = 200,
  isMobile,
  onDeactivate,
}: UseGlobeInteractionOptions): UseGlobeInteractionReturn {
  const [isActive, setIsActive] = useState(false);
  const [showScrollToast, setShowScrollToast] = useState(false);
  const dezoomCountRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mobile, always active (touch handles scroll natively)
  const effectiveActive = isMobile ? true : isActive;

  const activate = useCallback(() => {
    if (isMobile) return;
    setIsActive(true);
    dezoomCountRef.current = 0;
  }, [isMobile]);

  const deactivate = useCallback(() => {
    if (isMobile) return;
    setIsActive(false);
    dezoomCountRef.current = 0;
    onDeactivate?.();
  }, [isMobile, onDeactivate]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isMobile) return;

      if (!isActive) {
        // Dormant: let event pass through to page (don't stop propagation)
        return;
      }

      // Active: check for max-dezoom release
      const isAtMinAltitude = altitudeKm <= minAltitudeKm + 50; // 50km tolerance
      const isScrollingDown = e.deltaY > 0;

      if (isAtMinAltitude && isScrollingDown) {
        dezoomCountRef.current++;
        if (dezoomCountRef.current >= MAX_DEZOOM_BUFFER) {
          // Trigger transition to dormant
          setIsActive(false);
          dezoomCountRef.current = 0;
          onDeactivate?.();

          // Show toast
          setShowScrollToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setShowScrollToast(false), 1000);
        }
      } else {
        // Reset counter on zoom-in or when not at min altitude
        dezoomCountRef.current = 0;
      }
    },
    [isActive, altitudeKm, minAltitudeKm, isMobile, onDeactivate]
  );

  // Escape key handler
  useEffect(() => {
    if (isMobile || !isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        deactivate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isMobile, deactivate]);

  // Cleanup toast timer
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return {
    isActive: effectiveActive,
    activate,
    deactivate,
    handleWheel,
    showScrollToast,
  };
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/globe/useGlobeInteraction.ts
git commit -m "feat: add useGlobeInteraction hook for dormant/active scroll state"
```

---

### Task 8: Globe overlay component

**Files:**
- Create: `src/components/globe/GlobeOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

Create `src/components/globe/GlobeOverlay.tsx`:

```typescript
import { MousePointer2 } from 'lucide-react';

interface GlobeOverlayProps {
  /** Whether the globe is in dormant state (show overlay) */
  showOverlay: boolean;
  /** Whether to show the "Scrolling page" transition toast */
  showScrollToast: boolean;
  /** Called when user clicks the overlay to activate the globe */
  onActivate: () => void;
}

export default function GlobeOverlay({
  showOverlay,
  showScrollToast,
  onActivate,
}: GlobeOverlayProps) {
  return (
    <>
      {/* Click-to-activate overlay */}
      {showOverlay && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          onClick={onActivate}
          role="button"
          aria-label="Click to interact with the globe"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onActivate();
          }}
        >
          <div className="bg-navy-900/60 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 pointer-events-none">
            <MousePointer2 className="w-4 h-4 text-ivory-200/50" />
            <span className="font-body text-xs text-ivory-200/50">
              Click to interact
            </span>
          </div>
        </div>
      )}

      {/* "Scrolling page" transition toast */}
      {showScrollToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-fade-up">
          <div className="bg-navy-900/80 backdrop-blur-sm px-3 py-1.5 rounded-md">
            <span className="font-body text-[11px] text-ivory-200/40">
              Scrolling page
            </span>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/globe/GlobeOverlay.tsx
git commit -m "feat: add GlobeOverlay component for click-to-activate interaction"
```

---

### Task 9: Update GlobeControls for dormant/active state

**Files:**
- Modify: `src/components/globe/GlobeControls.ts`

- [ ] **Step 1: Read the current file**

Read `src/components/globe/GlobeControls.ts` to see the exact current implementation.

- [ ] **Step 2: Add `setActive` to the hook**

The hook currently returns `{ onUserInteraction, getRotationAngle, isRotating }`. Add a `setActive(active: boolean)` function that:
- When `active=true`: forces rotation off by setting an `isGlobeActive` ref to `true`. `getRotationAngle` returns `null` when this is true.
- When `active=false`: sets `isGlobeActive` to `false` and calls `onUserInteraction()` to restart the idle timer.

Add to the hook body:

```typescript
const isGlobeActiveRef = useRef(false);

const setActive = useCallback((active: boolean) => {
  isGlobeActiveRef.current = active;
  if (!active) {
    // Returning to dormant — restart idle timer
    onUserInteraction();
  }
}, [onUserInteraction]);
```

Update `getRotationAngle` to check `isGlobeActiveRef`:

```typescript
const getRotationAngle = useCallback((): number | null => {
  if (isGlobeActiveRef.current) return null; // No rotation in active state
  if (!isRotatingRef.current) return null;
  // ... existing rotation logic ...
}, []);
```

Update the return value:

```typescript
return { onUserInteraction, getRotationAngle, isRotating, setActive };
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobeControls.ts
git commit -m "feat: add setActive to GlobeControls for dormant/active rotation state"
```

---

### Task 10: Integrate territory halos and interaction into GlobeView

This is the largest task. It modifies `GlobeView.tsx` to:
1. Use `useGlobeInteraction` hook for dormant/active state
2. Toggle `controls().noZoom` based on active state
3. Render `GlobeOverlay`
4. Merge country heat polygons + radial blob polygons into `polygonsData`
5. Accept `searchResultIds` prop and pass to `articlesToMarkers`
6. Expose `flyToResults` via `onFlyToReady`

**Files:**
- Modify: `src/components/globe/GlobeView.tsx`

- [ ] **Step 1: Read the current GlobeView.tsx**

Read `src/components/globe/GlobeView.tsx` to see the exact current state.

- [ ] **Step 2: Add new imports**

Add these imports at the top of `GlobeView.tsx`:

```typescript
import { useGlobeInteraction } from './useGlobeInteraction';
import GlobeOverlay from './GlobeOverlay';
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  crossfadeOpacity,
  audienceScaleToRadiusKm,
  generateBlobPolygon,
} from '@/utils/territoryHalos';
import { computeResultsCentroid, computeFlyToAltitude } from '@/utils/globeUtils';
import { MEDIA_OUTLETS } from '@/data/media-outlets';
```

- [ ] **Step 3: Update GlobeViewProps to accept searchResultIds**

```typescript
interface GlobeViewProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number, alt?: number) => void, flyToResults?: (articles: NewsArticle[]) => void) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
}
```

- [ ] **Step 4: Wire up the interaction hook**

Inside the `GlobeView` component, add after the existing state declarations:

```typescript
const { isActive, activate, deactivate, handleWheel, showScrollToast } =
  useGlobeInteraction({
    altitudeKm: altitude * 6371,
    isMobile: screenWidth < 768,
    onDeactivate: () => {
      // Restart auto-rotation idle timer
      autoRotation.setActive(false);
    },
  });
```

When `isActive` changes, toggle globe controls:

```typescript
useEffect(() => {
  if (!globeRef.current) return;
  const controls = globeRef.current.controls() as any;
  controls.noZoom = !isActive;
}, [isActive]);
```

When globe is activated:

```typescript
// In the activate callback or via effect:
useEffect(() => {
  if (isActive) {
    autoRotation.setActive(true);
  }
}, [isActive]);
```

- [ ] **Step 5: Store country polygons in a ref for reuse**

The current GlobeView fetches TopoJSON countries in a `.then()` chain and passes them directly to `.polygonsData()`. We need to store them in a ref so the `mergedPolygons` memo can access them.

Add a ref declaration near the other refs:

```typescript
const countryPolygonsRef = useRef<any[]>([]);
```

In the existing fetch callback (around line 115-129) where countries are loaded, after converting with `feature()`, store the features:

```typescript
// After: const countries = feature(topology, topology.objects.countries);
countryPolygonsRef.current = countries.features;
```

Also add a numeric-to-alpha-2 country code mapping. The `world-atlas` TopoJSON uses ISO 3166-1 **numeric** codes as `feature.id` (e.g., `"250"` for France, `"840"` for USA), not alpha-2. Add this lookup map at the top of the file (outside the component):

```typescript
// ISO 3166-1 numeric → alpha-2 mapping for countries with articles
// Only needs to cover countries represented in media-outlets.ts
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '032': 'ar', '036': 'au', '076': 'br', '124': 'ca', '156': 'cn',
  '250': 'fr', '276': 'de', '356': 'in', '360': 'id', '380': 'it',
  '392': 'jp', '410': 'kr', '458': 'my', '484': 'mx', '528': 'nl',
  '702': 'sg', '710': 'za', '724': 'es', '764': 'th', '826': 'gb',
  '840': 'us', '056': 'be', '756': 'ch', '620': 'pt', '643': 'ru',
  '682': 'sa', '784': 'ae', '818': 'eg', '566': 'ng', '404': 'ke',
};
```

- [ ] **Step 6: Build the merged polygon data with type discriminator**

Add a `useMemo` that builds the combined polygon array:

```typescript
const isMobile = screenWidth < 768;

const mergedPolygons = useMemo(() => {
  if (countryPolygonsRef.current.length === 0) return [];

  const altKm = altitude * 6371;
  const { country: countryOpacity, blob: blobOpacity } = crossfadeOpacity(altKm);
  const countryHeatMap = aggregateCountryHeat(articles);

  // Country polygons (tagged with type: 'country')
  const countryPolys = countryPolygonsRef.current.map((feature: any) => {
    // world-atlas uses numeric ISO codes as feature.id
    const numericCode = String(feature.id).padStart(3, '0');
    const alpha2 = NUMERIC_TO_ALPHA2[numericCode] || '';
    const heatEntry = countryHeatMap.get(alpha2);
    return {
      ...feature,
      __type: 'country',
      __heat: heatEntry?.heat || 0,
      __color: heatEntry?.color || null,
      __crossfadeOpacity: countryOpacity,
    };
  });

  // Radial blob polygons (only when zoomed in enough, skip on mobile for performance)
  let blobPolys: any[] = [];
  if (blobOpacity > 0 && !isMobile) {
    const visibleArticles = articles.filter(a => a.coordinates);
    blobPolys = visibleArticles.map(article => {
      const outlet = MEDIA_OUTLETS.find(o =>
        o.domain && article.source?.url?.includes(o.domain)
      );
      const radiusKm = audienceScaleToRadiusKm(outlet?.audienceScale);
      const blob = generateBlobPolygon(
        article.coordinates!.lat,
        article.coordinates!.lng,
        radiusKm
      );
      return {
        ...blob,
        __type: 'blob',
        __color: article.color || '#94A3B8',
        __heat: article.heatLevel || 0,
        __crossfadeOpacity: blobOpacity,
        __articleId: article.id,
      };
    });
  }

  return [...countryPolys, ...blobPolys];
}, [articles, altitude, isMobile]);
```

- [ ] **Step 7: Update the polygon layer accessors**

Replace the existing `polygonCapColor`, `polygonSideColor`, and `polygonAltitude` configuration with accessors that branch on `__type`:

```typescript
globe
  .polygonsData(mergedPolygons)
  .polygonCapColor((d: any) => {
    if (d.__type === 'blob') {
      // Radial blob: article heat color at 0.15 base opacity × crossfade
      const alpha = 0.15 * d.__crossfadeOpacity;
      return hexToRgba(d.__color, alpha);
    }
    // Country: heat fill if has articles, default border fill otherwise
    if (!d.__color) return 'rgba(30, 42, 58, 0.6)'; // existing default
    const heatAlpha = heatToFillOpacity(d.__heat);
    const alpha = heatAlpha * d.__crossfadeOpacity;
    return hexToRgba(d.__color, alpha);
  })
  .polygonSideColor((d: any) => {
    if (d.__type === 'blob') return 'rgba(0,0,0,0)';
    return 'rgba(30, 42, 58, 0.2)'; // existing
  })
  .polygonStrokeColor((d: any) => {
    if (d.__type === 'blob') return 'rgba(0,0,0,0)';
    return 'rgba(148, 163, 184, 0.15)'; // existing
  })
  .polygonAltitude((d: any) => {
    if (d.__type === 'blob') return 0.006; // slightly above country fills
    return 0.005; // existing
  });
```

Add a hex-to-rgba helper at the top of the file (outside the component):

```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

- [ ] **Step 8: Pass searchResultIds to articlesToMarkers**

Update the marker generation `useMemo` to pass `searchResultIds`:

```typescript
const markers = useMemo(() => {
  const filtered = filterArticlesByAltitude(articles, altitude * 6371, maxMarkers);
  return articlesToMarkers(filtered, searchResultIds);
}, [articles, altitude, maxMarkers, searchResultIds]);
```

Update the `.pointColor` accessor to use the opacity field:

```typescript
.pointColor((d: any) => {
  const marker = d as GlobeMarkerData;
  if (marker.opacity < 1) {
    // Dim the color for non-matching search results
    return hexToRgba(marker.color, marker.opacity);
  }
  return marker.color;
})
```

- [ ] **Step 9: Expose flyToResults callback**

In the existing `useEffect` that calls `onFlyToReady`, extend it to also pass `flyToResults`:

```typescript
useEffect(() => {
  if (!globeRef.current || !onFlyToReady) return;

  const flyTo = (lat: number, lng: number, alt?: number) => {
    globeRef.current?.pointOfView({ lat, lng, altitude: alt ?? 0.4 }, alt ? 1000 : 400);
  };

  const flyToResults = (resultArticles: NewsArticle[]) => {
    const centroid = computeResultsCentroid(resultArticles);
    if (!centroid) return;
    const alt = computeFlyToAltitude(resultArticles);
    globeRef.current?.pointOfView({ lat: centroid.lat, lng: centroid.lng, altitude: alt }, 1000);
  };

  onFlyToReady(flyTo, flyToResults);
}, [onFlyToReady]);
```

- [ ] **Step 10: Wrap globe container with interaction overlay**

In the JSX, wrap the globe div with the overlay and wheel handler:

```tsx
<div
  id="globe-section"
  className="relative w-full bg-navy-900"
  style={{ height: isMobile ? 400 : 600 }}
  onWheel={handleWheel}
  onClick={(e) => {
    // Only deactivate on click outside globe (clicking the container padding)
    if (e.target === e.currentTarget && isActive) {
      deactivate();
    }
  }}
>
  <GlobeOverlay
    showOverlay={!isActive && !isMobile}
    showScrollToast={showScrollToast}
    onActivate={activate}
  />
  <div
    ref={globeContainerRef}
    className={`w-full h-full ${isActive ? 'cursor-grab active:cursor-grabbing' : ''}`}
  />
  {/* ... existing popup, tooltip, zoom indicator, region pills ... */}
</div>
```

- [ ] **Step 11: Verify build passes and test manually**

Run: `npx tsc --noEmit`
Expected: No type errors

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 12: Commit**

```bash
git add src/components/globe/GlobeView.tsx
git commit -m "feat: integrate territory halos, scroll interaction, and search dimming into globe"
```

---

### Task 11: Update MapSection to pass new props

**Files:**
- Modify: `src/components/MapSection.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/MapSection.tsx`.

- [ ] **Step 2: Add searchResultIds prop**

Update `MapSectionProps` and pass through:

```typescript
interface MapSectionProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number, alt?: number) => void, flyToResults?: (articles: NewsArticle[]) => void) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
}
```

Pass `searchResultIds` to `GlobeView`:

```tsx
<GlobeView
  articles={articles}
  onFlyToReady={onFlyToReady}
  preferenceLocations={preferenceLocations}
  searchResultIds={searchResultIds}
/>
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/MapSection.tsx
git commit -m "feat: pass searchResultIds through MapSection to GlobeView"
```

---

### Task 12: Update GlobeLegend interaction hint

**Files:**
- Modify: `src/components/GlobeLegend.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/GlobeLegend.tsx`.

- [ ] **Step 2: Update the zoom hint text**

Replace the `ZoomIn` hint with a `MousePointer2` "Click to interact" hint. Change:

```tsx
<span className="flex items-center gap-1.5 font-body text-[10px] text-ivory-200/25">
  <ZoomIn className="w-3 h-3 text-ivory-200/20" />
  Zoom to reveal local stories
</span>
```

To:

```tsx
<span className="flex items-center gap-1.5 font-body text-[10px] text-ivory-200/25">
  <MousePointer2 className="w-3 h-3 text-ivory-200/20" />
  Click globe to interact, scroll to continue
</span>
```

Keep the existing `MousePointer2` import (already imported) and remove `ZoomIn` from the import if no longer used.

- [ ] **Step 3: Commit**

```bash
git add src/components/GlobeLegend.tsx
git commit -m "feat: update globe legend hint for click-to-activate interaction"
```

---

### Task 13: Restructure Index.tsx — move search above globe, add searchResultIds

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Read the current file**

Read `src/pages/Index.tsx`.

- [ ] **Step 2: Add baseArticles ref and searchResultIds state**

Add after the existing state declarations:

```typescript
const baseArticlesRef = useRef<NewsArticle[]>([]);
const [searchResultIds, setSearchResultIds] = useState<Set<string> | null>(null);
const [globeFlyToResults, setGlobeFlyToResults] = useState<((articles: NewsArticle[]) => void) | null>(null);
```

Also update the existing `globeFlyTo` state type to include the optional altitude parameter:

```typescript
// Change existing line:
const [globeFlyTo, setGlobeFlyTo] = useState<((lat: number, lng: number, alt?: number) => void) | null>(null);
```

- [ ] **Step 3: Update loadNews to store base articles**

In the `loadNews` callback, after `setAllArticles(combineArticles(newsConfig))`, add:

```typescript
const combined = combineArticles(newsConfig);
baseArticlesRef.current = combined;
setAllArticles(combined);
```

- [ ] **Step 4: Update handleSearch to use searchResultIds**

Modify `handleSearch`:

```typescript
const handleSearch = useCallback(async (search: SearchParams) => {
  try {
    setIsSearching(true);
    setError(null);
    setCurrentSearch(search);
    setSelectedScale(search.scale);

    const searchedArticles = await searchAndFilterNews({
      query: search.query,
      scale: search.scale,
      size: 10,
    });

    const processed = processFilteredArticles(searchedArticles, search.scale);

    if (processed.length === 0) {
      // Zero results: don't change globe, show message via error state
      setError(new Error(`No articles found for "${search.query}"`));
      setSearchResultIds(null);
      return;
    }

    // Build searchResultIds from results
    const resultIds = new Set(processed.map(a => a.id));
    setSearchResultIds(resultIds);

    // Merge new results into allArticles (keep base + add new)
    const merged = [...baseArticlesRef.current];
    for (const article of processed) {
      if (!merged.find(a => a.id === article.id)) {
        merged.push(article);
      }
    }
    setAllArticles(merged);
    setLastUpdated(new Date());

    // Fly to results
    if (globeFlyToResults) {
      globeFlyToResults(processed);
    }
  } catch (err) {
    console.error('Failed to search news:', err);
    setError(err as Error);
  } finally {
    setIsSearching(false);
  }
}, [globeFlyToResults]);
```

- [ ] **Step 5: Update handleFilterChange similarly**

Modify `handleFilterChange`:

```typescript
const handleFilterChange = useCallback(async (filters: NewsFiltersType) => {
  try {
    setIsSearching(true);
    setError(null);
    setCurrentFilters(filters);
    setSelectedScale(filters.scale);

    const filteredArticles = await searchAndFilterNews({
      countries: filters.countries,
      languages: filters.languages,
      categories: filters.categories,
      scale: filters.scale,
      prioritydomain: filters.prioritydomain,
      size: 10,
    });

    const processed = processFilteredArticles(filteredArticles, filters.scale);

    if (processed.length === 0) {
      setError(new Error('No articles found for these filters'));
      setSearchResultIds(null);
      return;
    }

    const resultIds = new Set(processed.map(a => a.id));
    setSearchResultIds(resultIds);

    const merged = [...baseArticlesRef.current];
    for (const article of processed) {
      if (!merged.find(a => a.id === article.id)) {
        merged.push(article);
      }
    }
    setAllArticles(merged);
    setLastUpdated(new Date());

    if (globeFlyToResults) {
      globeFlyToResults(processed);
    }
  } catch (err) {
    console.error('Failed to filter news:', err);
    setError(err as Error);
  } finally {
    setIsSearching(false);
  }
}, [globeFlyToResults]);
```

- [ ] **Step 6: Update handleClearFilters**

```typescript
const handleClearFilters = useCallback(() => {
  setCurrentFilters(null);
  setCurrentSearch(null);
  setSelectedScale('all');
  setSearchResultIds(null);
  setAllArticles(baseArticlesRef.current);
  // Reset camera to default overview (altitude 2.5)
  if (globeFlyTo) {
    globeFlyTo(46, 2, 2.5);
  }
}, [globeFlyTo]);
```

- [ ] **Step 7: Update onFlyToReady handler**

Update the `onFlyToReady` callback to capture `flyToResults`:

```typescript
<MapSection
  articles={allArticles}
  onFlyToReady={(fn, fnResults) => {
    setGlobeFlyTo(() => fn);
    if (fnResults) setGlobeFlyToResults(() => fnResults);
  }}
  preferenceLocations={preferences.locations}
  searchResultIds={searchResultIds}
/>
```

- [ ] **Step 8: Move search and filters above the globe in JSX**

Restructure the JSX. Move the search/filters section from after the globe to before it. Change the container styling to match the dark navy theme:

Replace the current layout order:

```tsx
{/* OLD ORDER: Globe → Legend → CTA → Search → Filters → Feed */}
```

With:

```tsx
{/* NEW ORDER: Search → Globe → Legend → CTA → Feed */}

{/* Search & Filters — dark band above globe */}
<div className="w-full bg-navy-900 border-b border-ivory-200/5">
  <div className="max-w-4xl mx-auto px-6 py-4 space-y-3">
    <NewsSearch
      onSearch={handleSearch}
      onClear={handleClearFilters}
      isSearching={isSearching}
      currentSearch={currentSearch || undefined}
    />
    <NewsFilters
      onFilterChange={handleFilterChange}
      onClear={handleClearFilters}
      currentFilters={currentFilters || undefined}
    />
  </div>
</div>

{/* Globe */}
<ErrorBoundary>
  <MapSection
    articles={allArticles}
    onFlyToReady={(fn, fnResults) => {
      setGlobeFlyTo(() => fn);
      if (fnResults) setGlobeFlyToResults(() => fnResults);
    }}
    preferenceLocations={preferences.locations}
    searchResultIds={searchResultIds}
  />
</ErrorBoundary>
<GlobeLegend />

<PersonalizeCTA
  hasCompletedOnboarding={preferences.onboardingComplete}
  onOpenPreferences={handleOpenPreferences}
/>

<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} />
```

Remove the old search/filters section that was between the globe legend and the news feed.

- [ ] **Step 9: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: restructure page layout — search above globe with filter+fly behavior"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run build**

Run: `npx vite build`
Expected: Build succeeds, no errors

- [ ] **Step 4: Manual smoke test checklist**

Start dev server: `npx vite`

Verify:
1. Page loads, globe renders with country border fills colored by article heat
2. Scrolling past the globe scrolls the page (dormant state works)
3. "Click to interact" overlay is visible on the globe
4. Clicking the globe activates it — scroll now zooms
5. Pressing Escape deactivates the globe
6. Zooming all the way out + 3 more scroll-downs deactivates and shows "Scrolling page" toast
7. At high altitude: country fills visible, no blobs
8. Zooming in: country fills fade, radial blobs appear around articles
9. Search bar is above the globe in the dark band
10. Searching dims non-matching markers to 0.1 opacity and flies camera to results
11. Clearing search restores all markers to full opacity
12. Globe legend says "Click globe to interact"
13. On mobile viewport (resize browser): no overlay, pinch-to-zoom works, no radial blobs (performance)

- [ ] **Step 5: Commit any fixes from smoke testing**

Stage only the specific files that were fixed:

```bash
git add src/components/globe/ src/utils/ src/pages/Index.tsx
git commit -m "fix: smoke test fixes for globe rework"
```
