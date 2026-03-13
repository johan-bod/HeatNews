// tests/utils/coverageGap.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(id: string, sourceUrl: string): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://${sourceUrl}/article-${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://${sourceUrl}` },
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

describe('analyzeCoverageGap', () => {
  it('returns no gap when both reference and established are present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),      // reference
      makeArticle('2', 'lemonde.fr'),        // established
      makeArticle('3', 'randomblog.xyz'),    // niche
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(false);
    expect(result.missingTiers).toEqual([]);
    expect(result.gapLabel).toBe('');
    expect(result.imbalanceNote).toBeNull();
  });

  it('flags both reference and established missing', () => {
    const cluster = makeCluster([
      makeArticle('1', 'randomblog.xyz'),
      makeArticle('2', 'anotherblog.com'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toContain('reference');
    expect(result.missingTiers).toContain('established');
    expect(result.gapLabel).toBe('No wire service or national coverage');
  });

  it('flags only reference missing when established is present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'lemonde.fr'),        // established
      makeArticle('2', 'randomblog.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toEqual(['reference']);
    expect(result.gapLabel).toBe('No wire service coverage');
  });

  it('flags only established missing when reference is present', () => {
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),       // reference
      makeArticle('2', 'randomblog.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.missingTiers).toEqual(['established']);
    expect(result.gapLabel).toBe('No national outlet coverage');
  });

  it('detects imbalance when top tiers < 20% and bottom tiers > 60%', () => {
    // 1 reference + 9 niche = 10% top tier, 90% bottom tier
    const articles = [
      makeArticle('0', 'reuters.com'),  // reference
      ...Array.from({ length: 9 }, (_, i) =>
        makeArticle(String(i + 1), `blog${i}.xyz`)  // niche
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    expect(result.hasGap).toBe(true);
    expect(result.imbalanceNote).toBe('Coverage is predominantly from independent/local sources');
  });

  it('does not flag imbalance when top tiers >= 20%', () => {
    // 2 reference + 3 niche = 40% top tier
    const cluster = makeCluster([
      makeArticle('1', 'reuters.com'),
      makeArticle('2', 'afp.com'),
      makeArticle('3', 'blog1.xyz'),
      makeArticle('4', 'blog2.xyz'),
      makeArticle('5', 'blog3.xyz'),
    ]);
    const result = analyzeCoverageGap(cluster);
    expect(result.imbalanceNote).toBeNull();
  });

  it('flags imbalance independently of missing tiers', () => {
    // Both reference and established present, but heavily outnumbered
    // 1 reference + 1 established + 8 niche = 20% top, 80% bottom
    // Top tiers = 2/10 = 20%, NOT less than 20%, so imbalance should NOT fire
    const articles = [
      makeArticle('0', 'reuters.com'),
      makeArticle('1', 'lemonde.fr'),
      ...Array.from({ length: 8 }, (_, i) =>
        makeArticle(String(i + 2), `blog${i}.xyz`)
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    // 20% is NOT less than 20%, so imbalance should not fire
    expect(result.missingTiers).toEqual([]);
    expect(result.imbalanceNote).toBeNull();
  });

  it('returns hasGap true when only imbalance fires (no missing tiers)', () => {
    // 1 reference + 1 established + 18 niche = 10% top, 90% bottom
    const articles = [
      makeArticle('0', 'reuters.com'),
      makeArticle('1', 'lemonde.fr'),
      ...Array.from({ length: 18 }, (_, i) =>
        makeArticle(String(i + 2), `blog${i}.xyz`)
      ),
    ];
    const cluster = makeCluster(articles);
    const result = analyzeCoverageGap(cluster);
    expect(result.missingTiers).toEqual([]);
    expect(result.hasGap).toBe(true);
    expect(result.imbalanceNote).toBe('Coverage is predominantly from independent/local sources');
  });
});
