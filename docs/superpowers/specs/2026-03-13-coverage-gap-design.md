# Workstream 5: Coverage Gap Visualization

## Goal

Surface when a story cluster is missing coverage from high-credibility source tiers (wire services, national outlets). This helps users see not just what's being reported, but what's missing from the conversation — a subtle but valuable editorial signal.

## Architecture

No new data systems. A pure utility function analyzes a `StoryCluster`'s articles by resolving each to a credibility tier (reusing `resolveCredibilityByDomain` from `credibilityService.ts`) and checking for absent top tiers and ratio imbalance. Results surface as a one-line indicator in GlobePopup and a fuller section on InvestigatePage.

---

## 1. Gap Detection Logic

### Utility

`analyzeCoverageGap(cluster: StoryCluster): CoverageGapResult`

Exported from `src/utils/coverageGap.ts`. Takes a `StoryCluster`, resolves each article's credibility tier via `resolveCredibilityByDomain(extractDomain(article.source.url))`, then applies two checks.

### Primary signal: missing top tiers

Check if the cluster has any articles from `reference` or `established` tiers.

- Both absent → `gapLabel: "No wire service or national coverage"`, `missingTiers: ['reference', 'established']`
- Only reference absent → `gapLabel: "No wire service coverage"`, `missingTiers: ['reference']`
- Only established absent → `gapLabel: "No national outlet coverage"`, `missingTiers: ['established']`
- Both present → `hasGap` may still be true if imbalance fires

### Secondary signal: imbalance

Count articles by tier. If top tiers (reference + established) make up less than 20% of the cluster's articles AND niche + hyperlocal make up more than 60%, set `imbalanceNote: "Coverage is predominantly from independent/local sources"`.

This fires independently of the missing-tier check — a cluster could have 1 reference article and 9 niche articles, passing the missing-tier check but still flagging imbalance.

### Return type

```typescript
export interface CoverageGapResult {
  hasGap: boolean;                  // true if any signal fires (missing tiers OR imbalance)
  missingTiers: CredibilityTier[];  // which of reference/established are absent
  gapLabel: string;                 // one-line summary for display
  imbalanceNote: string | null;     // secondary note if ratio is skewed, null otherwise
}
```

When neither signal fires: `{ hasGap: false, missingTiers: [], gapLabel: '', imbalanceNote: null }`.

### Domain extraction

Reuse the same approach as `credibilityHelpers.ts`: extract domain from `article.source.url || article.url`, strip `www.` prefix. The `extractDomain` function from `credibilityService.ts` handles this.

---

## 2. GlobePopup Integration

### Placement

A single line after the existing source breakdown ("Covered by N sources: ...") and before the "Other coverage:" cluster article list. Only appears when `hasGap` is true.

### Content

The `gapLabel` string only. No `imbalanceNote` in the popup — keep it minimal.

### Styling

- Lucide `AlertTriangle` icon, size 10, to the left
- Text: `font-body text-[10px] text-amber-400/70`
- Layout: `flex items-center gap-1`

### When hidden

When `hasGap` is false or when no cluster is found for the article.

---

## 3. InvestigatePage Integration

### Placement

A new "Coverage Analysis" section between the existing source list and the geographic spread section. Only renders when `hasGap` is true.

### Section header

"Coverage Analysis" styled as `text-sm font-semibold text-ivory-200/60` — consistent with the "Geographic Spread" header.

### Content

1. **Gap line:** `gapLabel` with Lucide `AlertTriangle` icon (size 14), styled as `text-sm text-amber-400/80`. Always present when section renders.

2. **Imbalance note:** `imbalanceNote` string below the gap line, styled as `text-sm text-ivory-200/40`. Only renders when `imbalanceNote` is not null.

### When hidden

Entire section is omitted when `hasGap` is false.

---

## 4. Files Affected

**New files:**
- `src/utils/coverageGap.ts` — `CoverageGapResult` interface, `analyzeCoverageGap()` function
- `tests/utils/coverageGap.test.ts` — tests for gap detection logic

**Modified files:**
- `src/components/globe/GlobePopup.tsx` — add gap indicator line after source breakdown
- `src/pages/InvestigatePage.tsx` — add Coverage Analysis section between source list and geographic spread

**Unchanged:**
- `src/App.tsx` — no route changes
- `src/components/globe/credibilityHelpers.ts` — no changes
- `src/utils/topicClustering.ts` — no changes
- `src/utils/credibilityService.ts` — no changes (existing `extractDomain` and `resolveCredibilityByDomain` reused)
- `src/utils/arcBuilder.ts` — no changes

---

## 5. Non-Goals

- No geographic gap detection (future workstream with NLP inference)
- No scale gap detection (future workstream)
- No per-article gap indicators — gaps are cluster-level only
- No configurable thresholds or user settings
- No gap-based filtering or sorting in the feed
- No visual charts or tier distribution graphics
- No new data fetching or API calls
