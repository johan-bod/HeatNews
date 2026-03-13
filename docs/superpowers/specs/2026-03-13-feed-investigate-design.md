# Workstream 8: Feed Card Investigate Entry Point

## Goal

Add an "Investigate this story" action to article cards in the news feed (NewsDemo component), so users can reach the /investigate page from the feed — not just from the globe popup.

## Architecture

Thread the existing `clusters` array from `Index.tsx` into `NewsDemo` as an optional prop. Each feed card looks up its cluster and shows an investigate button when the cluster has 2+ articles. Navigation uses the same pattern as GlobePopup: React Router's `navigate()` with cluster data in router state.

---

## 1. NewsDemo Changes

### Props

Add `clusters?: StoryCluster[]` to `NewsDemoProps`. Requires importing `StoryCluster` from `@/utils/topicClustering`. Optional so the component still works without it.

### Per-Card Cluster Lookup

For each rendered article card, find its cluster:

```typescript
const cluster = clusters?.find(c => c.articles.some(a => a.id === article.id));
const showInvestigate = cluster && cluster.articles.length >= 2;
```

This mirrors GlobePopup's cluster lookup and visibility logic.

Note: `clusters` is computed from `allArticles` in `Index.tsx` (all scales combined), so even when the feed is scale-filtered, each article's cluster will still be found. Articles that don't appear in any cluster (e.g., personalized articles added after clustering) simply won't show the investigate button — this is correct behavior.

### Investigate Button

When `showInvestigate` is true, render below the article metadata footer. Must call `e.stopPropagation()` to prevent the card's own `onClick` (which opens the article URL) from also firing:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/investigate?article=${article.id}`, {
      state: { cluster, article },
    });
  }}
  className="text-xs text-amber-400 hover:text-amber-300 transition-colors mt-1"
>
  Investigate this story →
</button>
```

Requires adding `useNavigate` from `react-router-dom`.

### Styling

Same as GlobePopup's investigate button: `text-xs text-amber-400 hover:text-amber-300 transition-colors`. Positioned below the existing metadata row (location, time, scale badge), left-aligned.

---

## 2. Index.tsx Changes

Pass the already-computed `clusters` to `NewsDemo`. The existing JSX:

```tsx
<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} />
```

becomes:

```tsx
<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} clusters={clusters} />
```

The `clusters` variable is already available in scope (computed via `useMemo` with `analyzeArticleHeat`).

---

## 3. Files Affected

**Modified files:**
- `src/components/NewsDemo.tsx` — add `StoryCluster` import, `clusters` prop, `useNavigate`, investigate button per card with `stopPropagation`
- `src/pages/Index.tsx` — pass `clusters` to `NewsDemo`

**Unchanged:**
- `src/pages/InvestigatePage.tsx` — already handles router state + cache fallback
- `src/components/globe/GlobePopup.tsx` — existing investigate button unchanged

---

## 4. Non-Goals

- No new test files — pure UI wiring with no independent logic
- No changes to InvestigatePage
- No changes to cluster computation
- No feed card redesign — only adding the investigate button
