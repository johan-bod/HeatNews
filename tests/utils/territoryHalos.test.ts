import { describe, it, expect } from 'vitest';
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  type CountryHeatEntry,
} from '@/utils/territoryHalos';
import type { NewsArticle } from '@/types/news';

function makeArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: '1',
    title: 'Test',
    url: 'https://example.com',
    publishedAt: new Date().toISOString(),
    source: { name: 'test' },
    heatLevel: 50,
    color: '#F97316',
    country: 'fr',
    ...overrides,
  };
}

describe('aggregateCountryHeat', () => {
  it('returns empty map for empty articles', () => {
    const result = aggregateCountryHeat([]);
    expect(result.size).toBe(0);
  });

  it('aggregates by country, taking max heat', () => {
    const articles = [
      makeArticle({ id: '1', country: 'fr', heatLevel: 30, color: '#F59E0B' }),
      makeArticle({ id: '2', country: 'fr', heatLevel: 80, color: '#EF4444' }),
      makeArticle({ id: '3', country: 'us', heatLevel: 50, color: '#F97316' }),
    ];
    const result = aggregateCountryHeat(articles);
    expect(result.get('fr')).toEqual({ heat: 80, color: '#EF4444' });
    expect(result.get('us')).toEqual({ heat: 50, color: '#F97316' });
  });

  it('skips articles without country', () => {
    const articles = [
      makeArticle({ id: '1', country: undefined, heatLevel: 90 }),
      makeArticle({ id: '2', country: 'de', heatLevel: 40, color: '#F59E0B' }),
    ];
    const result = aggregateCountryHeat(articles);
    expect(result.size).toBe(1);
    expect(result.has('de')).toBe(true);
  });
});

describe('heatToFillOpacity', () => {
  it('returns 0.05 for cold articles (heat 0-20)', () => {
    expect(heatToFillOpacity(10)).toBe(0.05);
    expect(heatToFillOpacity(20)).toBe(0.05);
  });

  it('returns 0.12 for warming articles (heat 21-50)', () => {
    expect(heatToFillOpacity(30)).toBe(0.12);
    expect(heatToFillOpacity(50)).toBe(0.12);
  });

  it('returns 0.2 for hot articles (heat 51-80)', () => {
    expect(heatToFillOpacity(60)).toBe(0.2);
  });

  it('returns 0.3 for very hot articles (heat 81-100)', () => {
    expect(heatToFillOpacity(90)).toBe(0.3);
  });

  it('returns 0.05 for heat 0', () => {
    expect(heatToFillOpacity(0)).toBe(0.05);
  });
});
