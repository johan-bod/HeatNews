# Globe Rework & Search Relocation — Design Spec

## Goal

Rework the HeatStory globe interaction model, add territory halos for geographic coverage visualization, fix scroll hijacking, and relocate search above the globe with filter+fly behavior.

## Context

The current globe (`GlobeView.tsx`, 320 lines) uses Globe.gl with `pointsData` (article markers), `hexBinData` (ambient heat glow), and `polygonsData` (country borders from world-atlas TopoJSON). Articles are plotted as point markers colored by heat level. The globe captures scroll events for zoom, which blocks page scrolling. Search and filters sit below the globe, disconnected from it visually and functionally.

---

## 1. Scroll Interaction — Click-to-Activate with Max-Dezoom Release

### Problem

Globe.gl intercepts mouse wheel events for zoom control. When the user scrolls down the page and their cursor passes over the globe, the page stops scrolling and the globe zooms instead.

### Design

**States:**

| State | Scroll behavior | Visual indicator |
|-------|----------------|-----------------|
| Dormant (default) | Passes through to page | Semi-transparent overlay: "Click to interact" |
| Active | Controls globe zoom | Cursor: `grab`/`grabbing`, no overlay |

**Transitions:**

- **Dormant → Active**: User clicks on the globe.
- **Active → Dormant** (any of):
  - User presses Escape.
  - User clicks outside the globe container.
  - **Max-dezoom release**: Globe reaches minimum zoom altitude. After a buffer of 3 additional scroll-down events at max zoom, the globe auto-deactivates and page scroll resumes. A brief "Scrolling page" text fades in/out (1s) at the bottom of the globe to confirm the transition.

**Mobile behavior:**
- Pinch-to-zoom works directly on touch (no activation needed — touch has no scroll ambiguity since single-finger swipe scrolls the page).
- No overlay on mobile.

### Implementation approach

- Wrap globe container in a div that intercepts wheel events.
- Globe.gl uses `TrackballControls` (not OrbitControls). Toggle `controls().noZoom = true` in dormant state, `controls().noZoom = false` in active state.
- In dormant state: wheel events pass through to the page (noZoom prevents globe from consuming them).
- In active state: Globe.gl handles wheel events normally for zoom.
- Track consecutive scroll-down events at min altitude for the buffer logic (increment a counter on each `wheel` event with `deltaY > 0` while altitude is at minimum; reset counter on any zoom-in or state change).

### Auto-rotation update

- Auto-rotation (existing 4s idle timer, 0.15 deg/frame) continues unchanged.
- In active state, force `isRotating` to `false` and suppress the idle timer — no rotation while the user is interacting with the globe.
- On transition back to dormant, call `onUserInteraction()` to restart the idle timer. Rotation resumes after the 4s idle timeout elapses.

---

## 2. Territory Halos — Hybrid Country + Radial Clusters

### Problem

Point markers alone don't convey geographic reach of coverage. A story covered by Reuters has global influence; a story from Ouest-France covers Brittany. Both currently look like dots.

### Design

**High altitude (zoomed out — above 2500km, full opacity above 3500km):**

- Country-level polygon fill using the existing TopoJSON `countries-110m.json` data already loaded for borders.
- Each country containing articles gets a colored fill based on the **highest heat level** among its articles (not average — one viral story makes the country "hot").
- Fill opacity scales with heat:
  - Heat 0–20: `rgba(heatColor, 0.05)` — barely tinted
  - Heat 21–50: `rgba(heatColor, 0.12)`
  - Heat 51–80: `rgba(heatColor, 0.2)`
  - Heat 81–100: `rgba(heatColor, 0.3)` — clearly visible but never opaque
- Countries with no articles remain unfilled (existing border-only rendering).
- Both country fills and radial blobs share the single `polygonsData` layer (Globe.gl only supports one polygon layer per instance). All polygons are combined into one array with a `type` discriminator field (`'country'` or `'blob'`). The `polygonCapColor` accessor branches on this type to apply different color/opacity logic. The existing border polygons are modified in-place to include heat fill colors instead of the current static `rgba(30, 42, 58, 0.6)`.

**Low altitude (zoomed in — below 3500km, full opacity below 2500km):**

- Radial cluster blobs appear around article coordinates. Each blob is a circle polygon generated from the article's lat/lng position.
- Blob radius is determined by the article's source `audienceScale` from `media-outlets.ts`:
  - `small`: 50km radius (local blogs, niche outlets)
  - `medium`: 150km radius (regional/national outlets)
  - `large`: 400km radius (international wire services, major nationals)
  - Default (no outlet match): 80km radius
- Blob color matches the article's heat color. Blob opacity: 0.15 base.
- Overlapping blobs from the same story cluster stack visually via standard alpha compositing (Globe.gl's default polygon rendering). No custom blending required — the natural overlap of semi-transparent polygons provides visual density.
- Individual article point markers remain visible on top of the blobs at their existing altitude.

**Transition between layers:**

- Crossfade over the altitude range 2500km–3500km:
  - At 3500km+: country fills at full calculated opacity, radial blobs at 0.
  - At 2500km–3500km: both layers visible, opacities interpolated linearly.
  - At <2500km: country fills at 0, radial blobs at full calculated opacity.
- This avoids a hard visual switch.

### Data pipeline additions

1. **Country heat map**: Before rendering, aggregate articles by country code. For each country, compute max heat level. Store as `Map<countryCode, { heat: number, color: string }>`.

2. **Article-to-country mapping**: `NewsArticle` does not currently have a `country` field. Add `country?: string` (ISO 3166-1 alpha-2) to the `NewsArticle` type. Populate it during article processing in `processFilteredArticles` and `fetchSharedPool`: first try `source.name` lookup in `media-outlets.ts` for the outlet's country code; if no match, use the `country` array from the raw `NewsDataArticle` API response (already available during the fetch-to-article mapping in `cachedNews.ts`). This gives every article a country code for heat aggregation.

3. **Radial blob generation**: For each visible article at low altitude, generate a GeoJSON polygon (circle approximation, 32-point) at the article's coordinates with the radius determined by audienceScale. These blob polygons are tagged with `type: 'blob'` and merged into the same `polygonsData` array as country polygons (tagged `type: 'country'`). The `polygonCapColor` and `polygonAltitude` accessors branch on the `type` field to apply different rendering rules per polygon type.

### audienceScale usage

`audienceScale` on `MediaOutlet` is currently unused. This design activates it solely for halo radius — it does NOT affect the heat formula. Heat remains `min(100, (uniqueSources × 20) + (articleCount × 5) + recencyBonus)`.

---

## 3. Search Relocation & Globe Filtering

### Layout change

- `NewsSearch` and `NewsFilters` move from their current position below the globe (in a `max-w-5xl` container) to a new position **between the Hero section and the globe**.
- The search container uses a dark navy background (`bg-navy-900`) matching the Hero and globe sections, creating a seamless dark band: Hero → Search → Globe → Legend.
- The search bar is prominent — full-width input within a `max-w-4xl` centered container.
- `NewsFilters` (countries, languages, categories, source priority) become a collapsible "Filters" section below the search bar, defaulting to collapsed. The existing expand/collapse behavior and filter chips are preserved.
- Scale selector remains as part of search/filters (not duplicated).

### Filter+fly globe behavior

When search results or filter results update:

1. **Dim non-matching articles**: All articles not in the result set get their marker opacity reduced to 0.1 and their territory halos hidden. They remain faintly visible for geographic context.
2. **Highlight matching articles**: Result articles render at full opacity with full halos.
3. **Camera flies to results**: Compute the geographic centroid of all result articles (mean lat/lng of articles with coordinates, weighted by heat level). Fly to that centroid at an altitude computed from the bounding box of results: `altitude = max(0.3, min(2.5, maxSpreadDegrees / 40))`. This keeps it simple — no spatial clustering algorithm needed.
4. **Zero results**: Show inline message below search bar: "No articles found for [query]". Globe stays unchanged.
5. **Clear search**: All articles restore to full opacity. Camera returns to default overview position (`{ lat: 46, lng: 2, altitude: 2.5 }`).

### Implementation approach

**Key architecture note**: The current `handleSearch` and `handleFilterChange` in `Index.tsx` make new API calls and **replace** `allArticles` entirely with the results. They don't filter a local dataset. To support the "dim non-matching, keep all visible" behavior:

- Add a `baseArticles` ref (`useRef<NewsArticle[]>`) that stores the full shared pool loaded on mount. This is the "background" dataset.
- When a search/filter triggers, store the API result IDs in a `searchResultIds: Set<string> | null` state. Also merge the new results into the display set (in case the API returns articles not in the base pool).
- `allArticles` continues to hold the full set for the feed. `searchResultIds` is passed to `GlobeView` to control marker/halo opacity: matched articles at full opacity, unmatched at 0.1.
- On clear, set `searchResultIds` to `null` — all articles render at full opacity.

**Fly-to-results**: Add a `flyToResults(articles: NewsArticle[])` callback exposed via `onFlyToReady`. It computes the geographic centroid (mean lat/lng of articles with coordinates) and determines altitude from the bounding box: `altitude = max(0.3, min(2.5, maxSpreadDegrees / 40))`. Calls `globeEl.pointOfView({ lat, lng, altitude }, 1000)`.

**Zero results**: If the API returns empty, show an inline message below the search bar. Do not update `searchResultIds` (globe stays unchanged).

---

## 4. Page Structure

**New order (top to bottom):**

1. Navbar
2. Hero (unchanged)
3. **Search bar + collapsible filters** (new position, dark navy)
4. Globe (full-width dark section, click-to-activate overlay)
5. Globe Legend (update hint text: "Click to interact" instead of current zoom hint)
6. Personalize CTA (unchanged)
7. News Feed — `NewsDemo` (unchanged)
8. Footer (unchanged)

**Fixed elements (unchanged):**
- Bottom-left: Refresh button, personalized refresh indicator, timestamp
- Bottom-right: Error toast

---

## 5. Mobile Considerations

- Globe height stays 400px on mobile (existing).
- Territory halos: reduce polygon complexity on mobile (skip radial blobs, keep only country fills) to limit draw calls.
- Max markers: 100 on mobile (existing).
- Search bar: full-width, no layout changes needed (already responsive).
- Click-to-activate overlay: not shown on mobile (touch interaction doesn't have scroll ambiguity).

---

## 6. Files Affected

### Modified

| File | Changes |
|------|---------|
| `src/components/globe/GlobeView.tsx` | Add click-to-activate state, scroll interception, territory halo layers (country fills + radial blobs), opacity modulation for search filtering, max-dezoom release logic |
| `src/components/globe/GlobeControls.ts` | Update auto-rotation to respect dormant/active state |
| `src/components/globe/GlobeMarkers.ts` | Add opacity field to `GlobeMarkerData` for search dimming |
| `src/components/MapSection.tsx` | Pass new props (searchResultIds, interaction state callbacks) |
| `src/pages/Index.tsx` | Move search/filter components above globe in JSX, add `searchResultIds` state, add fly-to-results callback |
| `src/components/GlobeLegend.tsx` | Update interaction hint text |
| `src/utils/globeUtils.ts` | Add country heat aggregation, radial blob generation, centroid calculation utilities |
| `src/types/news.ts` | Add `country?: string` field to `NewsArticle` |
| `src/services/cachedNews.ts` | Map `country` from API response during article processing |

### New

| File | Purpose |
|------|---------|
| `src/utils/territoryHalos.ts` | Country heat aggregation, radial circle polygon generation, audienceScale-to-radius mapping, altitude crossfade opacity calculation |
| `src/components/globe/GlobeOverlay.tsx` | Click-to-activate overlay component ("Click to interact" + "Scrolling page" transition toast) |

### Unchanged

- `src/components/NewsSearch.tsx` — component itself unchanged, just moved in page layout
- `src/components/NewsFilters.tsx` — component itself unchanged, just moved in page layout
- `src/components/NewsDemo.tsx` — unchanged
- `src/components/Hero.tsx` — unchanged
- `src/components/Navbar.tsx` — unchanged
- `src/utils/topicClustering.ts` — heat formula unchanged

---

## 7. Non-Goals

- **Heat formula changes**: No modifications to the heat calculation. `audienceScale` is only used for halo radius.
- **Media outlet quality filtering**: Deferred to a later iteration (user confirmed).
- **Visual polish / animations**: Focus on functional implementation. Visual refinement is later-stage.
- **New API endpoints or data sources**: All data comes from existing NewsData.io integration.
- **Value prop audit**: Separate sub-project, not part of this spec.
