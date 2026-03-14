# Workstream 10: Investigate Page Mini-Map

## Goal

Add a small Leaflet map to the investigate page's Geographic Spread section, showing where each source in the cluster is located. Replaces the text-only view with a visual overview while keeping the source list below.

## Architecture

A new `ClusterMiniMap` component uses react-leaflet (already a dependency) to render a dark-themed 2D map with circle markers at each source's coordinates. Lazy-loaded to avoid bundling Leaflet on pages that don't need it. No new dependencies.

---

## 1. ClusterMiniMap Component

### File

`src/components/investigate/ClusterMiniMap.tsx`

### Props

```typescript
interface ClusterMiniMapProps {
  articles: NewsArticle[];  // pre-filtered to those with coordinates
  heatColor: string;        // cluster heat color (hex), used for all markers
}
```

### Rendering

- `MapContainer` at fixed height 280px, full width of the parent content column
- CARTO dark tiles: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` — same as `GlobeFallback.tsx`
- Background color: `#0a0a0f` (matches investigate page background)
- `zoomControl={false}`, `scrollWheelZoom={false}`, `dragging={false}`, `doubleClickZoom={false}`, `touchZoom={false}` — read-only overview map, no user interaction
- `attributionControl={true}` — required by tile provider license
- Rounded corners via `rounded-lg overflow-hidden` on the wrapper div

### Markers

One `CircleMarker` per article:
- `center`: `[article.coordinates.lat, article.coordinates.lng]`
- `radius`: 7 (fixed — no heat-based sizing, since all articles share the same cluster heat)
- `fillColor`: `heatColor` prop
- `fillOpacity`: 0.8
- `stroke`: `true`, `color`: `heatColor`, `weight`: 1, `opacity`: 0.3 — subtle glow ring
- No popups or tooltips (the source list below the map serves that purpose)

### Bounds Fitting

A small inner component `FitBounds` uses `useMap()` from react-leaflet to access the map instance after mount.

**Logic (in `useEffect`):**
- If 2+ unique coordinate positions exist: `map.fitBounds(bounds, { padding: [40, 40], animate: false })`
- If 1 article or all articles at the same position: `map.setView([lat, lng], 6, { animate: false })` — zoom level 6 gives city-level context
- Unique positions determined by rounding lat/lng to 1 decimal place (same logic as `countDistinctLocations` in `arcBuilder.ts`)

`animate: false` because the map is below the fold and animation on mount adds no value.

Dependencies: `useEffect` runs on `[articles]` (stable reference from parent's filter).

### Leaflet CSS

Import `leaflet/dist/leaflet.css` at the top of the component file — same pattern as `GlobeFallback.tsx`.

---

## 2. InvestigatePage Integration

### Lazy Loading

```typescript
const ClusterMiniMap = lazy(() => import('@/components/investigate/ClusterMiniMap'));
```

Added to the top of `InvestigatePage.tsx` alongside the existing `lazy` import from React (add `lazy, Suspense` to the React import).

### Geographic Spread Section — New Layout

Current layout:
1. Section heading ("Geographic Spread")
2. Summary line ("This story is covered from N distinct locations")
3. Source list (`<ul>` with source name — location)

New layout:
1. Section heading (unchanged)
2. Summary line (unchanged)
3. **`<Suspense fallback={null}><ClusterMiniMap articles={articlesWithCoords} heatColor={heatColor} /></Suspense>`** — rendered only when `articlesWithCoords.length > 0`
4. Source list (unchanged, below the map, with `mt-4` spacing)

The `Suspense fallback={null}` means the text list is immediately visible while Leaflet loads — no layout shift or loading spinner.

### Guard

The mini-map shares the same guard as the existing content: only rendered inside the `articlesWithCoords.length > 0` branch. No additional guards needed.

---

## 3. Files Affected

**New files:**
- `src/components/investigate/ClusterMiniMap.tsx` — mini-map component with `FitBounds` inner component

**Modified files:**
- `src/pages/InvestigatePage.tsx` — add `lazy`/`Suspense` imports, lazy-load `ClusterMiniMap`, render in Geographic Spread section

**Unchanged:**
- `src/components/globe/GlobeFallback.tsx` — separate component, no shared code extracted (patterns are similar but coupling them would complicate lazy loading)
- `src/utils/arcBuilder.ts` — `countDistinctLocations` reused conceptually but not imported (bounds logic is inline and simpler)
- No new dependencies

---

## 4. Styling Details

The map container uses a wrapper div with these classes:
- `rounded-lg overflow-hidden` — rounded corners clipping the tile layer
- `border border-ivory-200/10` — subtle border matching other investigate page sections
- `mb-4` — spacing before the source list below

The map's background color (`#0a0a0f`) is visible briefly while tiles load, matching the page background so there's no flash.

---

## 5. Non-Goals

- No marker popups or tooltips (source list below serves this purpose)
- No arcs or polylines connecting sources (future enhancement)
- No interaction (zoom, pan, click) — this is a read-only overview
- No shared base component with GlobeFallback (patterns are similar but decoupled for lazy-loading simplicity)
- No tests — pure visual component delegating to Leaflet's API
