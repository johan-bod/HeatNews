# Workstream 14: Visual Quality & France-First Scoping

## Goal

Fix visual clutter and performance issues at regional zoom, scope the default experience to France, add zoom limits and country selection, and fix SPA routing on GitHub Pages.

## Architecture

No new libraries. Changes touch globe utilities, globe view component, app defaults, and build config. The approach is conservative: fix what's broken, constrain what's overwhelming, and narrow the scope to one country so every feature can be validated before scaling.

---

## 1. GitHub Pages SPA Routing Fix

### Problem

The app uses `BrowserRouter` (history-based URLs). GitHub Pages returns a 404 for any path other than `/index.html`. Routes like `/app`, `/app/investigate`, and `/admin` fail on direct navigation or page refresh.

### Fix

Create `public/404.html` that captures the current path, encodes it as a query parameter, and redirects to `/index.html`. Then in `index.html`, add a script that restores the path from the query parameter before React mounts.

**`public/404.html`:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    // Redirect all 404s to index.html, preserving the path
    var path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(
      window.location.origin + '/?__spa_redirect=' + encodeURIComponent(path)
    );
  </script>
</head>
<body></body>
</html>
```

**`index.html` (add before existing scripts):**
```html
<script>
  (function() {
    var redirect = new URLSearchParams(window.location.search).get('__spa_redirect');
    if (redirect) {
      history.replaceState(null, '', decodeURIComponent(redirect));
    }
  })();
</script>
```

No changes to React Router or the app code itself.

---

## 2. France-First Default View

### Globe Starting Position

The globe already starts centered near France (46°N, 2°E) at altitude 2.5. Adjust to the meteorological bulletin framing:

| Parameter | Current | New |
|-----------|---------|-----|
| Latitude | 46°N | 46.5°N |
| Longitude | 2°E | 2.5°E |
| Altitude | 2.5 (Earth radii) | 0.8 (Earth radii) |

The altitude change is the significant one — dropping from 2.5 to 0.8 zooms from a full-globe view to mainland France filling the viewport (~42-51°N latitude range visible).

### Scale Default

Change `selectedScale` initial state from `'all'` to `'national'` in `AppPage.tsx`. Users can still switch to other scales.

### Data Unchanged

All data fetching remains global. The API calls, caching, and article processing pipelines are untouched. Only the default view and scale filter change.

---

## 3. Globe Zoom Limits

### Max Dezoom (Floor)

Set zoom distance limits so the globe can't shrink away or clip into the surface. In `GlobeView.tsx`, after the globe initializes, set:

```javascript
globe.controls().minDistance = globe.getGlobeRadius() * 1.02;  // closest zoom (~130 km altitude)
globe.controls().maxDistance = globe.getGlobeRadius() * 4.5;   // farthest zoom
```

`maxDistance = 4.5` keeps the full globe visible with margin. `minDistance = 1.02` allows zooming into city-level (local preset at 0.08 altitude = ~510 km) while preventing clipping into the surface.

### Per-Scale Zoom Presets

When the user selects a scale via the scale selector, fly the globe to a preset altitude. These are tuned for France but work reasonably for any single country:

| Scale | Altitude (Earth radii) | Approx km | What's visible |
|-------|----------------------|-----------|----------------|
| International | 2.5 | ~16,000 km | Full globe |
| National | 0.8 | ~5,100 km | Full country |
| Regional | 0.25 | ~1,600 km | A region/department cluster |
| Local | 0.08 | ~510 km | A city and surroundings |

The fly-to triggers in `AppPage.tsx` when `selectedScale` changes, calling `globeFlyTo` with the preset altitude. The lat/lng behavior depends on the current camera position: if the camera is within 10° of the active country's center, fly to the country center at the new altitude. If the camera is farther away (user has navigated elsewhere), keep the current lat/lng and only change the altitude. This prevents jarring jumps when a user is exploring a specific area and switches between regional/local scales.

---

## 4. Regional Visual Clutter Fix

### 4.1 Blob Polygon Reduction

The `generateBlobPolygon()` function in `territoryHalos.ts` creates 32-point circles per article. At regional zoom with 100+ articles, this generates thousands of polygon points.

**Fix:** Reduce to 8 points per blob. The visual difference is minimal (blobs are translucent fills, not precise shapes). This cuts polygon point count by 75%.

Additionally, skip blob generation entirely when altitude < 500 km (local view). Note: the existing `crossfadeOpacity` function already fades blobs to 0 opacity below 2,500 km, so blobs are visually invisible at local zoom. This skip is a pure performance optimization — avoiding the computation of invisible geometry.

### 4.2 Hex-Bin Layer Throttle

The hex-bin heatmap layer recomputes via a `useEffect` on the `articles` prop. While this doesn't recompute per zoom frame (it uses the full unfiltered article set), it does recompute on every data refresh and search/filter change, which can be frequent.

**Fix:** Debounce hex-bin layer updates with a 300ms delay after the last `articles` prop change. Use a ref to track the timeout and clear it on each new change. This smooths out rapid successive updates during data loading.

### 4.3 RAF Pulse Animation Optimization

The `requestAnimationFrame` loop for very-hot marker pulse runs continuously, even when the globe is scrolled out of view.

**Fix:** Use an `IntersectionObserver` on the globe container. When the globe is not in the viewport, pause the RAF loop. Resume when it re-enters.

### 4.4 Marker Density at Regional Zoom

At regional zoom, many markers overlap and create an indecipherable yellow mass. The current approach renders up to 200 individual markers.

**Fix:** At regional and local zoom levels (altitude < 3000 km), apply spatial clustering:
- Group markers within 0.5° lat/lng of each other into a single cluster marker
- The cluster marker shows the count and uses the highest heat color in the group
- Clicking a cluster marker zooms in one scale level (e.g., regional → local) centered on the cluster's position, which should spread out the individual markers. The normal popup is suppressed for cluster markers — only individual markers open popups
- Implementation: a `clusterMarkers()` utility function that takes markers + a distance threshold and returns clustered markers with a `count` property
- The cluster marker size scales with count: `Math.min(1.5, 0.4 + count * 0.1)`

This is only applied when there are 20+ markers in the current view. Below that threshold, individual markers are shown.

---

## 5. Country Selector

### Component

A dropdown in the upper-left area of the globe (both the country selector and scale indicator will move to upper-left — see Section 6 for the repositioning). Initially contains only "France" but structured as a data-driven list for easy expansion.

**Data structure** (new file `src/data/countries.ts`):
```typescript
interface CountryConfig {
  code: string;          // ISO 3166-1 alpha-2
  name: string;
  center: { lat: number; lng: number };
  nationalAltitude: number;  // meteorological bulletin scale
}

export const COUNTRIES: CountryConfig[] = [
  { code: 'FR', name: 'France', center: { lat: 46.5, lng: 2.5 }, nationalAltitude: 0.8 },
];
```

### Behavior

- Selecting a country flies the globe to that country's center at national altitude
- Updates `selectedScale` to `'national'`
- The country selector and scale selector work together: changing country resets scale to national, changing scale keeps the current country

### UI

Small dropdown, styled consistently with existing controls. Shows flag emoji + country name. When only one country is available, it renders as a static label (no dropdown arrow).

---

## 6. Scale Indicator & Refresh Button Repositioning

### Problem

The scale indicator (bottom-left of globe) overlaps with the refresh button (also bottom-left of page). Both compete for the same space.

### Fix

**Scale indicator + country selector → upper-left corner of the globe container.** Layout: country name (or selector) on one line, scale level + article count on the line below. Semi-transparent dark background pill.

**Refresh button → below the globe, near the advanced filters.** Remove `position: fixed` so it scrolls with the page. Place it as a small inline element near the filter controls rather than a floating button.

---

## 7. Investigate Page Bug Verification

### Root Cause

The investigate link in feed cards uses `navigate('/app/investigate?article=...')` with router state. This works for client-side navigation. The GitHub Pages 404 fix (Section 1) addresses direct URL access.

### Verification

After the 404.html fix is deployed:
1. Click "Investigate this story →" from a feed card — should navigate correctly (client-side)
2. Refresh the investigate page — should reload correctly (404.html redirect)
3. Share an investigate URL directly — should load correctly

If the link doesn't appear on cards, the issue is that most articles are in single-article clusters (the button only renders for clusters with 2+ articles). This is expected behavior, not a bug — but with France-first scoping and better clustering, more articles should form multi-article clusters.

---

## 8. Files Affected

**New files:**
- `public/404.html` — SPA redirect for GitHub Pages
- `src/data/countries.ts` — Country configuration data

**Modified files:**
- `index.html` — SPA redirect restoration script
- `src/pages/AppPage.tsx` — default scale to 'national', default globe position to France
- `src/components/globe/GlobeView.tsx` — zoom limits (min/maxDistance), per-scale fly-to presets, RAF IntersectionObserver optimization, spatial marker clustering, scale indicator repositioned to upper-left
- `src/utils/territoryHalos.ts` — reduce blob points from 32 to 8, skip blobs at local zoom
- `src/utils/globeUtils.ts` — add `clusterMarkers()` utility, export country presets
- `src/components/globe/GlobeMarkers.ts` — integrate clustering into the marker pipeline
- `src/components/GlobeLegend.tsx` — restructure from full-width bar below globe to compact overlay pill in upper-left of globe container, add country display
- `src/pages/AppPage.tsx` (additional) — move refresh button wrapper from `fixed bottom-4 left-4` to inline position near filters (the fixed positioning is on the wrapper div in AppPage, not in RefreshIndicator itself)

**Intentionally unchanged:**
- All API/data fetching code — global data pipeline untouched
- `src/components/NewsSearch.tsx` — search functionality unchanged
- `src/components/NewsFilters.tsx` — filter functionality unchanged (layout changes deferred to WS12)
- `src/pages/LandingPage.tsx` — landing page untouched
- `src/pages/InvestigatePage.tsx` — investigate page untouched

---

## 9. Non-Goals

- No changes to the data fetching pipeline or API calls
- No changes to the landing page (WS11)
- No search/filter layout changes (deferred to WS12)
- No dormant/active interaction model changes (deferred to WS13)
- No overseas territory insets (deferred to dedicated workstream)
- No new countries beyond France (infrastructure ready, data added later)
- No feed virtualization or GlobeView refactoring (separate concerns)
