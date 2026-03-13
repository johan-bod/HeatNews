# Workstream 4: Investigate Page Foundation (V1)

## Goal

Add a `/investigate` route that lets users deep-dive into a story cluster — see all sources covering it, grouped by credibility tier, with a geographic spread summary. This turns HeatStory from a passive news map into an active research tool. V1 is the foundation: routing, layout, and data display. Richer features (perspective comparison, embedded map, editing) come in future workstreams.

## Architecture

No new data systems or utilities. The page reads cluster and article data passed via route state (fast path) or re-derives from the article cache on refresh. Existing helpers (`credibilityHelpers.ts`, `arcBuilder.ts`) provide all the display logic needed. One new page component, one route addition, one popup modification.

---

## 1. Routing & Navigation

### Route

`/investigate?article=<articleId>`

Added to the app's route configuration, pointing to a new `InvestigatePage` component. The `articleId` query param identifies the clicked article and is used as a fallback key when route state is unavailable (page refresh, direct link).

### Entry point

A new "Investigate this story" button in `GlobePopup`, appearing **only when** the popup's cluster has 2+ articles. Styled as an amber text link consistent with the existing "See on globe →" CTA. Clicking it navigates:

```typescript
navigate(`/investigate?article=${article.id}`, { state: { cluster, article } })
```

### Data persistence

**Fast path:** `InvestigatePage` reads `location.state.cluster` and `location.state.article` directly — no computation needed.

**Refresh fallback:** If route state is missing (page refresh or direct URL), reads `articleId` from the query param, calls `analyzeArticleHeat(cachedArticles, 'international')` to rebuild clusters, and finds the cluster containing that article ID.

**Not found:** If the article can't be located in either path, shows a simple "Story not found" message with a "← Back to map" link.

### Back navigation

A "← Back to map" link at the top of the page, using `navigate('/')` or `navigate(-1)`. Styled as `text-sm text-amber-400 hover:text-amber-300`.

---

## 2. Page Content & Layout

Three vertical sections stacked in a single scrollable column, `max-w-4xl mx-auto`, with `px-6 py-8` padding.

### Story Header

Below the "← Back to map" link:

- **Representative title**: the clicked article's title, styled as `text-2xl font-bold text-ivory-100`
- **Meta row**: heat level pill (reuses existing heat color logic — e.g., `bg-amber-500/20 text-amber-400` with the numeric heat level), source count (`"5 sources"`), and location count (`"across 3 regions"` — uses `countDistinctLocations` from `arcBuilder.ts`). All `text-sm text-ivory-200/60`, inline with small dot separators.

### Source List

Grouped by credibility tier, highest tier first: reference → established → regional → hyperlocal → niche. Tiers with no articles in the cluster are omitted.

Each tier group:

- **Tier header**: tier label + colored dot (reuses `getTierLabel`/`getTierColor` from `credibilityHelpers.ts`), styled as `text-xs uppercase tracking-wide text-ivory-200/40`
- **Article cards**: rows within the group, each showing:
  - Source name (bold, `text-sm`)
  - Article title (regular weight, `text-sm text-ivory-200/80`, links to article URL in new tab)
  - Published date (relative format, e.g., "2h ago", `text-xs text-ivory-200/40`)
  - Map-pin icon if the article has coordinates (present/absent indicator only — no reverse geocoding in V1)

### Geographic Spread

A compact text-only summary section at the bottom:

- Section header: "Geographic Spread" styled as `text-sm font-semibold text-ivory-200/60`
- Summary text: `"This story is covered from N distinct locations"` using `countDistinctLocations` from `arcBuilder.ts`
- List of articles that have coordinates, showing source name + rounded lat/lng (e.g., "48.9°N, 2.4°E")
- If no articles have coordinates: `"No geographic data available for this cluster"`

---

## 3. Component Structure & Data Flow

### New files

- **`src/pages/InvestigatePage.tsx`** — the route component. Reads route state or re-derives from cache. Renders story header, source list, and geographic spread. Imports helpers from `credibilityHelpers.ts` and `arcBuilder.ts`.

### Modified files

- **Route configuration** (wherever routes are defined) — add `/investigate` route pointing to `InvestigatePage`
- **`src/components/globe/GlobePopup.tsx`** — add "Investigate this story" button. Only visible when cluster has 2+ articles. Uses `useNavigate` from React Router. Passes `{ cluster, article }` as route state.

### Data flow

1. User clicks "Investigate this story" in GlobePopup
2. `navigate('/investigate?article=${article.id}', { state: { cluster, article } })`
3. `InvestigatePage` reads `location.state` — if present, uses cluster and article directly
4. If state is missing (refresh), reads `articleId` from query params, calls `analyzeArticleHeat(cachedArticles, 'international')` to rebuild clusters, finds the cluster containing `articleId`
5. If article not found, renders "Story not found" with back link

### What stays unchanged

- `Index.tsx` — no new props
- `MapSection.tsx` — no new props
- `GlobeView.tsx` — no changes
- `topicClustering.ts` — cluster structure unchanged
- `credibilityService.ts` — unchanged

---

## 4. Styling

The page uses the existing dark theme (`bg-[#0a0a0f]` or equivalent). All text in ivory tones consistent with globe popup styling. No new color palette — reuses heat colors, tier colors, and ivory text scales.

Layout is responsive but desktop-first. No special mobile treatment in V1.

Tier group cards: `border border-ivory-200/10 rounded-lg` with padding. Article rows within groups: `divide-y divide-ivory-200/5`. The "Investigate this story" button in GlobePopup matches the existing "See on globe →" amber link style.

---

## 5. Non-Goals

- No embedded map or globe view on the investigate page
- No perspective/angle comparison or narrative analysis
- No editing, annotation, or workspace features
- No sharing or export
- No article content fetching (titles + links only, same as existing data)
- No real-time updates while on the page
- No mobile-optimized layout
- No reverse geocoding for location names
