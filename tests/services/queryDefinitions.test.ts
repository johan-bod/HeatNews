// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ANCHOR_QUERIES, ROTATION_POOL, type QueryDefinition } from '@/services/queryDefinitions';

describe('QueryDefinition validation', () => {
  const allQueries = [...ANCHOR_QUERIES, ...ROTATION_POOL];

  describe('ANCHOR_QUERIES', () => {
    it('has exactly 8 anchor queries', () => {
      expect(ANCHOR_QUERIES).toHaveLength(8);
    });

    it('all anchors have category top', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.category).toBe('top');
      }
    });

    it('all anchors have prioritydomain top', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.prioritydomain).toBe('top');
      }
    });

    it('all anchor IDs start with anchor-', () => {
      for (const q of ANCHOR_QUERIES) {
        expect(q.id).toMatch(/^anchor-/);
      }
    });
  });

  describe('ROTATION_POOL', () => {
    it('has exactly 60 rotation queries', () => {
      expect(ROTATION_POOL).toHaveLength(60);
    });

    it('all rotation IDs start with rot-', () => {
      for (const q of ROTATION_POOL) {
        expect(q.id).toMatch(/^rot-/);
      }
    });
  });

  describe('all queries', () => {
    it('have required fields (id, label, scale)', () => {
      for (const q of allQueries) {
        expect(q.id).toBeTruthy();
        expect(q.label).toBeTruthy();
        expect(['local', 'regional', 'national', 'international']).toContain(q.scale);
      }
    });

    it('have no duplicate IDs', () => {
      const ids = allQueries.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every scale has at least 5 queries', () => {
      const scales = ['local', 'regional', 'national', 'international'] as const;
      for (const scale of scales) {
        const count = allQueries.filter(q => q.scale === scale).length;
        expect(count).toBeGreaterThanOrEqual(5);
      }
    });

    it('languages defaults are valid arrays or undefined', () => {
      for (const q of allQueries) {
        if (q.languages !== undefined) {
          expect(Array.isArray(q.languages)).toBe(true);
          expect(q.languages.length).toBeGreaterThan(0);
        }
      }
    });

    it('countries are valid arrays or undefined', () => {
      for (const q of allQueries) {
        if (q.countries !== undefined) {
          expect(Array.isArray(q.countries)).toBe(true);
          expect(q.countries.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
