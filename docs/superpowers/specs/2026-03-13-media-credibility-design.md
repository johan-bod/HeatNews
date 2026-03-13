# Media Credibility System Design

## Goal

Introduce a hybrid credibility scoring system that downweights low-quality sources in the heat formula, filters out unreliable sources entirely, and gives the editor (user) control to adjust tiers over time. Solves the "random blogs showing up with same weight as AFP" problem.

## Architecture

A centralized credibility service (`credibilityService.ts`) resolves any article to a tier and weight via a three-step lookup: domain overrides → outlet registry → fallback. The heat formula uses weighted source counting instead of raw unique source counting. Unreliable sources are filtered at ingestion.

---

## 1. Credibility Tiers

Six tiers with fixed weights:

| Tier | Weight | Filtered | Description |
|------|--------|----------|-------------|
| `reference` | 1.0 | No | Wire services, agencies of record (AFP, Reuters, AP) |
| `established` | 0.9 | No | National newspapers of record (Le Monde, The Guardian) |
| `regional` | 0.85 | No | Regional dailies (Ouest-France, La Voix du Nord) |
| `hyperlocal` | 0.5 | No | Department/city outlets — weak individually, strong in convergence |
| `niche` | 0.4 | No | Blogs, small independents, unknown sources |
| `unreliable` | 0.0 | **Yes** | Disinformation sites, clickbait farms |

**Design decision:** Regional outlets get 0.85, not a lower value. Regional ≠ lower quality — it means smaller audience. Credibility weight reflects trustworthiness, not reach. `audienceScale` (already on `MediaOutlet`) handles reach-related concerns separately.

**Unknown sources** (not in registry, no override) default to `niche` (0.4). This ensures the app incrementally improves as the editor catalogues sources, rather than depending on external API signals.

## 2. Credibility Service

A single module `src/utils/credibilityService.ts` with one core function:

```typescript
resolveCredibility(article: NewsArticle): {
  tier: CredibilityTier;
  weight: number;
  filtered: boolean;
}
```

**Resolution order:**
1. Extract domain from `article.source.url` (the nested `source` object). If `source.url` is undefined, extract from `article.url` (the article link). If neither yields a domain, fall through to fallback.
2. Check `CREDIBILITY_OVERRIDES` (domain-keyed map) → if found, use that tier
3. Check outlet registry via `findOutletByDomain(domain)` → if found, use outlet's `credibilityTier`
4. Fallback → `niche` (weight 0.4, not filtered)

**Weights map** lives in the same module:
```typescript
const TIER_WEIGHTS: Record<CredibilityTier, number> = {
  reference: 1.0,
  established: 0.9,
  regional: 0.85,
  hyperlocal: 0.5,
  niche: 0.4,
  unreliable: 0.0,
};
```

**Also exports a domain-based resolver** for use in clustering (where the loop iterates over unique `source.name` keys, not full articles):

```typescript
resolveCredibilityByDomain(domain: string | undefined): {
  tier: CredibilityTier;
  weight: number;
  filtered: boolean;
}
```

`resolveCredibility(article)` extracts the domain and delegates to `resolveCredibilityByDomain`. The clustering code calls `resolveCredibilityByDomain` directly, caching the result per `source.name` to avoid redundant lookups (one resolution per unique source, not per article).

All credibility logic centralized in one file. When the algorithm needs to evolve (new signals, adjusted weights, new tiers), only this module changes. Consumers call `resolveCredibility()` or `resolveCredibilityByDomain()` and get back everything they need.

## 3. Editorial Overrides

File: `src/data/credibility-overrides.ts`

```typescript
import type { CredibilityTier } from './media-types';

export const CREDIBILITY_OVERRIDES: Record<string, CredibilityTier> = {
  // Example overrides — add domains as you review sources
  // 'cnews.fr': 'unreliable',
  // 'valeursactuelles.com': 'niche',
};
```

**Keyed by domain**, not outlet name. This allows overriding any source immediately — including ones not yet in the outlet registry. Overrides take priority over the registry, so demoting or promoting an outlet doesn't require touching `media-outlets.ts`.

**Workflow:** Editor spots a problematic source → adds domain to overrides → commits → redeploy. Git history tracks every editorial decision.

## 4. Heat Formula Integration

**Current formula:**
```
heat = min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus)
```

**New formula:**
```
weightedSources = sum(credibilityWeight per unique source)
convergenceBonus = if (hyperlocalCount >= 3) then hyperlocalCount * 3 else 0
heat = min(100, (weightedSources * 20) + (articleCount * 5) + recencyBonus + convergenceBonus)
```

**Changes in `topicClustering.ts`:**
- Unreliable articles are already filtered at ingestion (Section 5), so clustering can assume all articles are at least Niche tier
- During heat calculation, for each unique source in `cluster.uniqueSources`, resolve its credibility via `resolveCredibilityByDomain` (cache result by `source.name` to avoid redundant lookups). Note: `source.name` contains the `source_id` value (e.g., `"lemonde"`), and the domain for lookup must be extracted from one of that source's articles' `source.url` field
- Replace `uniqueSources.size` with `weightedSources`: sum of credibility weights per unique source
- Count how many unique sources resolve to `hyperlocal` tier for the convergence bonus (computed transiently during `calculateClusterHeat`, no new field on `StoryCluster`)

**Convergence bonus rationale:** Hyperlocal outlets are individually weak signals (0.5 weight) but collectively powerful. When 3+ independent hyperlocal sources converge on the same topic cluster, the bonus recognizes this as an emerging story that national media may not have picked up yet. Example: 5 department-level outlets covering agricultural protests across France → convergence bonus of 15 added to heat.

**Example scenarios:**

| Cluster | Old heat (excl. recency) | New heat (excl. recency) |
|---------|--------------------------|--------------------------|
| 3 Reference, 5 articles | 85 | 85 |
| 3 Niche, 5 articles | 85 | 49 |
| 5 Hyperlocal, 5 articles | 125→100 | 90 (50+25+15 convergence) |
| 1 Reference + 4 Unreliable, 5 articles ingested (1 survives filter) | 125→100 | 25 (4 filtered at ingestion, 1 article in cluster) |

**Note on convergence bonus at scale:** The bonus is most impactful for clusters dominated by hyperlocal sources. Once reference or established outlets cover the same story, the cluster's heat is already high from weighted sources, and the convergence bonus becomes irrelevant against the `min(100)` cap. This is intentional — the bonus exists to surface emerging stories *before* major outlets pick them up.

## 5. Filtering Pipeline

Unreliable articles are filtered at ingestion in `newsdata-api.ts`, during `convertNewsDataArticle`:

- After converting the raw API response to a `NewsArticle`, call `resolveCredibility()`
- If `filtered === true`, return `null`
- Change return type of `convertNewsDataArticle` from `NewsArticle` to `NewsArticle | null`
- Update `searchAndFilterNews` to filter nulls: `response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null)`

**Why filter at ingestion:**
- No wasted processing (clustering, geocoding, territory halos)
- No risk of an Unreliable article leaking through a code path that forgot to check
- Simple invariant: if an article is in the system, it's at least Niche tier

## 6. Initial Tier Assignment

The 78 existing outlets in `media-outlets.ts` get `credibilityTier` assigned. The `type` field on `MediaOutlet` (`'local'|'regional'|'national'|'international'`) does not map 1:1 to credibility tiers — e.g., `type: 'international'` includes both wire services (AFP) and broadcasters (France 24). Assignment is by editorial judgment per outlet:

- **Reference:** Wire services only — AFP, Reuters, AP, EFE, ANSA, DPA. These are agencies of record, not broadcasters.
- **Established:** National newspapers of record and major international broadcasters — Le Monde, The Guardian, NYT, BBC, France 24, Al Jazeera, etc.
- **Regional:** Regional dailies — Ouest-France, La Voix du Nord, Sud Ouest, etc.
- **Hyperlocal:** Department/city outlets — Le Journal de Saône-et-Loire, etc. (Currently only ~1 outlet has `type: 'local'`)
- **Niche:** Everything that doesn't fit above categories

Outlets without the field fall through to the credibility service's fallback (Niche). Over time, the editor adjusts tiers via the overrides file or by updating the outlet's `credibilityTier` directly.

## 7. Data Model Changes

**`src/data/media-types.ts`:**
```typescript
export type CredibilityTier = 'reference' | 'established' | 'regional' | 'hyperlocal' | 'niche' | 'unreliable';
```

Add optional `credibilityTier?: CredibilityTier` to the `MediaOutlet` interface.

## 8. Files Affected

**New files:**
- `src/utils/credibilityService.ts` — resolution function, weights map, convergence bonus logic
- `src/data/credibility-overrides.ts` — domain-keyed editorial overrides
- `tests/utils/credibilityService.test.ts` — tests for resolution order, weights, filtering, convergence

**Modified files:**
- `src/data/media-types.ts` — add `CredibilityTier` type, add optional `credibilityTier` to `MediaOutlet`
- `src/data/media-outlets.ts` — add `credibilityTier` to each of the 78 outlets
- `src/utils/topicClustering.ts` — weighted source counting, convergence bonus
- `src/services/newsdata-api.ts` — filter unreliable articles at ingestion

**Not changed:**
- Globe, feed, UI components — consume heat scores calculated upstream
- `mediaLookup.ts` — provides `findOutletByDomain`, used as-is

## 9. Non-Goals

- No admin UI for tier management (in-code overrides are sufficient for single editor)
- No use of NewsData `source_priority` as a signal (editorial independence from API)
- No real-time credibility scoring (tiers are static, changed via commits)
- No UI indication of source credibility to end users (may be added later)
