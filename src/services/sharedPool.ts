import type { NewsDataSearchParams } from './newsdata-api';
import { ANCHOR_QUERIES, ROTATION_POOL, type QueryDefinition } from './queryDefinitions';

// Pool is exactly 22 items — entire pool runs on every refresh (no rotation needed)
const ROTATION_SLICE_SIZE = 22;

/**
 * Slice `count` items from `arr` starting at `start`, wrapping around.
 */
export function sliceWithWrap<T>(arr: readonly T[], start: number, count: number): T[] {
  const len = arr.length;
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(start + i) % len]);
  }
  return result;
}

/**
 * Build the list of queries for one shared pool refresh.
 * Returns 8 anchors + 22 rotation queries + the next rotation index.
 */
export function buildRefreshQueries(rotationIndex: number): {
  queries: QueryDefinition[];
  nextIndex: number;
} {
  const rotationSlice = sliceWithWrap(ROTATION_POOL, rotationIndex, ROTATION_SLICE_SIZE);
  return {
    queries: [...ANCHOR_QUERIES, ...rotationSlice],
    nextIndex: (rotationIndex + ROTATION_SLICE_SIZE) % ROTATION_POOL.length,
  };
}

/**
 * Convert a QueryDefinition to NewsDataSearchParams.
 * Maps plural fields (countries, languages) to the API's singular params.
 */
export function toSearchParams(def: QueryDefinition): NewsDataSearchParams {
  const params: NewsDataSearchParams = {
    size: def.size ?? 10,
  };

  if (def.countries) {
    params.country = def.countries.length === 1 ? def.countries[0] : def.countries;
  }

  if (def.languages) {
    params.language = def.languages.length === 1 ? def.languages[0] : def.languages;
  } else {
    params.language = 'en';
  }

  if (def.query) params.query = def.query;
  if (def.category) params.category = def.category;
  if (def.prioritydomain) params.prioritydomain = def.prioritydomain;

  return params;
}
