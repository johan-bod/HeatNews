import { describe, it, expect } from 'vitest';
import {
  buildPersonalizedQueries,
  estimateRequestCount,
} from '@/services/personalizedFetch';
import type { UserPreferences } from '@/types/preferences';

const makePrefs = (
  topics: string[],
  locations: { name: string; key: string; lat: number; lng: number; type: 'city' | 'country' }[]
): UserPreferences => ({
  topics: topics as UserPreferences['topics'],
  locations,
  onboardingComplete: true,
  updatedAt: Date.now(),
});

describe('estimateRequestCount', () => {
  it('returns 1 for 1-2 topics + 1 location', () => {
    expect(estimateRequestCount(2, 1)).toBe(1);
  });

  it('returns 2 for 3+ topics OR 2+ locations', () => {
    expect(estimateRequestCount(3, 1)).toBe(2);
    expect(estimateRequestCount(1, 2)).toBe(2);
  });

  it('returns 3 for 3+ topics AND 2+ locations', () => {
    expect(estimateRequestCount(4, 3)).toBe(3);
  });

  it('returns 0 for empty preferences', () => {
    expect(estimateRequestCount(0, 0)).toBe(0);
  });
});

describe('buildPersonalizedQueries', () => {
  it('returns empty for empty preferences', () => {
    const prefs = makePrefs([], []);
    expect(buildPersonalizedQueries(prefs)).toEqual([]);
  });

  it('builds 1 query for 2 topics + 1 location', () => {
    const prefs = makePrefs(
      ['politics', 'technology'],
      [{ name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' }]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(1);
    expect(queries[0].category).toBeDefined();
  });

  it('builds 2 queries for 4 topics + 1 location', () => {
    const prefs = makePrefs(
      ['politics', 'technology', 'sports', 'health'],
      [{ name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' }]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(2);
  });

  it('builds 3 queries for 4 topics + 3 locations', () => {
    const prefs = makePrefs(
      ['politics', 'technology', 'sports', 'health'],
      [
        { name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' },
        { name: 'Tokyo', key: 'tokyo', lat: 35.68, lng: 139.69, type: 'city' },
        { name: 'London', key: 'london', lat: 51.51, lng: -0.13, type: 'city' },
      ]
    );
    const queries = buildPersonalizedQueries(prefs);
    expect(queries).toHaveLength(3);
  });
});
