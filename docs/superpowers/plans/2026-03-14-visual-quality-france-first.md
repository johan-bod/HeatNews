# Visual Quality & France-First Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix visual clutter at regional zoom, scope default experience to France, add zoom limits and country selection, and fix SPA routing on GitHub Pages.

**Architecture:** Conservative changes to existing globe utilities and view component. No new libraries. Add 404.html for GitHub Pages SPA routing, reduce blob polygon complexity, add spatial marker clustering, set zoom distance limits, reposition UI controls, and add country config data.

**Tech Stack:** React 19, TypeScript, globe.gl, Three.js, Vite

---

## Chunk 1: SPA Routing, France Defaults, Zoom Limits & Performance

### File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `public/404.html` | GitHub Pages SPA redirect |
| Modify | `index.html` | SPA path restoration script |
| Create | `src/data/countries.ts` | Country config (center, zoom presets) |
| Modify | `src/pages/AppPage.tsx` | Default scale, refresh button repositioning, scale-change fly-to |
| Modify | `src/components/globe/GlobeView.tsx` | Zoom limits, RAF IntersectionObserver, scale indicator reposition |
| Modify | `src/utils/territoryHalos.ts` | Reduce blob points, skip at low altitude |
| Modify | `src/utils/globeUtils.ts` | Add `clusterMarkers()` utility |
| Modify | `src/components/globe/GlobeMarkers.ts` | Integrate clustering into marker pipeline |
| Modify | `src/components/GlobeLegend.tsx` | Restructure to compact overlay pill in upper-left of globe |

---

### Task 1: GitHub Pages SPA Routing Fix

**Files:**
- Create: `public/404.html`
- Modify: `index.html`

- [ ] **Step 1: Create 404.html**

Create `public/404.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    var path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(
      window.location.origin + '/?__spa_redirect=' + encodeURIComponent(path)
    );
  </script>
</head>
<body></body>
</html>
```

- [ ] **Step 2: Add path restoration to index.html**

In `index.html`, add the following script inside `<head>`, after the Google Fonts links (before `</head>`):

```html
    <!-- SPA redirect restoration for GitHub Pages -->
    <script>
      (function() {
        var redirect = new URLSearchParams(window.location.search).get('__spa_redirect');
        if (redirect) {
          history.replaceState(null, '', decodeURIComponent(redirect));
        }
      })();
    </script>
```

- [ ] **Step 3: Verify build includes 404.html**

Run: `npx vite build && ls dist/404.html`
Expected: File exists in `dist/` output (Vite copies `public/` contents to `dist/`)

- [ ] **Step 4: Commit**

```bash
git add public/404.html index.html
git commit -m "fix: add SPA routing support for GitHub Pages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Country Config & France-First Defaults

**Files:**
- Create: `src/data/countries.ts`
- Modify: `src/pages/AppPage.tsx:93` — default scale
- Modify: `src/components/globe/GlobeView.tsx:257` — initial globe position

- [ ] **Step 1: Create countries data file**

Create `src/data/countries.ts`:

```typescript
export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  center: { lat: number; lng: number };
  nationalAltitude: number;
}

export const SCALE_ALTITUDES = {
  international: 2.5,
  national: 0.8,
  regional: 0.25,
  local: 0.08,
} as const;

export const COUNTRIES: CountryConfig[] = [
  { code: 'FR', name: 'France', flag: '🇫🇷', center: { lat: 46.5, lng: 2.5 }, nationalAltitude: 0.8 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];
```

- [ ] **Step 2: Update default scale in AppPage.tsx**

In `src/pages/AppPage.tsx`, change line 93 from:
```tsx
  const [selectedScale, setSelectedScale] = useState<ScaleFilter>('all');
```
to:
```tsx
  const [selectedScale, setSelectedScale] = useState<ScaleFilter>('national');
```

- [ ] **Step 3: Update initial globe position in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, change line 257 from:
```tsx
    globe.pointOfView({ lat: 46, lng: 2, altitude: 2.5 }, 0);
```
to:
```tsx
    globe.pointOfView({ lat: 46.5, lng: 2.5, altitude: 0.8 }, 0);
```

- [ ] **Step 4: Update handleClearFilters in AppPage.tsx**

In `src/pages/AppPage.tsx`, find the `handleClearFilters` callback (line 288-295). Change lines 291 and 294:
```tsx
    setSelectedScale('all');
```
to:
```tsx
    setSelectedScale('national');
```
and:
```tsx
    if (globeFlyTo) globeFlyTo(46, 2, 2.5);
```
to:
```tsx
    if (globeFlyTo) globeFlyTo(46.5, 2.5, 0.8);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/data/countries.ts src/pages/AppPage.tsx src/components/globe/GlobeView.tsx
git commit -m "feat: France-first defaults — national scale, centered on France

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Globe Zoom Limits & Per-Scale Fly-To

**Files:**
- Modify: `src/components/globe/GlobeView.tsx:256-263` — add zoom limits after globe init + scale-change fly-to effect

- [ ] **Step 1: Add zoom distance limits in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, after the line `globe.pointOfView({ lat: 46.5, lng: 2.5, altitude: 0.8 }, 0);` (which was updated in Task 2), add:

```tsx
    // Set zoom distance limits
    const controls = globe.controls() as any;
    if (controls) {
      const radius = globe.getGlobeRadius();
      controls.minDistance = radius * 1.02;  // prevent clipping into surface
      controls.maxDistance = radius * 4.5;   // prevent globe shrinking away
    }
```

And remove the existing `controls` block that follows (lines 260-263):
```tsx
    // Disable zoom by default (dormant state)
    const controls = globe.controls() as any;
    if (controls && !isMobile) {
      controls.noZoom = true;
    }
```

Replace it with (appended to the new controls block):
```tsx
      if (!isMobile) {
        controls.noZoom = true;  // dormant state: zoom disabled until click
      }
```

The full merged block should be:
```tsx
    // Set zoom distance limits + dormant state
    const controls = globe.controls() as any;
    if (controls) {
      const radius = globe.getGlobeRadius();
      controls.minDistance = radius * 1.02;
      controls.maxDistance = radius * 4.5;
      if (!isMobile) {
        controls.noZoom = true;
      }
    }
```

- [ ] **Step 2: Add scale-change fly-to effect in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, add a new import at the top:
```tsx
import { DEFAULT_COUNTRY, SCALE_ALTITUDES } from '@/data/countries';
```

Then add a new `useEffect` after the zoom limits block (after the `controls` block from Step 1). This goes in GlobeView where `globeRef` is available, not AppPage:

```tsx
  // Fly to preset altitude when scale changes
  useEffect(() => {
    if (!globeFlyTo || selectedScale === 'all') return;
    const altitude = SCALE_ALTITUDES[selectedScale as keyof typeof SCALE_ALTITUDES];
    if (!altitude) return;

    // If camera is within 10° of active country center, fly to country center.
    // Otherwise keep current lat/lng and only change altitude.
    const countryCenter = DEFAULT_COUNTRY.center;
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView();
      const dLat = Math.abs(pov.lat - countryCenter.lat);
      const dLng = Math.abs(pov.lng - countryCenter.lng);
      if (dLat <= 10 && dLng <= 10) {
        globeFlyTo(countryCenter.lat, countryCenter.lng, altitude);
      } else {
        globeFlyTo(pov.lat, pov.lng, altitude);
      }
    } else {
      globeFlyTo(countryCenter.lat, countryCenter.lng, altitude);
    }
  }, [selectedScale]); // eslint-disable-line react-hooks/exhaustive-deps
```

Note: This requires `globeRef` to be accessible from AppPage. Since `globeRef` is internal to GlobeView, we need to expose the current POV. The simplest approach: add an `onScaleChange` callback prop to GlobeView that handles the fly-to internally, or lift the logic into GlobeView with a `selectedScale` prop (which GlobeView already receives). **Better approach:** Move this effect into GlobeView.tsx where `globeRef` is available. Add to GlobeView after the zoom limits block:

```tsx
  // Fly to preset altitude when scale changes
  const prevScaleRef = useRef(selectedScale);
  useEffect(() => {
    if (!globeRef.current || selectedScale === 'all' || selectedScale === prevScaleRef.current) return;
    prevScaleRef.current = selectedScale;
    const altitude = SCALE_ALTITUDES[selectedScale as keyof typeof SCALE_ALTITUDES];
    if (!altitude) return;

    const countryCenter = DEFAULT_COUNTRY.center;
    const pov = globeRef.current.pointOfView();
    const dLat = Math.abs(pov.lat - countryCenter.lat);
    const dLng = Math.abs(pov.lng - countryCenter.lng);
    if (dLat <= 10 && dLng <= 10) {
      globeRef.current.pointOfView({ lat: countryCenter.lat, lng: countryCenter.lng, altitude }, 1000);
    } else {
      globeRef.current.pointOfView({ ...pov, altitude }, 1000);
    }
    autoRotation.onUserInteraction();
  }, [selectedScale, autoRotation]);
```

Remove the AppPage.tsx version of this effect entirely. The import of `DEFAULT_COUNTRY, SCALE_ALTITUDES` goes in GlobeView.tsx instead.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobeView.tsx
git commit -m "feat: add zoom limits and per-scale fly-to presets

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Blob Polygon Reduction & Performance Fixes

**Files:**
- Modify: `src/utils/territoryHalos.ts:65` — reduce BLOB_POINTS
- Modify: `src/components/globe/GlobeView.tsx:148-171` — skip blobs at low altitude
- Modify: `src/components/globe/GlobeView.tsx:412-422` — debounce hex-bin updates
- Modify: `src/components/globe/GlobeView.tsx:424-451` — IntersectionObserver for RAF

- [ ] **Step 1: Reduce blob polygon points**

In `src/utils/territoryHalos.ts`, change line 65 from:
```tsx
const BLOB_POINTS = 32;
```
to:
```tsx
const BLOB_POINTS = 8;
```

- [ ] **Step 2: Skip blob generation at low altitude**

In `src/components/globe/GlobeView.tsx`, in the `mergedPolygons` useMemo (around line 148-150), change:
```tsx
    if (blobOpacity > 0 && !isMobile) {
```
to:
```tsx
    if (blobOpacity > 0 && !isMobile && altitudeKm > 500) {
```

Also verify that `altitudeKm` is in the `mergedPolygons` useMemo dependency array. It's already captured via `crossfadeOpacity(altitudeKm)` on line 131, but if it's not in the deps array, add it.

- [ ] **Step 3: Debounce hex-bin layer updates**

In `src/components/globe/GlobeView.tsx`, replace the hex-bin update effect (lines 412-422):
```tsx
  // Update hex-bin heatmap when articles change
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.hexBinPointsData(
      articles.filter(a => a.coordinates).map(a => ({
        lat: a.coordinates!.lat,
        lng: a.coordinates!.lng,
        heatLevel: a.heatLevel || 0,
      }))
    );
  }, [articles]);
```

with:
```tsx
  // Update hex-bin heatmap when articles change (debounced)
  const hexBinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!globeRef.current) return;
    if (hexBinTimeoutRef.current) clearTimeout(hexBinTimeoutRef.current);
    hexBinTimeoutRef.current = setTimeout(() => {
      if (!globeRef.current) return;
      globeRef.current.hexBinPointsData(
        articles.filter(a => a.coordinates).map(a => ({
          lat: a.coordinates!.lat,
          lng: a.coordinates!.lng,
          heatLevel: a.heatLevel || 0,
        }))
      );
    }, 300);
    return () => {
      if (hexBinTimeoutRef.current) clearTimeout(hexBinTimeoutRef.current);
    };
  }, [articles]);
```

- [ ] **Step 4: Add IntersectionObserver for RAF loop**

In `src/components/globe/GlobeView.tsx`, replace the RAF animation effect (lines 424-451):
```tsx
  // Auto-rotation + very-hot marker pulse animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (globeRef.current) {
        if (!isMobile) {
          const angle = autoRotation.getRotationAngle();
          if (angle !== null && globeRef.current) {
            const pov = globeRef.current.pointOfView();
            globeRef.current.pointOfView({ lat: pov.lat, lng: angle, altitude: pov.altitude }, 0);
          }
        }

        const time = Date.now() / 1000;
        globeRef.current.pointAltitude((d: object) => {
          const marker = d as GlobeMarkerData;
          if (marker.heatLevel >= 81) {
            return 0.01 + Math.sin(time * 2) * 0.008;
          }
          return 0.01;
        });
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isMobile, autoRotation]);
```

with:
```tsx
  // Auto-rotation + very-hot marker pulse animation loop (pauses when off-screen)
  const isVisibleRef = useRef(true);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (globeRef.current && isVisibleRef.current) {
        if (!isMobile) {
          const angle = autoRotation.getRotationAngle();
          if (angle !== null && globeRef.current) {
            const pov = globeRef.current.pointOfView();
            globeRef.current.pointOfView({ lat: pov.lat, lng: angle, altitude: pov.altitude }, 0);
          }
        }

        const time = Date.now() / 1000;
        globeRef.current.pointAltitude((d: object) => {
          const marker = d as GlobeMarkerData;
          if (marker.heatLevel >= 81) {
            return 0.01 + Math.sin(time * 2) * 0.008;
          }
          return 0.01;
        });
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isMobile, autoRotation]);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/territoryHalos.ts src/components/globe/GlobeView.tsx
git commit -m "perf: reduce blob points, debounce hex-bin, pause RAF when off-screen

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Spatial Marker Clustering

**Files:**
- Modify: `src/utils/globeUtils.ts` — add `clusterMarkers()` function
- Modify: `src/components/globe/GlobeMarkers.ts` — add cluster type + integrate clustering

- [ ] **Step 1: Add clusterMarkers utility**

In `src/utils/globeUtils.ts`, add at the end of the file:

```typescript
/**
 * Spatial clustering: groups nearby markers into cluster markers.
 * Returns original markers with cluster markers replacing groups.
 * Only clusters when 20+ markers in view.
 */
export interface ClusteredMarker {
  lat: number;
  lng: number;
  count: number;
  maxHeatLevel: number;
  color: string;
  articles: NewsArticle[];
}

export function clusterMarkers(
  articles: NewsArticle[],
  distanceThreshold: number = 0.5
): { singles: NewsArticle[]; clusters: ClusteredMarker[] } {
  if (articles.length < 20) {
    return { singles: articles, clusters: [] };
  }

  const used = new Set<number>();
  const clusters: ClusteredMarker[] = [];
  const singles: NewsArticle[] = [];

  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue;
    const a = articles[i];
    if (!a.coordinates) { singles.push(a); continue; }

    const group: NewsArticle[] = [a];
    used.add(i);

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(j)) continue;
      const b = articles[j];
      if (!b.coordinates) continue;

      const dLat = Math.abs(a.coordinates.lat - b.coordinates.lat);
      const dLng = Math.abs(a.coordinates.lng - b.coordinates.lng);
      if (dLat <= distanceThreshold && dLng <= distanceThreshold) {
        group.push(b);
        used.add(j);
      }
    }

    if (group.length === 1) {
      singles.push(a);
    } else {
      const maxHeat = Math.max(...group.map(g => g.heatLevel || 0));
      const avgLat = group.reduce((s, g) => s + g.coordinates!.lat, 0) / group.length;
      const avgLng = group.reduce((s, g) => s + g.coordinates!.lng, 0) / group.length;
      clusters.push({
        lat: avgLat,
        lng: avgLng,
        count: group.length,
        maxHeatLevel: maxHeat,
        color: getMarkerColor(maxHeat),
        articles: group,
      });
    }
  }

  return { singles, clusters };
}
```

- [ ] **Step 2: Update GlobeMarkers to support clustering**

Replace the entire content of `src/components/globe/GlobeMarkers.ts` with:

```typescript
import type { NewsArticle } from '@/types/news';
import { getMarkerSize, getMarkerColor, clusterMarkers, type ClusteredMarker } from '@/utils/globeUtils';

export interface GlobeMarkerData {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  opacity: number;
  heatLevel: number;
  article: NewsArticle;
  label: string;
  isCluster: boolean;
  clusterCount: number;
  clusterArticles: NewsArticle[];
}

/**
 * Convert filtered articles into globe marker data points.
 * When altitudeKm < 3000, applies spatial clustering to reduce visual clutter.
 */
export function articlesToMarkers(
  articles: NewsArticle[],
  searchResultIds?: Set<string> | null,
  altitudeKm?: number
): GlobeMarkerData[] {
  const withCoords = articles.filter(a => a.coordinates);
  const shouldCluster = altitudeKm !== undefined && altitudeKm < 3000;

  if (!shouldCluster) {
    return withCoords.map(a => ({
      id: a.id,
      lat: a.coordinates!.lat,
      lng: a.coordinates!.lng,
      size: getMarkerSize(a.heatLevel || 0),
      color: getMarkerColor(a.heatLevel || 0),
      opacity: searchResultIds ? (searchResultIds.has(a.id) ? 1.0 : 0.1) : 1.0,
      heatLevel: a.heatLevel || 0,
      article: a,
      label: a.title,
      isCluster: false,
      clusterCount: 1,
      clusterArticles: [],
    }));
  }

  const { singles, clusters } = clusterMarkers(withCoords);

  const singleMarkers: GlobeMarkerData[] = singles
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
      isCluster: false,
      clusterCount: 1,
      clusterArticles: [],
    }));

  const clusterMarkerData: GlobeMarkerData[] = clusters.map((c: ClusteredMarker, i: number) => ({
    id: `cluster-${i}`,
    lat: c.lat,
    lng: c.lng,
    size: Math.min(1.5, 0.4 + c.count * 0.1),
    color: c.color,
    opacity: 1.0,
    heatLevel: c.maxHeatLevel,
    article: c.articles[0], // representative article for tooltip
    label: `${c.count} stories`,
    isCluster: true,
    clusterCount: c.count,
    clusterArticles: c.articles,
  }));

  return [...singleMarkers, ...clusterMarkerData];
}
```

- [ ] **Step 3: Pass altitudeKm to articlesToMarkers in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, change the markers useMemo (lines 122-125) from:
```tsx
  const markers = useMemo(
    () => articlesToMarkers(visibleArticles, searchResultIds),
    [visibleArticles, searchResultIds]
  );
```
to:
```tsx
  const markers = useMemo(
    () => articlesToMarkers(visibleArticles, searchResultIds, altitudeKm),
    [visibleArticles, searchResultIds, altitudeKm]
  );
```

- [ ] **Step 4: Handle cluster click in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, add the import for SCALE_ALTITUDES:
```tsx
import { SCALE_ALTITUDES } from '@/data/countries';
```

Then update the `onPointClick` handler (around line 208-213) from:
```tsx
      .onPointClick((point: object) => {
        const marker = point as GlobeMarkerData;
        setSelectedArticle(marker.article);
        const coords = globe.getScreenCoords(marker.lat, marker.lng);
        setPopupPosition(coords ? { x: coords.x, y: coords.y } : { x: 0, y: 0 });
      })
```
to:
```tsx
      .onPointClick((point: object) => {
        const marker = point as GlobeMarkerData;
        if (marker.isCluster) {
          // Zoom in one level on cluster click
          const currentAlt = globe.pointOfView().altitude;
          let targetAlt = currentAlt * 0.3;
          if (targetAlt < SCALE_ALTITUDES.local) targetAlt = SCALE_ALTITUDES.local;
          globe.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: targetAlt }, 1000);
          autoRotation.onUserInteraction();
          return;
        }
        setSelectedArticle(marker.article);
        const coords = globe.getScreenCoords(marker.lat, marker.lng);
        setPopupPosition(coords ? { x: coords.x, y: coords.y } : { x: 0, y: 0 });
      })
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/globeUtils.ts src/components/globe/GlobeMarkers.ts src/components/globe/GlobeView.tsx
git commit -m "feat: spatial marker clustering at regional/local zoom to reduce clutter

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Scale Indicator Reposition & Refresh Button Move

**Files:**
- Modify: `src/components/globe/GlobeView.tsx:499-521` — move scale indicator to upper-left
- Modify: `src/components/GlobeLegend.tsx` — restructure to compact overlay
- Modify: `src/pages/AppPage.tsx:419-441` — move refresh controls inline

- [ ] **Step 1: Move scale indicator to upper-left in GlobeView.tsx**

In `src/components/globe/GlobeView.tsx`, replace the zoom level indicator block (lines 499-521):
```tsx
      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 font-body text-xs text-ivory-200/60">
          {altitudeKm > 8000 && 'International view'}
          {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
          {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
          {altitudeKm <= 800 && 'Local view'}
          <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
          {!isMobile && (
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              className="ml-2 text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
              title={soundOn ? 'Mute discovery sound' : 'Enable discovery sound'}
            >
              {soundOn ? <Volume2 className="w-3 h-3 inline" /> : <VolumeX className="w-3 h-3 inline" />}
            </button>
          )}
        </div>
      </div>
```

with:
```tsx
      {/* Scale indicator + country — upper-left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-2 font-body text-xs">
          <div className="text-ivory-200/80 font-semibold">
            🇫🇷 France
          </div>
          <div className="text-ivory-200/50 mt-0.5">
            {altitudeKm > 8000 && 'International view'}
            {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
            {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
            {altitudeKm <= 800 && 'Local view'}
            <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
          </div>
          {!isMobile && (
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              className="mt-1 text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
              title={soundOn ? 'Mute discovery sound' : 'Enable discovery sound'}
            >
              {soundOn ? <Volume2 className="w-3 h-3 inline" /> : <VolumeX className="w-3 h-3 inline" />}
            </button>
          )}
        </div>
      </div>
```

- [ ] **Step 2: Simplify GlobeLegend to compact heat scale only**

The country label and scale info have moved to the GlobeView upper-left overlay (Step 1). GlobeLegend now only needs the heat scale. Interaction hints are removed since the globe's dormant/active click model makes them less relevant.

Replace the entire content of `src/components/GlobeLegend.tsx` with:

```tsx
export default function GlobeLegend() {
  return (
    <div className="w-full bg-navy-900 border-t border-ivory-200/5">
      <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4">
        <span className="font-body text-[10px] text-ivory-200/30 uppercase tracking-wider">Heat</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="font-body text-[10px] text-ivory-200/25">Cold</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-body text-[10px] text-ivory-200/25">Warm</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            <span className="font-body text-[10px] text-ivory-200/25">Hot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Move refresh controls from fixed to inline in AppPage.tsx**

In `src/pages/AppPage.tsx`, replace the refresh controls block (lines 418-441):
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

with:
```tsx
      {/* Refresh controls — inline below globe legend */}
      <div className="w-full bg-navy-900 border-b border-ivory-200/5">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-center gap-4 flex-wrap">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="bg-transparent text-ivory-200/60 hover:text-amber-400 border-ivory-200/10 hover:border-amber-500/30 font-body text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            <span className="font-body text-[10px] text-ivory-200/25">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/globe/GlobeView.tsx src/components/GlobeLegend.tsx src/pages/AppPage.tsx
git commit -m "feat: reposition scale indicator to upper-left, move refresh controls inline

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Post-Deployment Verification: Investigate Page

After deploying to GitHub Pages, verify the SPA routing fix works for the investigate page:

- [ ] **Step 1:** Navigate to a feed card → click "Investigate this story →" → should navigate correctly (client-side)
- [ ] **Step 2:** Refresh the investigate page → should reload correctly (404.html redirect)
- [ ] **Step 3:** Share/paste an investigate URL directly → should load correctly
