import { describe, it, expect } from 'vitest';
import {
  altitudeToScale,
  getMarkerSize,
  getMarkerColor,
  filterArticlesByAltitude,
  isWebGLAvailable,
  getMaxMarkers,
} from '@/utils/globeUtils';
import type { NewsArticle } from '@/types/news';

const makeArticle = (
  id: string,
  scale: 'local' | 'regional' | 'national' | 'international',
  heatLevel: number = 50
): NewsArticle => ({
  id,
  title: `Article ${id}`,
  url: 'https://example.com',
  publishedAt: new Date().toISOString(),
  source: { name: 'test' },
  scale,
  heatLevel,
  coordinates: { lat: 48.86, lng: 2.35 },
});

describe('altitudeToScale', () => {
  it('returns international for very high altitude', () => {
    expect(altitudeToScale(10000)).toBe('international');
  });

  it('returns national for continent-level altitude', () => {
    expect(altitudeToScale(5000)).toBe('national');
  });

  it('returns regional for country-level altitude', () => {
    expect(altitudeToScale(1500)).toBe('regional');
  });

  it('returns local for city-level altitude', () => {
    expect(altitudeToScale(500)).toBe('local');
  });
});

describe('getMarkerSize', () => {
  it('returns small size for cold heat', () => {
    expect(getMarkerSize(10)).toBeLessThanOrEqual(0.3);
  });

  it('returns large size for hot heat', () => {
    expect(getMarkerSize(90)).toBeGreaterThanOrEqual(0.8);
  });

  it('clamps size within valid range', () => {
    expect(getMarkerSize(0)).toBeGreaterThan(0);
    expect(getMarkerSize(100)).toBeLessThanOrEqual(1.2);
  });
});

describe('getMarkerColor', () => {
  it('returns grey for cold (0-20)', () => {
    expect(getMarkerColor(10)).toBe('#94A3B8');
  });

  it('returns amber for warming (21-40)', () => {
    expect(getMarkerColor(30)).toBe('#F59E0B');
  });

  it('returns orange for warm (41-60)', () => {
    expect(getMarkerColor(50)).toBe('#F97316');
  });

  it('returns orange-red for hot (61-80)', () => {
    expect(getMarkerColor(70)).toBe('#EA580C');
  });

  it('returns deep red for very hot (81-100)', () => {
    expect(getMarkerColor(95)).toBe('#DC2626');
  });
});

describe('filterArticlesByAltitude', () => {
  const articles = [
    makeArticle('1', 'local', 50),
    makeArticle('2', 'regional', 60),
    makeArticle('3', 'national', 70),
    makeArticle('4', 'international', 80),
  ];

  it('shows only international at high altitude', () => {
    const filtered = filterArticlesByAltitude(articles, 10000);
    expect(filtered.every(a => a.scale === 'international')).toBe(true);
  });

  it('shows national + international at continent level', () => {
    const filtered = filterArticlesByAltitude(articles, 5000);
    const scales = filtered.map(a => a.scale);
    expect(scales).toContain('international');
    expect(scales).toContain('national');
    expect(scales).not.toContain('local');
  });

  it('shows all scales at city level', () => {
    const filtered = filterArticlesByAltitude(articles, 500);
    expect(filtered.length).toBe(4);
  });

  it('caps at max markers, keeping highest heat first', () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      makeArticle(`a${i}`, 'international', i % 100)
    );
    const filtered = filterArticlesByAltitude(many, 10000, 200);
    expect(filtered.length).toBeLessThanOrEqual(200);
    // Highest heat articles should be kept
    expect(filtered[0].heatLevel).toBeGreaterThanOrEqual(filtered[filtered.length - 1].heatLevel!);
  });
});

describe('getMaxMarkers', () => {
  it('returns 200 for desktop', () => {
    expect(getMaxMarkers(1024)).toBe(200);
  });

  it('returns 100 for mobile', () => {
    expect(getMaxMarkers(600)).toBe(100);
  });
});
