# Investigate Page Mini-Map Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Leaflet mini-map to the investigate page's Geographic Spread section showing source locations as circle markers.

**Architecture:** A new `ClusterMiniMap` component renders a read-only Leaflet map with auto-fitted bounds. Lazy-loaded from `InvestigatePage` via `React.lazy` + `Suspense` to keep Leaflet out of the main bundle.

**Tech Stack:** React 19, TypeScript, react-leaflet 5.0.0, Leaflet 1.9.4, Tailwind CSS

---

## Chunk 1: Implementation

### File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/investigate/ClusterMiniMap.tsx` | Leaflet mini-map with circle markers and auto-fit bounds |
| Modify | `src/pages/InvestigatePage.tsx` | Lazy-load and render ClusterMiniMap in Geographic Spread section |

No tests — spec explicitly states this is a pure visual component delegating to Leaflet's API.

---

### Task 1: Create ClusterMiniMap Component

**Files:**
- Create: `src/components/investigate/ClusterMiniMap.tsx` (new directory `src/components/investigate/`)

- [ ] **Step 1: Create the component file**

```tsx
// src/components/investigate/ClusterMiniMap.tsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { NewsArticle } from '@/types/news';
import 'leaflet/dist/leaflet.css';

interface ClusterMiniMapProps {
  articles: NewsArticle[];
  heatColor: string;
}

function FitBounds({ articles }: { articles: NewsArticle[] }) {
  const map = useMap();

  useEffect(() => {
    if (articles.length === 0) return;

    const coords: [number, number][] = articles.map(a => [a.coordinates!.lat, a.coordinates!.lng]);

    // Check unique positions (rounded to 1 decimal)
    const unique = new Set(coords.map(([lat, lng]) => `${Math.round(lat * 10)},${Math.round(lng * 10)}`));

    if (unique.size >= 2) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], animate: false });
    } else {
      map.setView(coords[0], 6, { animate: false });
    }
  }, [articles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function ClusterMiniMap({ articles, heatColor }: ClusterMiniMapProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-ivory-200/10 mb-4">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="w-full"
        style={{ height: 280, background: '#0a0a0f' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {articles.map(article => (
          <CircleMarker
            key={article.id}
            center={[article.coordinates!.lat, article.coordinates!.lng]}
            radius={7}
            fillColor={heatColor}
            fillOpacity={0.8}
            stroke={true}
            color={heatColor}
            weight={1}
            opacity={0.3}
          />
        ))}
        <FitBounds articles={articles} />
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/investigate/ClusterMiniMap.tsx
git commit -m "feat: add ClusterMiniMap component with Leaflet markers and auto-fit bounds"
```

---

### Task 2: Integrate ClusterMiniMap into InvestigatePage

**Files:**
- Modify: `src/pages/InvestigatePage.tsx:1-2` (React import)
- Modify: `src/pages/InvestigatePage.tsx:281-311` (Geographic Spread section)

- [ ] **Step 1: Update React import to include lazy and Suspense**

Change line 1 of `src/pages/InvestigatePage.tsx` from:
```typescript
import { useMemo } from 'react';
```
to:
```typescript
import { useMemo, lazy, Suspense } from 'react';
```

- [ ] **Step 2: Add lazy import for ClusterMiniMap**

Add after the last import (line 17, after the `analyzeEditorialPerspective` import):
```typescript
const ClusterMiniMap = lazy(() => import('@/components/investigate/ClusterMiniMap'));
```

- [ ] **Step 3: Add mini-map to Geographic Spread section**

In the Geographic Spread section (line 286-305), insert the `Suspense`-wrapped `ClusterMiniMap` between the summary `<p>` tag and the `<ul>` source list. The current code:

```tsx
            <>
              <p className="text-sm text-ivory-200/40 mb-2">
                This story is covered from {distinctLocations} distinct location{distinctLocations !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-1">
```

Becomes:

```tsx
            <>
              <p className="text-sm text-ivory-200/40 mb-2">
                This story is covered from {distinctLocations} distinct location{distinctLocations !== 1 ? 's' : ''}
              </p>
              <Suspense fallback={<div style={{ height: 280 }} />}>
                <ClusterMiniMap articles={articlesWithCoords} heatColor={heatColor} />
              </Suspense>
              <ul className="space-y-1 mt-4">
```

Note: `mt-4` added to `<ul>` for spacing below the map (replaces the previous `mb-2` gap from the summary line which is now consumed by the map).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass (275+)

- [ ] **Step 6: Commit**

```bash
git add src/pages/InvestigatePage.tsx
git commit -m "feat: integrate ClusterMiniMap into investigate page Geographic Spread section"
```
