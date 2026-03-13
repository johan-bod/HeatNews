// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTierLabel, getTierColor, getBreakdownLabel, buildSourceBreakdown, getClusterArticles, getAllClusterArticles } from '@/components/globe/credibilityHelpers';
import type { NewsArticle } from '@/types/news';

describe('credibilityHelpers', () => {
  describe('getTierLabel', () => {
    it('returns correct label for each tier', () => {
      expect(getTierLabel('reference')).toBe('Reference');
      expect(getTierLabel('established')).toBe('Established');
      expect(getTierLabel('regional')).toBe('Regional');
      expect(getTierLabel('hyperlocal')).toBe('Hyperlocal');
      expect(getTierLabel('niche')).toBe('Niche');
    });
  });

  describe('getTierColor', () => {
    it('returns correct Tailwind class for each tier', () => {
      expect(getTierColor('reference')).toBe('text-blue-400');
      expect(getTierColor('established')).toBe('text-emerald-400');
      expect(getTierColor('regional')).toBe('text-teal-400');
      expect(getTierColor('hyperlocal')).toBe('text-amber-400');
      expect(getTierColor('niche')).toBe('text-slate-400');
    });
  });

  describe('getBreakdownLabel', () => {
    it('returns singular breakdown labels', () => {
      expect(getBreakdownLabel('reference', 1)).toBe('wire service');
      expect(getBreakdownLabel('established', 1)).toBe('national');
      expect(getBreakdownLabel('regional', 1)).toBe('regional');
      expect(getBreakdownLabel('hyperlocal', 1)).toBe('local');
      expect(getBreakdownLabel('niche', 1)).toBe('independent');
    });

    it('returns plural for wire services', () => {
      expect(getBreakdownLabel('reference', 2)).toBe('wire services');
    });
  });
});

describe('getClusterArticles', () => {
  const makeArticle = (id: string, name: string, url: string): NewsArticle => ({
    id,
    title: `Article by ${name}`,
    url: `https://${url}/article`,
    source: { name, url: `https://${url}` },
    publishedAt: new Date().toISOString(),
  } as NewsArticle);

  it('excludes the current article', () => {
    const articles = [
      makeArticle('1', 'AFP', 'afp.com'),
      makeArticle('2', 'Reuters', 'reuters.com'),
      makeArticle('3', 'Le Monde', 'lemonde.fr'),
    ];
    const result = getClusterArticles(articles, '1');
    expect(result.map(a => a.article.id)).toEqual(['2', '3']);
  });

  it('limits to 5 items', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(String(i), `Source ${i}`, `source${i}.com`)
    );
    const result = getClusterArticles(articles, '0');
    expect(result.length).toBe(5);
  });

  it('sorts by tier weight descending (reference before niche)', () => {
    const articles = [
      makeArticle('1', 'Current', 'current.com'),
      makeArticle('2', 'Unknown Blog', 'randomblog.xyz'),  // niche (fallback)
      makeArticle('3', 'Reuters', 'reuters.com'),           // reference
    ];
    const result = getClusterArticles(articles, '1');
    expect(result[0].article.id).toBe('3');
    expect(result[1].article.id).toBe('2');
  });
});

describe('getAllClusterArticles', () => {
  const makeArticle = (id: string, name: string, url: string): NewsArticle => ({
    id,
    title: `Article by ${name}`,
    url: `https://${url}/article`,
    source: { name, url: `https://${url}` },
    publishedAt: new Date().toISOString(),
  } as NewsArticle);

  it('includes all articles (no exclusion)', () => {
    const articles = [
      makeArticle('1', 'AFP', 'afp.com'),
      makeArticle('2', 'Reuters', 'reuters.com'),
      makeArticle('3', 'Le Monde', 'lemonde.fr'),
    ];
    const result = getAllClusterArticles(articles);
    expect(result).toHaveLength(3);
  });

  it('has no cap (returns more than 5)', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(String(i), `Source ${i}`, `source${i}.com`)
    );
    const result = getAllClusterArticles(articles);
    expect(result).toHaveLength(8);
  });

  it('sorts by tier weight descending', () => {
    const articles = [
      makeArticle('1', 'Unknown Blog', 'randomblog.xyz'),  // niche
      makeArticle('2', 'Reuters', 'reuters.com'),           // reference
      makeArticle('3', 'Le Monde', 'lemonde.fr'),           // established
    ];
    const result = getAllClusterArticles(articles);
    expect(result[0].article.id).toBe('2');  // Reuters (reference) first
    expect(result[0].tier).toBe('reference');
  });

  it('returns ClusterArticleItem with correct tier info', () => {
    const articles = [makeArticle('1', 'Reuters', 'reuters.com')];
    const result = getAllClusterArticles(articles);
    expect(result[0].tier).toBe('reference');
    expect(result[0].tierLabel).toBe('Reference');
    expect(result[0].tierColor).toBe('text-blue-400');
  });
});

describe('buildSourceBreakdown', () => {
  it('counts sources by tier', () => {
    const sourceDomains = new Map<string, string | undefined>([
      ['AFP', 'afp.com'],
      ['Reuters', 'reuters.com'],
      ['Le Monde', 'lemonde.fr'],
      ['Ouest-France', 'ouest-france.fr'],
    ]);
    const result = buildSourceBreakdown(sourceDomains);
    expect(result.total).toBe(4);
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('returns empty for single source', () => {
    const sourceDomains = new Map<string, string | undefined>([
      ['AFP', 'afp.com'],
    ]);
    const result = buildSourceBreakdown(sourceDomains);
    expect(result.total).toBe(1);
    expect(result.summary).toBe('');
  });
});
