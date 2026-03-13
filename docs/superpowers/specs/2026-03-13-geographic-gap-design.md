# Workstream 7: Geographic Gap Detection

## Goal

Surface when a story cluster is being covered from some geographic regions but missing from others where you'd expect coverage. Operates at two levels: country-level (which national media markets are covering this) and region-level (which administrative regions within a country have coverage). Complements the existing credibility tier gap detection (WS5) with a geographic dimension.

## Architecture

A pure utility function `analyzeGeographicGap(cluster)` analyzes a `StoryCluster`'s articles by their `country` and `coordinates` fields. Uses a static administrative regions dataset (starting with France's 13 metropolitan regions) to resolve coordinates to regions. Results rendered alongside the existing credibility gap in GlobePopup (teaser) and InvestigatePage (detail).

---

## 1. Geographic Gap Detection Logic

### Utility

`analyzeGeographicGap(cluster: StoryCluster): GeographicGapResult`

Exported from `src/utils/geographicGap.ts`. Only analyzes clusters with 3+ articles (fewer articles lack enough data for meaningful gap detection).

### Level 1: Country-Level Gaps

Group articles by `article.country` (lowercase ISO 2-letter code). Skip articles where `country` is undefined. Require at least 2 articles with country data to perform country-level analysis — a single article with country data is not enough to draw conclusions.

- **Single-country cluster** (all articles with country data from one country) → `countryGapLabel: "Only covered by {demonym} media"`, country-level gap fires.
- **Multi-country cluster** → report `coveredCountries` list (informational). No gap flagged at country level.
- **No country data** (all articles missing `country`) or only 1 article with country data → no country-level analysis.

Country demonyms resolved from ISO codes via a static map (e.g., `"fr"` → `"French"`, `"gb"` → `"British"`, `"us"` → `"American"`).

### Level 2: Region-Level Gaps

For each country that has region data defined AND has 2+ articles with coordinates in that country:

1. Resolve each article's coordinates to the nearest administrative region using `resolveRegion()`.
2. Determine which regions have coverage (`coveredRegions`) and which major regions lack coverage (`missingRegions`).
3. Only flag missing regions marked as `major: true` — minor regions are not expected to cover every story.
4. Only perform region gap analysis for clusters with `heatLevel >= 50` (reads `cluster.heatLevel`, already present on `StoryCluster`) — low-heat stories aren't expected to have broad regional coverage.

Regional gap fires when at least one major region is missing coverage. When `heatLevel < 50`, `regionalBreakdown` is `[]` (skipped entirely).

### `hasGeoGap` semantics

`hasGeoGap` is `true` when **either** signal fires:
- Country-level gap (single-country cluster), OR
- Regional gap (at least one major region missing in any country's breakdown)

This means `hasGeoGap` can be `true` with an empty `countryGapLabel` (multi-country cluster with a regional gap). The GlobePopup handles this by checking both `hasGeoGap` and `countryGapLabel` independently.

### Return Type

```typescript
export interface GeographicGapResult {
  hasGeoGap: boolean;
  coveredCountries: string[];
  countryGapLabel: string;
  regionalBreakdown: RegionalGap[];
}

export interface RegionalGap {
  country: string;       // ISO 2-letter code (e.g., "fr") — matches article.country
  coveredRegions: string[];
  missingRegions: string[];
  regionGapLabel: string;
}
```

When neither signal fires: `{ hasGeoGap: false, coveredCountries: [], countryGapLabel: '', regionalBreakdown: [] }`

---

## 2. Region Resolution

### Data Structure

`src/data/administrative-regions.ts` exports a flat array of `AdminRegion` entries:

```typescript
export interface AdminRegion {
  name: string;
  country: string;  // lowercase ISO 2-letter code (e.g., "fr") — must match article.country values
  lat: number;
  lng: number;
  major: boolean;
}
```

### France (13 metropolitan regions)

| Region | Centroid City | Major |
|--------|--------------|-------|
| Île-de-France | Paris | yes |
| Auvergne-Rhône-Alpes | Lyon | yes |
| Provence-Alpes-Côte d'Azur | Marseille | yes |
| Occitanie | Toulouse | yes |
| Nouvelle-Aquitaine | Bordeaux | yes |
| Hauts-de-France | Lille | yes |
| Grand Est | Strasbourg | no |
| Pays de la Loire | Nantes | no |
| Bretagne | Rennes | no |
| Normandie | Rouen | no |
| Bourgogne-Franche-Comté | Dijon | no |
| Centre-Val de Loire | Orléans | no |
| Corse | Ajaccio | no |

### Resolution Function

`resolveRegion(lat: number, lng: number, country: string): string | null`

Exported from `src/utils/geographicGap.ts`. Filters regions by country, finds the nearest centroid using Euclidean distance on lat/lng (sufficient accuracy for region-level resolution). Returns the region name or null if the country has no region data.

### Extensibility

Adding regions for other countries (Germany's Bundesländer, Spain's CCAA, UK's constituent countries, etc.) requires only adding entries to the `ADMIN_REGIONS` array — no code changes.

---

## 3. UI Integration

### GlobePopup

Add a geographic gap line below the existing credibility gap indicator (after the `{coverageGap?.hasGap && ...}` block). Shows `countryGapLabel` only — no regional detail in the popup.

- Only visible when `hasGeoGap` is true AND `countryGapLabel` is non-empty. This means regional-only gaps (multi-country cluster with missing major regions) are intentionally not shown in the popup — the popup is a teaser; regional detail is only on InvestigatePage
- Styling: same as credibility gap — `AlertTriangle` icon (w-2.5 h-2.5), `font-body text-[10px] text-amber-400/70`, `flex items-center gap-1`

### InvestigatePage

Extend the existing Coverage Analysis section. Below the credibility gap info (gapLabel + imbalanceNote), add geographic gap content when `hasGeoGap` is true:

1. **Country line:** `countryGapLabel` with `MapPin` icon (w-3.5 h-3.5), styled `text-sm text-amber-400/80` — same as credibility gap line.
2. **Regional breakdown:** For each `RegionalGap` entry:
   - Covered regions: `text-sm text-ivory-200/40` — "Covered in Île-de-France, Auvergne-Rhône-Alpes"
   - Missing regions: `text-sm text-amber-400/60` — "Not covered in Provence-Alpes-Côte d'Azur, Nouvelle-Aquitaine"

### When Hidden

- GlobePopup: geographic line hidden when `hasGeoGap` is false or `countryGapLabel` is empty
- InvestigatePage: geographic subsection hidden when `hasGeoGap` is false
- The Coverage Analysis section (heading + container) renders when `coverageGap.hasGap || geoGap.hasGeoGap` — this changes the existing conditional from `coverageGap.hasGap` only, so the section also appears when only geographic gap fires
- If both credibility gap and geographic gap fire, both are shown under the same heading

---

## 4. Files Affected

**New files:**
- `src/data/administrative-regions.ts` — `AdminRegion` interface and `ADMIN_REGIONS` array (France)
- `src/utils/geographicGap.ts` — `analyzeGeographicGap()`, `resolveRegion()`, types
- `tests/utils/geographicGap.test.ts` — tests for gap detection and region resolution. Key scenarios:
  - Cluster with < 3 articles → `hasGeoGap: false`
  - Cluster with only 1 article having country data → no country-level analysis
  - Single-country cluster (no region data) → country gap fires
  - Single-country cluster with region data but `heatLevel < 50` → country gap fires, no regional breakdown
  - Single-country cluster with region data, `heatLevel >= 50`, missing major region → both gaps fire
  - Multi-country cluster with no regional gaps → `hasGeoGap: false`
  - Multi-country cluster with regional gap → `hasGeoGap: true` (regional only)
  - `resolveRegion()` returns nearest region by centroid distance
  - `resolveRegion()` returns null for country with no region data

**Modified files:**
- `src/components/globe/GlobePopup.tsx` — add geographic gap line
- `src/pages/InvestigatePage.tsx` — add geographic gap content to Coverage Analysis section

**Unchanged:**
- `src/utils/coverageGap.ts` — credibility gap detection unchanged
- `src/utils/geoInference.ts` — geo inference unchanged (reads its output, doesn't call it)
- `src/utils/topicClustering.ts` — clustering logic unchanged
- `src/App.tsx` — no route changes

---

## 5. Non-Goals

- No polygon-based region boundaries — centroid nearest-match is sufficient for V1. Known limitation: articles near Corse (island) may be mis-assigned to the nearest mainland region due to Euclidean distance distortion; acceptable for V1
- No gap detection for clusters with fewer than 3 articles
- No predictive "expected coverage" model — only flags missing major regions when peer regions are covering the story
- No international region data beyond France in V1 — country-level gap detection works globally, region data added incrementally
- No changes to clustering or geo inference logic
- No new API calls or data fetching
- No map visualization of gaps (future enhancement)
- No clickable regions or geographic filtering
- No interaction with geo inference functions — reads `article.country` and `article.coordinates` only
