# Workstream 4: Investigate Page Foundation (V1)

## Goal

Add a `/investigate` route that lets users deep-dive into a story cluster — see all sources covering it, grouped by credibility tier, with a geographic spread summary. This turns HeatStory from a passive news map into an active research tool. V1 is the foundation: routing, layout, and data display. Richer features (perspective comparison, embedded map, editing) come in future workstreams.

## Architecture

No new data systems. The page reads cluster and article data passed via route state (fast path) or re-derives from the article cache on refresh. Existing helpers (`credibilityHelpers.ts`, `arcBuilder.ts`) provide display logic. One new page component, one new shared utility extraction, one route addition, one popup modification.

---

## 1. Routing & Navigation

### Route

`/investigate?article=<articleId>`

Added to the app's route configuration, pointing to a new `InvestigatePage` component. The `articleId` query param identifies the clicked article and is used as a fallback key when route state is unavailable (page refresh, direct link).

### Entry point

A new "Investigate this story" button in `GlobePopup`, appearing **only when** `cluster.articles.length >= 2` (i.e., at least one other article exists besides the current one). Styled as an amber text link consistent with the existing "See on globe →" CTA. Clicking it navigates:

```typescript
navigate(`/investigate?article=${article.id}`, { state: { cluster, article } })
```

### Data persistence

**Fast path:** `InvestigatePage` reads `location.state.cluster` and `location.state.article` directly — no computation needed.

**Refresh fallback:** If route state is missing (page refresh or direct URL):

1. Read `articleId` from the query param
2. Call `getCachedNews()` from `src/services/cachedNews.ts` — returns `{ localNews, regionalNews, nationalNews, international }` arrays (note the inconsistent naming in the existing interface)
3. Combine all four arrays: `[...localNews, ...regionalNews, ...nationalNews, ...international]`
4. Call `analyzeArticleHeat(allArticles, 'international')` to rebuild clusters. The scale parameter is ignored internally (kept for API compatibility) but passed for consistency with `Index.tsx`.
5. Find the cluster whose `articles` array contains an article with matching `id`

**Not found:** If the article can't be located in either path, renders: "This story is no longer available." with a "← Back to map" link below it. Page stays at `/investigate?article=<id>` — no redirect.

### Back navigation

A "← Back to map" link at the top of the page, using `navigate('/')` or `navigate(-1)`. Styled as `text-sm text-amber-400 hover:text-amber-300`.

---

## 2. Page Content & Layout

Three vertical sections stacked in a single scrollable column, `max-w-4xl mx-auto`, with `px-6 py-8` padding.

### Story Header

Below the "← Back to map" link:

- **Representative title**: the clicked article's title, styled as `text-2xl font-bold text-ivory-100`
- **Meta row**: heat level pill, source count, and location count. All `text-sm text-ivory-200/60`, inline with small dot separators.
  - Heat pill: use `heatLevelToColor(cluster.heatLevel)` from `topicClustering.ts` to get the hex color. Use `hexToRgbaArc(color, 0.2)` from `arcBuilder.ts` for the background and the hex color directly for the text: `style={{ backgroundColor: hexToRgbaArc(color, 0.2), color: color }}`. Display the numeric heat level inside (e.g., "72").
  - Source count: `"N sources"` where N = `cluster.articles.length`
  - Location count: `"across N regions"` where N = `countDistinctLocations(cluster)` from `arcBuilder.ts`. Omitted if N < 2.

### Source List

Grouped by credibility tier, highest tier first: reference → established → regional → hyperlocal → niche. Tiers with no articles in the cluster are omitted.

**Tier grouping logic:** Use `getClusterArticles()` from `credibilityHelpers.ts` to resolve each article's tier via `resolveCredibilityByDomain()`. This returns `ClusterArticleItem[]` sorted by tier weight. However, `getClusterArticles()` currently caps at 5 items and excludes the current article. For the investigate page, create a new variant `getAllClusterArticles(articles: NewsArticle[])` exported from `credibilityHelpers.ts` that:
- Includes all articles (no exclusion, no cap)
- Returns `ClusterArticleItem[]` sorted by tier weight descending
- Groups are derived by iterating the sorted list and splitting on tier changes

Each tier group:

- **Tier header**: tier label + colored dot, styled as `text-xs uppercase tracking-wide text-ivory-200/40`:
  ```tsx
  <div className="flex items-center gap-2">
    <span className={getTierColor(tier)}>●</span>  {/* getTierColor returns Tailwind text-color classes like 'text-blue-400' — works on text content */}
    <span>{getTierLabel(tier)}</span>
  </div>
  ```
- **Article cards**: rows within the group, each showing:
  - Source name: `article.source.name` (the outlet display name), bold, `text-sm`
  - Article title (regular weight, `text-sm text-ivory-200/80`, links to `article.url` in new tab)
  - Published date: relative format using `formatTimeAgo()`. Extract this function from `NewsDemo.tsx` into `src/utils/formatTime.ts` as a shared export, then import in both `NewsDemo.tsx` and `InvestigatePage.tsx`.
  - Map-pin icon (Lucide `MapPin`, size 12) if the article has coordinates (present/absent indicator only — no reverse geocoding in V1)

### Geographic Spread

A compact text-only summary section at the bottom:

- Section header: "Geographic Spread" styled as `text-sm font-semibold text-ivory-200/60`
- Summary text: `"This story is covered from N distinct locations"` using `countDistinctLocations` from `arcBuilder.ts`
- Simple `<ul>` list of articles that have coordinates, one per line, showing source name + rounded lat/lng (e.g., "Reuters — 48.9, 2.4"). Ordered by cluster array order. Duplicate locations listed separately (no deduplication here — this is a source list, not a location list).
- If no articles have coordinates: `"No geographic data available for this cluster"`

---

## 3. Component Structure & Data Flow

### New files

- **`src/pages/InvestigatePage.tsx`** — the route component. Reads route state or re-derives from cache. Renders story header, source list, and geographic spread. Imports helpers from `credibilityHelpers.ts`, `arcBuilder.ts`, and `formatTime.ts`.
- **`src/utils/formatTime.ts`** — extracted `formatTimeAgo()` function (currently inline in `NewsDemo.tsx`). Shared by `NewsDemo.tsx` and `InvestigatePage.tsx`.

### Modified files

- **`src/App.tsx`** — add `/investigate` route: `<Route path="/investigate" element={<InvestigatePage />} />` before the catch-all `*` route
- **`src/components/globe/GlobePopup.tsx`** — add "Investigate this story" button. Only visible when cluster has 2+ articles. Uses `useNavigate` from React Router. Passes `{ cluster, article }` as route state.
- **`src/components/globe/credibilityHelpers.ts`** — add `getAllClusterArticles()` export (uncapped, includes all articles)
- **`src/components/NewsDemo.tsx`** — replace inline `formatTimeAgo` with import from `src/utils/formatTime.ts`

### Data flow

1. User clicks "Investigate this story" in GlobePopup
2. `navigate('/investigate?article=${article.id}', { state: { cluster, article } })`
3. `InvestigatePage` reads `location.state` — if present, uses cluster and article directly
4. If state is missing (refresh), reads `articleId` from query params, calls `getCachedNews()` to get all cached articles, combines all scale arrays, calls `analyzeArticleHeat(allArticles, 'international')` to rebuild clusters, finds the cluster containing `articleId`
5. If article not found, renders "This story is no longer available." with "← Back to map" link

### What stays unchanged

- `Index.tsx` — no new props
- `MapSection.tsx` — no new props
- `GlobeView.tsx` — no changes
- `topicClustering.ts` — cluster structure unchanged
- `credibilityService.ts` — unchanged
- `topicClustering.ts` — unchanged (uses existing `heatLevelToColor` and `analyzeArticleHeat`)

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
