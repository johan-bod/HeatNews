// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  buildRefreshQueries,
  sliceWithWrap,
  toSearchParams,
} from '@/services/sharedPool';
import { ANCHOR_QUERIES, ROTATION_POOL } from '@/services/queryDefinitions';

describe('sliceWithWrap', () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it('slices without wrapping', () => {
    expect(sliceWithWrap(items, 0, 3)).toEqual([0, 1, 2]);
    expect(sliceWithWrap(items, 5, 3)).toEqual([5, 6, 7]);
  });

  it('wraps around end of array', () => {
    expect(sliceWithWrap(items, 8, 4)).toEqual([8, 9, 0, 1]);
  });

  it('handles exact end boundary', () => {
    expect(sliceWithWrap(items, 7, 3)).toEqual([7, 8, 9]);
  });

  it('handles count larger than array', () => {
    const result = sliceWithWrap(items, 0, 12);
    expect(result).toHaveLength(12);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
  });
});

describe('buildRefreshQueries', () => {
  it('returns 30 total queries (8 anchor + 22 rotation)', () => {
    const { queries } = buildRefreshQueries(0);
    expect(queries).toHaveLength(30);
  });

  it('first 8 queries are always anchors', () => {
    const { queries } = buildRefreshQueries(0);
    const anchorIds = queries.slice(0, 8).map(q => q.id);
    expect(anchorIds).toEqual(ANCHOR_QUERIES.map(q => q.id));
  });

  it('anchor queries present regardless of rotation index', () => {
    const { queries: q0 } = buildRefreshQueries(0);
    const { queries: q30 } = buildRefreshQueries(30);
    const { queries: q55 } = buildRefreshQueries(55);

    for (const result of [q0, q30, q55]) {
      const anchorIds = result.slice(0, 8).map(q => q.id);
      expect(anchorIds).toEqual(ANCHOR_QUERIES.map(q => q.id));
    }
  });

  it('nextIndex from 0 is 0 (pool size equals slice size)', () => {
    // (0 + 22) % 22 = 0
    const { nextIndex } = buildRefreshQueries(0);
    expect(nextIndex).toBe(0);
  });

  it('nextIndex equals start index (pool size = slice size, no net advance)', () => {
    // (start + 22) % 22 = start % 22 — rotation position stays the same
    for (const start of [0, 5, 11, 21]) {
      const { nextIndex } = buildRefreshQueries(start);
      expect(nextIndex).toBe(start % 22);
    }
  });

  it('rotation slice starts at given index', () => {
    const { queries } = buildRefreshQueries(0);
    const rotationIds = queries.slice(8).map(q => q.id);
    const expectedIds = ROTATION_POOL.slice(0, 22).map(q => q.id);
    expect(rotationIds).toEqual(expectedIds);
  });

  it('rotation slice wraps correctly', () => {
    // Start at index 15: items [15..21] + [0..14] = 22 items
    const { queries } = buildRefreshQueries(15);
    const rotationIds = queries.slice(8).map(q => q.id);
    const expected = [
      ...ROTATION_POOL.slice(15, 22),
      ...ROTATION_POOL.slice(0, 15),
    ].map(q => q.id);
    expect(rotationIds).toEqual(expected);
  });

  it('single refresh covers every rotation query (pool size = slice size)', () => {
    // Pool has 22 items, entire pool runs on every refresh — 1 cycle is enough
    const { queries } = buildRefreshQueries(0);
    const rotationIds = new Set(queries.slice(8).map(q => q.id));

    for (const q of ROTATION_POOL) {
      expect(rotationIds.has(q.id)).toBe(true);
    }
  });
});

describe('toSearchParams', () => {
  it('maps countries to country param', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
      countries: ['fr', 'de'],
      languages: ['fr', 'en'],
    });
    expect(result.country).toEqual(['fr', 'de']);
    expect(result.language).toEqual(['fr', 'en']);
  });

  it('defaults language to en when languages omitted', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
    });
    expect(result.language).toBe('en');
  });

  it('defaults size to 10', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
    });
    expect(result.size).toBe(10);
  });

  it('passes through query, category, prioritydomain', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'local',
      query: 'Paris OR Lyon',
      category: 'top',
      prioritydomain: 'top',
    });
    expect(result.query).toBe('Paris OR Lyon');
    expect(result.category).toBe('top');
    expect(result.prioritydomain).toBe('top');
  });

  it('respects custom size', () => {
    const result = toSearchParams({
      id: 'test', label: 'Test', scale: 'national',
      size: 5,
    });
    expect(result.size).toBe(5);
  });
});
