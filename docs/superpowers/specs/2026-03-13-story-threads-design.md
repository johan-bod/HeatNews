# Workstream 3: Story Threads

## Goal

When a story is covered by sources in different geographic regions, let users discover and visualize those cross-region connections on the globe. Arcs connect locations, the globe follows the user's curiosity, and an optional sound cue reinforces the discovery moment.

## Architecture

No new data systems. Clusters and coordinates already exist. Arc data is computed from cluster articles' coordinates by a pure utility function. Globe.gl's native `.arcsData()` renders the arcs. A synthesized sound (Web Audio API) replaces an audio file. New callbacks stay within the globe component tree — no changes to Index.tsx or MapSection.tsx prop interfaces.

---

## 1. Arc Visualization

### Trigger

Arcs appear when the user clicks "See on globe" in the popup's geographic teaser (see Section 2). They are cleared when the popup closes.

### Styling

- Color: inherits the cluster's heat color (hex converted to rgba with 0.6 alpha for translucency)
- Width: 1.5px (`.arcStroke(1.5)`)
- Altitude: 0.15 (`.arcAltitude(0.15)`)
- Dash animation: `.arcDashLength(3)`, `.arcDashGap(2)`, `.arcDashAnimateTime(2000)` — slow forward dash suggesting information flow
- Draw-in animation: `.arcsTransitionDuration(300)` — arcs grow from start to end over 300ms on appear
- Clear on popup close: `arcsData([])` — immediate

### Globe.gl arc layer initialization

The arc layer must be initialized in `GlobeView.tsx`'s globe init effect, following the same pattern as `pointsData` and `hexBinPointsData`:

```
globe
  .arcsData([])
  .arcStartLat('startLat')
  .arcEndLat('endLat')
  .arcStartLng('startLng')
  .arcEndLng('endLng')
  .arcColor('color')
  .arcStroke(1.5)
  .arcAltitude(0.15)
  .arcDashLength(3)
  .arcDashGap(2)
  .arcDashAnimateTime(2000)
  .arcsTransitionDuration(300)
```

### Arc endpoints

Arcs connect the clicked article's coordinates to each geographically distinct cluster article location. Geographic deduplication: coordinates rounded to 1 decimal place (~11km), so sources in the same city collapse to one endpoint. Articles without coordinates are skipped.

### Performance

Arcs only render for the active popup's cluster. Typical count: 1–5 arcs. In rare cases with many distinct locations, no cap is enforced — the visual handles 10+ arcs gracefully since they're thin and translucent. Cleared on popup close.

---

## 2. Popup Integration

### Geographic teaser line

Below the existing "Other coverage:" cluster article list (from Workstream 2), a new line appears **only when** the cluster has articles in 2+ geographically distinct locations (using the same 1-decimal-place rounding as arc deduplication):

```
Covered across 3 regions        See on globe →
```

- Left: descriptive text, styled as `text-ivory-200/40 text-[10px]`
- Right: "See on globe" link, styled like the existing "Read article" amber link
- Clicking "See on globe": `GlobePopup` calls `buildClusterArcs(cluster, article)` (imported from `arcBuilder.ts`) and passes the result to the `onShowArcs` callback

### Fly-to on cluster article

Each article in the "Other coverage:" list that has coordinates **different from** the current article (after 1-decimal rounding) gets a small map-pin icon button next to it. Clicking it:

1. Calls `onFlyToArticle(lat, lng)` — globe rotates to that location (~1000ms animation)
2. Arcs stay visible during the flight (if already shown)
3. Plays the discovery sound if sound is enabled
4. Popup stays open during the fly

Articles without coordinates, or at the same location as the current article, do not show the icon.

### What doesn't change

- Tier badge, source breakdown, heat bar — untouched
- Clicking article title/name still opens URL in new tab
- Popup closes on backdrop click or globe click

---

## 3. Sound System

### Sound design

A short (200–300ms), low-frequency filtered sweep — subtle and editorial in tone. Think documentary atmosphere, not game UI. Synthesized at runtime via Web Audio API: oscillator → lowpass filter → gain envelope.

### Default off

Sound is disabled by default. A small speaker icon toggle in the globe's bottom-left corner, inside the existing zoom level indicator `div` (inline with the text). Hidden on mobile. Toggle state persisted in localStorage (`heatstory_sound_enabled`).

### When it plays

One trigger only: when the globe flies to a cluster article's location via the map-pin icon. No sound on arc appearance, popup open, or other interactions.

---

## 4. Data Flow

### ArcData type

Defined and exported from `src/utils/arcBuilder.ts`:

```typescript
export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string; // rgba string with 0.6 alpha
}
```

### Arc data computation

`buildClusterArcs(cluster: StoryCluster, currentArticle: NewsArticle): ArcData[]`

Exported from `src/utils/arcBuilder.ts`:
- Takes the current article's coordinates as the arc start point
- Iterates cluster articles, skips those without coordinates
- Deduplicates endpoints by rounding to 1 decimal place
- Excludes endpoints matching the current article's (rounded) location
- Converts the cluster's heat color (hex) to rgba with 0.6 alpha
- Returns array of `ArcData` for Globe.gl

Also exports `countDistinctLocations(cluster: StoryCluster): number` — used by the popup to decide whether to show the geographic teaser.

### Arc rendering

1. User clicks "See on globe" → `GlobePopup` calls `buildClusterArcs(cluster, article)`, passes result to `onShowArcs(arcData)` callback
2. `GlobeView` receives arc data, calls `globeRef.current.arcsData(arcData)`
3. On popup close → `GlobeView` clears arcs: `globeRef.current.arcsData([])`

### Fly-to-article

1. User clicks map-pin icon on a cluster article → `GlobePopup` calls `onFlyToArticle(lat, lng)` callback
2. `GlobeView` handles the fly using `pointOfView({ lat, lng, altitude: 1.2 }, 1000)`
3. `soundManager.play()` called if sound is enabled

### Prop changes

`GlobePopup` gets two new callback props:
- `onShowArcs: (arcs: ArcData[]) => void`
- `onFlyToArticle: (lat: number, lng: number) => void`

These are defined in `GlobeView` (which owns the globe ref) and passed to `GlobePopup`. No changes needed to `Index.tsx` or `MapSection.tsx`.

---

## 5. Files Affected

**New files:**
- `src/utils/arcBuilder.ts` — `ArcData` type, `buildClusterArcs()`, `countDistinctLocations()`, hex-to-rgba helper
- `src/utils/soundManager.ts` — Web Audio API manager: create AudioContext lazily, synthesize low sweep, play/toggle, localStorage persistence

**Modified files:**
- `src/components/globe/GlobeView.tsx` — arc layer initialization in globe init effect, `onShowArcs`/`onFlyToArticle` handlers, arc clear on popup close, sound toggle UI in zoom indicator area, pass new props to GlobePopup
- `src/components/globe/GlobePopup.tsx` — geographic teaser line with "See on globe" CTA, map-pin icon on cluster articles with different locations, new callback props, import `buildClusterArcs`/`countDistinctLocations`

**Not changed:**
- `src/pages/Index.tsx` — no new props needed
- `src/components/MapSection.tsx` — no new props needed
- `src/utils/topicClustering.ts` — cluster structure unchanged
- `src/utils/credibilityService.ts` — unchanged
- `src/components/globe/credibilityHelpers.ts` — unchanged

---

## 6. Non-Goals

- No arc filtering or arc-specific UI controls
- No story timeline or temporal propagation tracking
- No arc interaction (click/hover on arcs themselves)
- No changes to clustering algorithm or heat calculation
- No sound customization or volume control — just on/off
- No mobile-specific arc behavior (arcs render the same; sound toggle hidden on mobile)
