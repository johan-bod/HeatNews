import { describe, it, expect } from 'vitest';
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  audienceScaleToRadiusKm,
  generateBlobPolygon,
  crossfadeOpacity,
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

describe('audienceScaleToRadiusKm', () => {
  it('maps small to 50km', () => {
    expect(audienceScaleToRadiusKm('small')).toBe(50);
  });

  it('maps medium to 150km', () => {
    expect(audienceScaleToRadiusKm('medium')).toBe(150);
  });

  it('maps large to 400km', () => {
    expect(audienceScaleToRadiusKm('large')).toBe(400);
  });

  it('defaults to 80km for undefined', () => {
    expect(audienceScaleToRadiusKm(undefined)).toBe(80);
  });
});

describe('generateBlobPolygon', () => {
  it('generates an 8-point circle polygon', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 100);
    expect(blob.type).toBe('Feature');
    expect(blob.geometry.type).toBe('Polygon');
    expect(blob.geometry.coordinates[0]).toHaveLength(9); // 8 + closing point
  });

  it('first and last points are the same (closed ring)', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 100);
    const ring = blob.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('center of blob is approximately at the given lat/lng', () => {
    const blob = generateBlobPolygon(48.86, 2.35, 50);
    const ring = blob.geometry.coordinates[0];
    const avgLng = ring.slice(0, -1).reduce((s, p) => s + p[0], 0) / 8;
    const avgLat = ring.slice(0, -1).reduce((s, p) => s + p[1], 0) / 8;
    expect(avgLng).toBeCloseTo(2.35, 0);
    expect(avgLat).toBeCloseTo(48.86, 0);
  });

  it('larger radius produces wider spread', () => {
    const small = generateBlobPolygon(48.86, 2.35, 50);
    const large = generateBlobPolygon(48.86, 2.35, 400);
    const spreadSmall = Math.max(...small.geometry.coordinates[0].map(p => p[0])) -
                        Math.min(...small.geometry.coordinates[0].map(p => p[0]));
    const spreadLarge = Math.max(...large.geometry.coordinates[0].map(p => p[0])) -
                        Math.min(...large.geometry.coordinates[0].map(p => p[0]));
    expect(spreadLarge).toBeGreaterThan(spreadSmall);
  });
});

describe('crossfadeOpacity', () => {
  it('returns { country: 1, blob: 1 } above 5000km (international)', () => {
    expect(crossfadeOpacity(6000)).toEqual({ country: 1, blob: 1 });
    expect(crossfadeOpacity(5000)).toEqual({ country: 1, blob: 1 });
  });

  it('returns { country: 1, blob: 0 } below 2500km (regional/local)', () => {
    expect(crossfadeOpacity(1000)).toEqual({ country: 1, blob: 0 });
    expect(crossfadeOpacity(2500)).toEqual({ country: 1, blob: 0 });
  });

  it('returns interpolated blob in 2500-5000km range, country always 1', () => {
    const mid = crossfadeOpacity(3750);
    expect(mid.country).toBe(1);
    expect(mid.blob).toBeCloseTo(0.5, 1);
  });

  it('blob increases linearly from 0 to 1 across crossfade range', () => {
    const low = crossfadeOpacity(2600);
    const high = crossfadeOpacity(4900);
    expect(low.blob).toBeCloseTo(0.04, 1);
    expect(high.blob).toBeCloseTo(0.96, 1);
    expect(low.country).toBe(1);
    expect(high.country).toBe(1);
  });
});
