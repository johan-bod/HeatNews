# Workstream 1B: Query Strategy Overhaul

## Goal

Redesign how HeatStory queries NewsData.io to maximize article volume and geographic coverage within the 200 requests/day free-tier budget. Replace the current 40-query procedural system (dual category queries per region group) with an anchor + rotation pool model that yields more unique articles from broader geography using fewer, smarter queries.

## Architecture

Split the shared pool into two tiers: **anchor queries** (8, always run, high-signal) and **rotation queries** (22 per refresh, drawn sequentially from a pool of ~60 definitions). Rotation advances each refresh, cycling the full pool every ~3 refreshes (~12 hours). Query definitions live in a flat data file, decoupled from execution logic. No changes to caching, personalization, or the processing pipeline.

---

## 1. Query Budget Split

**Total daily budget:** 200 requests (NewsData.io free tier)

| Pool | Queries/refresh | Description |
|------|----------------|-------------|
| Anchor | 8 | Always run. Wire services, major regions. `category=top`. |
| Rotation | 22 | Drawn from pool of ~60 definitions. No category filter. |
| **Per refresh** | **30** | Down from 40. |
| Reserve | 20 | Emergency pool refresh (unchanged). |
| Personalized | ~140 remaining | 2 fetches/user/day (unchanged). |

**Why 30 instead of 40:** The current system fires 2 queries per region group (top + rotating category). Dropping to 1 query with no category filter yields more diverse results per call — NewsData returns whatever is most newsworthy in that region. The 10 saved calls/refresh are reallocated as headroom for more geographic rotation slots.

**Cache interval:** 4 hours (unchanged). At worst case ~6 refreshes/day, shared pool uses 180 of 200 daily calls. In practice, background refresh fires less frequently.

## 2. Anchor Queries

8 queries that run every refresh. Use `category=top` and `prioritydomain=top` to maximize content quality from authoritative sources.

| # | ID | Countries | Languages | Purpose |
|---|---|-----------|-----------|---------|
| 1 | `anchor-global` | *(none)* | en | Global wire services (AFP, Reuters, AP) |
| 2 | `anchor-france` | fr | fr | Core French coverage |
| 3 | `anchor-uk` | gb | en | UK perspective |
| 4 | `anchor-germany` | de | de, en | Largest EU economy |
| 5 | `anchor-europe` | fr, gb, de, es, it | en, fr | Cross-European stories |
| 6 | `anchor-us-ca` | us, ca | en | North America |
| 7 | `anchor-mena-africa` | ae, sa, eg, il, za, ng, ke | en | Middle East + Africa |
| 8 | `anchor-asia-pacific` | jp, kr, in, au | en | Asia-Pacific |

All anchors: `category: 'top'`, `prioritydomain: 'top'`, `size: 10`, no `query` parameter.

**Design decisions:**
- France, UK, and Germany each get a dedicated anchor — strongest outlet coverage, key European markets, and the user's stated priority for European breadth
- The broad `anchor-europe` catches cross-border stories the individual country anchors miss
- No free-text `query` parameter on anchors — let NewsData decide what's top in each region
- `prioritydomain=top` steers toward major outlets, aligning with the credibility system

## 3. Rotation Pool

~60 query definitions organized by geographic region. Each refresh draws 22 sequentially, advancing the index. Full cycle: ceil(60/22) = 3 refreshes ≈ 12 hours.

### Pool breakdown

**France deep (12 queries):**

| ID | Type | Query/Countries | Languages | Scale |
|---|---|---|---|---|
| `rot-fr-local-1` | Local | `query: "Paris OR Lyon OR Marseille"`, `country: fr` | fr | local |
| `rot-fr-local-2` | Local | `query: "Toulouse OR Nice OR Bordeaux"`, `country: fr` | fr | local |
| `rot-fr-local-3` | Local | `query: "Lille OR Strasbourg OR Nantes"`, `country: fr` | fr | local |
| `rot-fr-local-4` | Local | `query: "Rennes OR Montpellier OR Grenoble"`, `country: fr` | fr | local |
| `rot-fr-region-1` | Regional | `query: "Bretagne OR Normandie"`, `country: fr` | fr | regional |
| `rot-fr-region-2` | Regional | `query: "Provence OR Occitanie"`, `country: fr` | fr | regional |
| `rot-fr-region-3` | Regional | `query: "Île-de-France OR Hauts-de-France"`, `country: fr` | fr | regional |
| `rot-fr-region-4` | Regional | `query: "Auvergne-Rhône-Alpes OR Grand Est"`, `country: fr` | fr | regional |
| `rot-fr-politics` | Thematic | `country: fr, category: politics` | fr | national |
| `rot-fr-economy` | Thematic | `country: fr, category: business` | fr | national |
| `rot-fr-environment` | Thematic | `country: fr, category: environment` | fr | national |
| `rot-fr-culture` | Thematic | `country: fr, category: food` | fr | national |

**UK deep (6 queries):**

| ID | Query/Countries | Languages | Scale |
|---|---|---|---|
| `rot-uk-england` | `country: gb` | en | national |
| `rot-uk-scotland` | `query: "Scotland"`, `country: gb` | en | regional |
| `rot-uk-wales-ni` | `query: "Wales OR Northern Ireland"`, `country: gb` | en | regional |
| `rot-uk-london` | `query: "London"`, `country: gb` | en | local |
| `rot-uk-midlands` | `query: "Manchester OR Birmingham"`, `country: gb` | en | local |
| `rot-uk-politics` | `country: gb, category: politics` | en | national |

**Europe (20 queries):**

| ID | Countries | Languages | Scale |
|---|---|---|---|
| `rot-es-national` | es | es, en | national |
| `rot-es-cities` | es, `query: "Barcelona OR Madrid"` | es, en | local |
| `rot-es-regions` | es, `query: "Andalusia OR Catalonia"` | es, en | regional |
| `rot-it-national` | it | it, en | national |
| `rot-it-cities` | it, `query: "Rome OR Milan"` | it, en | local |
| `rot-it-regions` | it, `query: "Sicily OR Lombardy"` | it, en | regional |
| `rot-nl-be` | nl, be | nl, en | national |
| `rot-pt` | pt | pt, en | national |
| `rot-nordic-se-no` | se, no | en | national |
| `rot-nordic-dk-fi` | dk, fi | en | national |
| `rot-nordic-combined` | se, no, dk, fi | en | international |
| `rot-central-pl` | pl | pl, en | national |
| `rot-central-cz-sk` | cz, sk | en | national |
| `rot-central-at-ch` | at, ch | de, en | national |
| `rot-balkans-ro-bg` | ro, bg | en | national |
| `rot-balkans-gr-tr` | gr, tr | en | national |
| `rot-ie` | ie | en | national |
| `rot-baltic` | ee, lv, lt | en | national |
| `rot-hu` | hu | en | national |
| `rot-ua` | ua | en | national |

**Americas (8 queries):**

| ID | Countries | Languages | Scale |
|---|---|---|---|
| `rot-us-east` | us, `query: "New York OR Washington OR Miami"` | en | local |
| `rot-us-west` | us, `query: "Los Angeles OR San Francisco OR Seattle"` | en | local |
| `rot-mx` | mx | es, en | national |
| `rot-br` | br | pt, en | national |
| `rot-latam-south` | ar, co, cl | es, en | international |
| `rot-caribbean` | cu, jm, tt | en, es | international |
| `rot-ca-provinces` | ca | en, fr | national |
| `rot-latam-central` | pa, cr, gt | es, en | international |

**Middle East + Africa (7 queries):**

| ID | Countries | Languages | Scale |
|---|---|---|---|
| `rot-gulf` | ae, sa, qa, kw | en | international |
| `rot-levant` | lb, sy, jo, iq | en | international |
| `rot-north-africa` | ma, dz, tn, eg | en, fr | international |
| `rot-west-africa` | ng, gh, sn, ci | en, fr | international |
| `rot-east-africa` | ke, et, tz, ug | en | international |
| `rot-southern-africa` | za, zw, mz | en | international |
| `rot-iran-turkey` | ir, tr | en | international |

**Asia-Pacific (7 queries):**

| ID | Countries | Languages | Scale |
|---|---|---|---|
| `rot-jp` | jp | en | national |
| `rot-kr` | kr | en | national |
| `rot-cn-tw` | cn, tw | en | international |
| `rot-in` | in | en | national |
| `rot-southeast-asia` | th, vn, ph, id, my | en | international |
| `rot-au-nz` | au, nz | en | national |
| `rot-central-asia` | kz, uz | en | international |

**Total: 60 queries**

### No category filter on rotation queries

Rotation queries omit the `category` parameter (except the 4 French thematic queries and `rot-uk-politics`). This lets NewsData return whatever is most newsworthy in each region. The downstream topic clustering and credibility system handle grouping and quality weighting.

## 4. Query Definition Data Model

### Type

```typescript
interface QueryDefinition {
  id: string;                           // Unique key, e.g. 'anchor-france', 'rot-uk-scotland'
  label: string;                        // Human-readable, e.g. "Scotland"
  scale: 'local' | 'regional' | 'national' | 'international';
  countries?: string[];                 // ISO codes, mapped to NewsData `country` param
  languages?: string[];                 // Defaults to ['en'] if omitted
  query?: string;                       // Free-text, mapped to NewsData `q` param
  category?: string;                    // NewsData category (anchors + French thematic only)
  prioritydomain?: 'top' | 'medium';    // Source priority filter (anchors only)
  size?: number;                        // Results per query, defaults to 10
}
```

### File: `src/services/queryDefinitions.ts`

Exports two arrays:
- `ANCHOR_QUERIES: QueryDefinition[]` (8 items)
- `ROTATION_POOL: QueryDefinition[]` (~60 items)

Replaces the procedural query construction in `sharedPool.ts`. Adding a new region = adding an object to the array.

## 5. Rotation Mechanics

### Index tracking

A `rotationIndex` integer stored in localStorage (key: `heatstory_rotation_index`).

### Per-refresh logic

```
1. Read rotationIndex from localStorage (default: 0)
2. Build rotation slice:
   - start = rotationIndex
   - Take 22 items from ROTATION_POOL, wrapping around if start + 22 > pool.length
3. Combine: ANCHOR_QUERIES (8) + rotation slice (22) = 30 queries
4. Execute in batches of 5, respecting budget checks
5. Bucket results by each query's `scale` field
6. Store rotationIndex = (start + 22) % ROTATION_POOL.length
```

### Wrap-around

When the slice crosses the end of the pool, it wraps to the beginning:
```
pool.length = 60, rotationIndex = 50
→ take items [50..59] (10 items) + [0..11] (12 items) = 22 total
→ new rotationIndex = (50 + 22) % 60 = 12
```

### Coverage guarantee

With 60 queries and 22 per refresh, every query runs at least once every 3 refreshes. At 4-hour cache, that's a maximum 12-hour gap before any region gets fresh content.

## 6. Orchestration Changes

### `src/services/sharedPool.ts` — rewrite

Replace the current procedural query building (query groups, dual category per group, rotating category by day) with:

```typescript
import { ANCHOR_QUERIES, ROTATION_POOL } from './queryDefinitions';

export function buildRefreshQueries(rotationIndex: number): {
  queries: QueryDefinition[];
  nextIndex: number;
} {
  const rotationSlice = sliceWithWrap(ROTATION_POOL, rotationIndex, 22);
  return {
    queries: [...ANCHOR_QUERIES, ...rotationSlice],
    nextIndex: (rotationIndex + 22) % ROTATION_POOL.length,
  };
}
```

The existing `fetchSharedPool()` calls `buildRefreshQueries`, maps each `QueryDefinition` to `NewsDataSearchParams`, and executes in batches of 5 (same batching pattern as current code).

### `src/services/apiBudget.ts` — tweak

```typescript
export const SHARED_POOL_BUDGET = 30; // was 40
```

### `src/utils/cache.ts` — tweak

Add rotation index storage:
```typescript
const ROTATION_INDEX_KEY = 'heatstory_rotation_index';

export function getRotationIndex(): number {
  return parseInt(localStorage.getItem(ROTATION_INDEX_KEY) || '0', 10);
}

export function setRotationIndex(index: number): void {
  localStorage.setItem(ROTATION_INDEX_KEY, String(index));
}
```

### `src/services/cachedNews.ts` — minor

Update `fetchAndCacheNews` to call the new `fetchSharedPool()` (same interface, different internals). If the function signature stays the same (returns scale-bucketed articles), no changes needed here.

## 7. Files Affected

**New files:**
- `src/services/queryDefinitions.ts` — anchor + rotation pool definitions
- `tests/services/queryDefinitions.test.ts` — definition validation tests
- `tests/services/sharedPool.test.ts` — rotation logic tests

**Modified files:**
- `src/services/sharedPool.ts` — rewrite query building logic to use pool-based rotation (`fetchSharedPool` stays in `cachedNews.ts`, calls the new `buildRefreshQueries` from here)
- `src/services/apiBudget.ts` — `SHARED_POOL_BUDGET: 30`
- `src/utils/cache.ts` — add rotation index get/set
- `tests/services/apiBudget.test.ts` — update `SHARED_POOL_BUDGET` assertion from 40 to 30

**Not changed:**
- `src/services/cachedNews.ts` — caching orchestration unchanged (depends on `fetchSharedPool` return type staying the same)
- `src/services/personalizedFetch.ts` — untouched
- `src/services/newsdata-api.ts` — API client unchanged
- Processing pipeline (geocoding, topic clustering, heat analysis) — unchanged
- UI components — unchanged

## 8. Testing

### `tests/services/queryDefinitions.test.ts`

- All anchor queries have `category: 'top'`
- All query definitions have required fields (id, label, scale)
- No duplicate IDs across anchors + pool
- `ANCHOR_QUERIES.length === 8`
- `ROTATION_POOL.length` is approximately 60
- Every scale ('local', 'regional', 'national', 'international') has at least 5 queries in the combined set

### `tests/services/sharedPool.test.ts`

- `buildRefreshQueries(0)` returns 30 queries (8 anchor + 22 rotation)
- `buildRefreshQueries(0).nextIndex === 22`
- Wrap-around: `buildRefreshQueries(50)` with pool size 60 returns correct slice + nextIndex 12
- Full cycle: calling `buildRefreshQueries` 3 times with advancing index covers all 60 pool items
- Anchor queries always present regardless of rotation index
- Budget check: `fetchSharedPool` aborts if `canMakeRequest(30)` returns false

### Modified: `tests/services/apiBudget.test.ts`

- Update `SHARED_POOL_BUDGET` assertion from 40 to 30

## 9. Non-Goals

- No changes to cache TTL (stays 4 hours)
- No changes to personalized fetch system (stays 2 fetches/user/day)
- No changes to the processing pipeline (geocoding, clustering, heat)
- No changes to UI (components consume the same scale-bucketed data)
- No second data source (Perigon, GDELT, etc.) — future workstream
- No dynamic pool reordering based on content quality — keep it simple with sequential rotation
