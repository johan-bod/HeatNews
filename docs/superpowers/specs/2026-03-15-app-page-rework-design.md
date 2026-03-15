# WS15: App Page Rework & Halo Fix

## Goal

Restructure the app page layout so the globe is the hero, search becomes a compact overlay, filters move below the globe, remove redundant sections, fix halo opacity at regional zoom, and add basic mobile responsiveness.

## Architecture

No new libraries. Changes touch the app page layout, search component, filters component, globe view, territory halos, and map section. The approach removes clutter above the globe, consolidates controls below it, and adjusts the halo crossfade curve.

---

## 1. Page Structure Overhaul

### Current Order

Navbar → Hero → Search+Filters band → Globe → Legend → Refresh → PersonalizeCTA → Feed → HowItWorks → Footer

### New Order

Navbar → Globe (with search overlay) → Legend → Scale selector + Filters + Refresh → PersonalizeCTA → Feed → Footer

### Changes

**Remove Hero section.** The landing page (`/`) now handles introduction. The app page (`/app`) should go straight to the globe. Remove the `<Hero />` component render (line 357 of AppPage.tsx) and its import. Also remove the `<HowItWorks />` component render (line 448) and its import — this explanatory content now lives on the landing page.

**Search bar becomes a compact overlay** on the globe container (see Section 2).

**Filters move below the globe legend** in the dark navy band, alongside the refresh controls. The scale selector sits above the collapsible advanced filters as an always-visible row.

**Refresh controls stay inline** below legend (already positioned there by WS14).

---

## 2. Search Bar as Globe Overlay

### Position

Upper-right of the globe container. The scale indicator + country label is already upper-left (from WS14), so search goes upper-right for balance.

### Collapsed State

A small semi-transparent pill matching the scale indicator styling:
- Search icon (magnifying glass) + "Search..." placeholder
- ~160px wide
- `bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg`
- Same font styling as scale indicator (`font-body text-xs`)

### Expanded State

On click/focus:
- Expands to ~300px with active input field
- Input gets focus, placeholder disappears
- Suggested search pills appear below the input (the existing 8 suggestions: climate change, elections, technology, etc.)
- Semi-transparent dropdown below the pill

### Behavior

- Search results dim non-matching markers on the globe (existing behavior unchanged)
- No scale selector in search — uses the global scale from filters
- Clear button (X) appears when query is active
- Pressing Escape or clicking outside collapses back to pill
- `onSearch` callback fires on Enter or search button click

### Removed from NewsSearch

- Title ("Search News") and subtitle
- Scale selector buttons (5 buttons)
- The `bg-ivory-50/80` card wrapper
- The "Active Search Display" section (query + scale badge)

The component becomes a self-contained overlay widget, not a full section.

---

## 3. Halo Crossfade Fix

### Problem

The `crossfadeOpacity` function in `territoryHalos.ts` fades blobs between 2500-3500km altitude. Below 2500km (the entire regional zoom range), blobs are at full opacity. With 100+ articles at regional zoom, overlapping full-opacity blobs create an indecipherable yellow mass.

### Fix

The current `crossfadeOpacity` function returns `{ country: 0, blob: 1 }` below 2500km — blobs at full opacity when zoomed in. This is backwards for the desired UX.

**Rewrite `crossfadeOpacity`** with new constants and inverted blob behavior:

```typescript
const CROSSFADE_LOW = 2500;
const CROSSFADE_HIGH = 5000;

export function crossfadeOpacity(altitudeKm: number): {
  country: number;
  blob: number;
} {
  if (altitudeKm >= CROSSFADE_HIGH) return { country: 1, blob: 1 };
  if (altitudeKm <= CROSSFADE_LOW) return { country: 1, blob: 0 };

  const t = (altitudeKm - CROSSFADE_LOW) / (CROSSFADE_HIGH - CROSSFADE_LOW);
  return { country: 1, blob: t };
}
```

Result:

| Altitude | Country polygons | Blobs |
|----------|-----------------|-------|
| > 5000 km (international) | Visible | Visible |
| 2500-5000 km (national) | Visible | Fading in/out |
| < 2500 km (regional/local) | Visible | Invisible |

Country polygons are now always visible (they provide useful context at all zoom levels). Blobs only appear at high altitude where they don't overlap.

The existing `altitudeKm > 500` skip (from WS14) remains as a performance optimization — prevents computing invisible blob geometry.

---

## 4. Scale Selector Deduplication

### Problem

Scale selector appears in both NewsSearch (5 buttons) and NewsFilters (5 buttons). Both feed into `selectedScale` state through different paths. This is confusing — users see two sets of scale buttons that do the same thing.

### Fix

**Remove scale from NewsSearch entirely.** Search uses whatever scale is currently active. This requires updating the `SearchParams` interface in `NewsSearch.tsx` to remove the `scale` field, and updating the `handleSearch` handler in `AppPage.tsx` which currently calls `setSelectedScale(search.scale)` — that line should be removed so search no longer overrides the active scale.

**Pull scale selector out of the collapsible NewsFilters section.** The scale row becomes always-visible, sitting above the "Advanced Filters" expandable panel. Layout:

```
[Scale selector row — always visible]
  All | Local | Regional | National | International

[Advanced Filters — collapsible]
  Countries | Languages | Categories | Source Priority
  [Apply] [Reset]
```

The scale selector is the primary filter control. It should never be hidden behind an expand toggle.

---

## 5. Mobile Responsiveness

### Globe Container

- Desktop (md+): 600px, Mobile (<md): 400px — already implemented in GlobeView.tsx via `isMobile` ternary
- The `GlobeLoading` fallback in MapSection.tsx needs matching responsive height (currently hardcoded `h-[600px]`)
- Full viewport width on all sizes (remove any side padding on the globe container)

### Search Overlay

- Desktop: Upper-right overlay on globe (as described in Section 2)
- Mobile (<md): Search moves below the globe, above the legend. Renders as a full-width compact input bar, not an overlay. Touch targets on a small globe are unreliable.

### Filters

- Full-width on both mobile and desktop (already the case)
- Scale buttons wrap on narrow screens (use `flex-wrap`)
- Collapsible behavior unchanged

### Feed Cards

- Already stack vertically
- Tighter padding on mobile: `p-4` instead of `p-5` on cards, `px-4` instead of `px-6` on container

### Navbar

- Already works at mobile widths, no changes needed

---

## 6. Files Affected

**Modified files:**
- `src/pages/AppPage.tsx` — remove Hero section, reorder layout (globe first, then scale+filters+refresh below), mobile padding adjustments
- `src/components/NewsSearch.tsx` — restructure from full card to compact overlay/input widget, remove scale selector, remove title/subtitle
- `src/components/NewsFilters.tsx` — pull scale selector out of collapsible section to always-visible row
- `src/components/globe/GlobeView.tsx` — integrate search overlay in globe container (upper-right)
- `src/components/MapSection.tsx` — pass search props through to GlobeView, responsive loading fallback height, remove duplicate `id="globe-section"` (keep only in GlobeView.tsx)
- `src/utils/territoryHalos.ts` — rewrite `crossfadeOpacity` (new constants + inverted blob curve)
- `src/components/NewsDemo.tsx` — mobile padding adjustments on cards and container

**Intentionally unchanged:**
- `src/components/GlobeLegend.tsx` — just simplified in WS14
- `src/components/globe/GlobePopup.tsx` — popup behavior unchanged
- `src/components/globe/GlobeMarkers.ts` — marker pipeline unchanged
- `src/utils/globeUtils.ts` — utility functions unchanged
- All API/data fetching code
- `src/pages/InvestigatePage.tsx` — investigate page unchanged
- `src/pages/LandingPage.tsx` — landing page unchanged

---

## 7. Non-Goals

- No changes to data fetching pipeline or API calls
- No changes to the landing page
- No feed virtualization or infinite scroll changes
- No new component library additions
- No changes to the investigate page
- No auth/gating changes
- No dormant/active interaction model changes (works well enough with zoom limits from WS14)
