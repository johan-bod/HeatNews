// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildClusterArcs, countDistinctLocations, hexToRgbaArc } from '@/utils/arcBuilder';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(id: string, lat?: number, lng?: number): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://source${id}.com` },
    coordinates: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    color: '#F59E0B',
  } as NewsArticle;
}

function makeCluster(articles: NewsArticle[]): StoryCluster {
  return {
    articles,
    terms: new Set<string>(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel: 50,
    coverage: articles.length,
  };
}

describe('hexToRgbaArc', () => {
  it('converts hex to rgba with given alpha', () => {
    expect(hexToRgbaArc('#F59E0B', 0.6)).toBe('rgba(245, 158, 11, 0.6)');
  });

  it('handles lowercase hex', () => {
    expect(hexToRgbaArc('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('countDistinctLocations', () => {
  it('returns 0 for cluster with no coordinates', () => {
    const cluster = makeCluster([makeArticle('1'), makeArticle('2')]);
    expect(countDistinctLocations(cluster)).toBe(0);
  });

  it('counts unique locations (1-decimal rounding)', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),
      makeArticle('2', 48.8601, 2.3510),
      makeArticle('3', 51.5074, -0.1278),
    ]);
    expect(countDistinctLocations(cluster)).toBe(2);
  });

  it('returns 1 when all articles are in same location', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),
      makeArticle('2', 48.8601, 2.3510),
    ]);
    expect(countDistinctLocations(cluster)).toBe(1);
  });

  it('skips articles without coordinates', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),
      makeArticle('2'),
      makeArticle('3', 51.5074, -0.1278),
    ]);
    expect(countDistinctLocations(cluster)).toBe(2);
  });
});

describe('buildClusterArcs', () => {
  it('returns empty array when current article has no coordinates', () => {
    const current = makeArticle('1');
    const cluster = makeCluster([current, makeArticle('2', 51.5074, -0.1278)]);
    expect(buildClusterArcs(cluster, current)).toEqual([]);
  });

  it('returns empty array when no other locations exist', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    const cluster = makeCluster([current, makeArticle('2')]);
    expect(buildClusterArcs(cluster, current)).toEqual([]);
  });

  it('creates arcs from current article to distinct locations', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    const cluster = makeCluster([
      current,
      makeArticle('2', 51.5074, -0.1278),
      makeArticle('3', 40.4168, -3.7038),
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(2);
    expect(arcs[0].startLat).toBeCloseTo(48.8566);
    expect(arcs[0].startLng).toBeCloseTo(2.3522);
    expect(arcs[0].color).toContain('rgba');
  });

  it('deduplicates endpoints in same city', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    const cluster = makeCluster([
      current,
      makeArticle('2', 51.5074, -0.1278),
      makeArticle('3', 51.5200, -0.1100),
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(1);
  });

  it('excludes endpoints matching current article location', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    const cluster = makeCluster([
      current,
      makeArticle('2', 48.8601, 2.3510),
      makeArticle('3', 51.5074, -0.1278),
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].endLat).toBeCloseTo(51.5074);
  });

  it('uses article color with 0.6 alpha', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    current.color = '#EF4444';
    const cluster = makeCluster([current, makeArticle('2', 51.5074, -0.1278)]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs[0].color).toBe('rgba(239, 68, 68, 0.6)');
  });
});
