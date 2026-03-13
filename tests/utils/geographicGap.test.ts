import { describe, it, expect } from 'vitest';
import { analyzeGeographicGap, resolveRegion } from '@/utils/geographicGap';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(
  id: string,
  overrides: Partial<NewsArticle> = {}
): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://example.com/article-${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://example.com` },
    ...overrides,
  } as NewsArticle;
}

function makeCluster(
  articles: NewsArticle[],
  heatLevel: number = 50
): StoryCluster {
  return {
    articles,
    terms: new Set<string>(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel,
    coverage: articles.length,
  };
}

describe('resolveRegion', () => {
  it('returns nearest French region for coordinates near Paris', () => {
    const region = resolveRegion(48.86, 2.35, 'fr');
    expect(region).toBe('Île-de-France');
  });

  it('returns nearest French region for coordinates near Lyon', () => {
    const region = resolveRegion(45.76, 4.84, 'fr');
    expect(region).toBe('Auvergne-Rhône-Alpes');
  });

  it('returns null for country with no region data', () => {
    const region = resolveRegion(51.5, -0.12, 'gb');
    expect(region).toBeNull();
  });
});

describe('analyzeGeographicGap', () => {
  it('returns no gap for cluster with fewer than 3 articles', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'fr' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(false);
  });

  it('returns no gap when only 1 article has country data', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2'),
      makeArticle('3'),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(false);
    expect(result.countryGapLabel).toBe('');
  });

  it('flags single-country cluster as country gap', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'fr' }),
      makeArticle('3', { country: 'fr' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('Only covered by French media');
    expect(result.coveredCountries).toEqual(['fr']);
  });

  it('flags single-country cluster with no region data (country gap only)', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'gb' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'gb' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('Only covered by British media');
    expect(result.regionalBreakdown).toEqual([]);
  });

  it('does not flag country gap for multi-country cluster', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'us' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.countryGapLabel).toBe('');
    expect(result.coveredCountries).toContain('fr');
    expect(result.coveredCountries).toContain('gb');
    expect(result.coveredCountries).toContain('us');
  });

  it('skips regional analysis when heatLevel < 50', () => {
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 45.76, lng: 4.84 } }),
        makeArticle('3', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
      ],
      30
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true); // country gap still fires
    expect(result.regionalBreakdown).toEqual([]);
  });

  it('detects missing major regions when heatLevel >= 50', () => {
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 45.76, lng: 4.84 } }),
        makeArticle('3', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
      ],
      70
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('Only covered by French media');
    expect(result.regionalBreakdown).toHaveLength(1);
    const fr = result.regionalBreakdown[0];
    expect(fr.country).toBe('fr');
    expect(fr.coveredRegions).toContain('Île-de-France');
    expect(fr.coveredRegions).toContain('Auvergne-Rhône-Alpes');
    expect(fr.missingRegions).toContain('Provence-Alpes-Côte d\'Azur');
    expect(fr.missingRegions).toContain('Occitanie');
    expect(fr.missingRegions).toContain('Nouvelle-Aquitaine');
    expect(fr.missingRegions).toContain('Hauts-de-France');
    expect(fr.regionGapLabel).toMatch(/Not covered in/);
  });

  it('returns hasGeoGap true for multi-country with regional gap only', () => {
    const cluster = makeCluster(
      [
        makeArticle('1', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('2', { country: 'fr', coordinates: { lat: 48.86, lng: 2.35 } }),
        makeArticle('3', { country: 'gb' }),
      ],
      70
    );
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(true);
    expect(result.countryGapLabel).toBe('');
    expect(result.regionalBreakdown.length).toBeGreaterThan(0);
  });

  it('returns no gap for multi-country cluster without regional gaps', () => {
    const cluster = makeCluster([
      makeArticle('1', { country: 'fr' }),
      makeArticle('2', { country: 'gb' }),
      makeArticle('3', { country: 'us' }),
    ]);
    const result = analyzeGeographicGap(cluster);
    expect(result.hasGeoGap).toBe(false);
  });
});
