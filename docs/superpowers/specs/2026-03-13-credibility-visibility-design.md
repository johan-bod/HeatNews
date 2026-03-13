# Workstream 2: Make Credibility Visible

## Goal

Surface the existing 6-tier credibility system in the UI so users understand why stories are "hot" and what makes HeatStory different from generic news aggregators. Two changes: enhance the globe popup with credibility info and cluster article list, and add a static explainer section to the homepage.

## Architecture

No new data systems. The credibility service and cluster data already exist — this workstream threads them to UI components. `StoryCluster[]` is passed from `Index.tsx` through the component tree to `GlobePopup`. Tier resolution happens on-render via the existing synchronous `resolveCredibilityByDomain()`. A new static `HowItWorks` component is added below the feed.

---

## 1. Globe Popup Enhancement

### Current state

`GlobePopup.tsx` displays: heat icon, title, source name, "X sources" badge (when coverage > 1), topic tags, heat bar, "Read article" link.

### New elements

**1a. Source tier badge**

Next to the existing source name, add a tier label:
```
AFP  ·  Reference
```

Tier labels and colors:
| Tier | Label | Color |
|------|-------|-------|
| reference | Reference | `text-blue-400` |
| established | Established | `text-emerald-400` |
| regional | Regional | `text-teal-400` |
| hyperlocal | Hyperlocal | `text-amber-400` |
| niche | Niche | `text-slate-400` |

**Note:** `unreliable` sources are filtered at ingestion (`newsdata-api.ts`) and never appear in the UI. No badge needed for that tier.

Resolved by calling `resolveCredibilityByDomain(extractDomain(article.source.url))` on render.

**1b. Source breakdown**

When `coverage > 1`, replace the plain "X sources" badge with a descriptive line:
```
Covered by 4 sources: 1 wire service, 2 national, 1 regional
```

Tier-to-label mapping for the breakdown:
| Tier | Breakdown label |
|------|----------------|
| reference | wire service(s) |
| established | national |
| regional | regional |
| hyperlocal | local |
| niche | independent |

Computed by iterating the cluster's `sourceDomains` map, resolving each domain's tier, and counting by tier. Only non-zero tiers are shown.

**1c. Cluster article list**

When the cluster has > 1 article, show a list of sibling articles below the source breakdown:
```
Other coverage:
  Reuters — "Title of Reuters article..."     Reference
  Le Monde — "Title of Le Monde article..."   Established
  Ouest-France — "Title of OF article..."     Regional
```

- Each item: source name, truncated title (1 line), tier badge
- Each item is a clickable link (opens article URL in new tab)
- Max 5 items shown. If more, show "and X more sources"
- Excludes the currently displayed article from the list
- Sorted by tier weight descending (reference first, niche last)

### Popup sizing

The popup will grow taller with the cluster list. Current popup has `max-h` constraints — these may need adjustment or the cluster list section should be scrollable if it exceeds available space.

## 2. Homepage Explainer Section

### Component: `src/components/HowItWorks.tsx`

A static informational section explaining HeatStory's heat calculation and credibility system.

**Location:** Rendered in `Index.tsx` after the feed (`NewsDemo`), before the footer.

**Layout:** Three-column grid (stacks vertically on mobile). Each column has:
- A heading
- A short paragraph

**Styling:** Matches existing app aesthetic — navy background, ivory text, amber accents. Subtle top border to separate from the feed.

**Copy:** Placeholder text with `{/* TODO: rewrite copy */}` comments. The user will rewrite the copy later.

**Three columns cover:**
1. Source credibility — what the tier system is
2. Coverage patterns — why multi-source coverage matters
3. Emerging stories — what the convergence bonus detects

## 3. Data Flow

### Threading clusters to the popup

Clusters are currently computed in two places, both discarding them after annotating articles:
1. `cachedNews.ts:processArticles()` — runs during cache fetch, stores only annotated articles in localStorage
2. `Index.tsx:processFilteredArticles()` — runs during search/filter, returns only annotated articles

Since cached articles arrive in `Index.tsx` already annotated (with `heatLevel`, `coverage`, `color`), the cluster objects themselves are not preserved. But the popup needs them for the source breakdown and cluster article list.

**Change:** In `Index.tsx`, after loading articles (from cache or filter), re-run `analyzeArticleHeat()` on the combined articles to reconstruct the `StoryCluster[]` array. This is a lightweight in-memory operation (title similarity + grouping) that's already fast. Store the resulting clusters in component state and pass them down:

```
Index.tsx (re-runs analyzeArticleHeat, stores clusters in state)
  → MapSection (new prop: clusters)
    → GlobeView (new prop: clusters)
      → GlobePopup (new prop: clusters)
```

This avoids modifying `cachedNews.ts` or changing the caching format — clusters are reconstructed from the articles whenever they're loaded.

### Cluster lookup in popup

When the popup opens for an article, find its cluster:
```typescript
const cluster = clusters.find(c => c.articles.some(a => a.id === article.id));
```

O(n) search over typically <100 clusters, runs only on click — no performance concern.

### Tier resolution in popup

For the source tier badge: `resolveCredibilityByDomain(extractDomain(article.source.url))`.

For the source breakdown: iterate `cluster.sourceDomains`, resolve each, count by tier.

For the cluster article list: iterate `cluster.articles`, resolve each article's source tier.

All synchronous, in-memory lookups.

## 4. Files Affected

**New files:**
- `src/components/HowItWorks.tsx` — static explainer section

**Modified files:**
- `src/components/globe/GlobePopup.tsx` — add tier badge, source breakdown, cluster article list
- `src/pages/Index.tsx` — store clusters in state, pass as prop, render HowItWorks
- `src/components/MapSection.tsx` — pass clusters prop through
- `src/components/globe/GlobeView.tsx` — pass clusters prop through

**Not changed:**
- `src/types/news.ts` — NewsArticle type unchanged
- `src/utils/credibilityService.ts` — already exports `resolveCredibilityByDomain`, `extractDomain`
- `src/utils/topicClustering.ts` — already returns StoryCluster[] with sourceDomains
- `src/services/cachedNews.ts` — processing pipeline unchanged
- `src/components/NewsDemo.tsx` — no credibility display on feed cards
- `src/components/globe/GlobeTooltip.tsx` — tooltip stays minimal

## 5. Non-Goals

- No credibility badges on feed article cards (keep feed clean)
- No interactive credibility explorer or filtering by tier
- No changes to the credibility system itself (tiers, weights, overrides)
- No changes to heat calculation
- No "connect the dots" features (story threads — Workstream 3)
- Final copy for the explainer section — user will rewrite
