import { describe, it, expect } from 'vitest';
import { resolveCredibility, resolveCredibilityByDomain, TIER_WEIGHTS, extractDomain } from '@/utils/credibilityService';
import type { NewsArticle } from '@/types/news';

const makeArticle = (sourceUrl: string, articleUrl = 'https://example.com/article'): NewsArticle => ({
  id: '1',
  title: 'Test',
  url: articleUrl,
  publishedAt: new Date().toISOString(),
  source: { name: 'test-source', url: sourceUrl },
});

describe('TIER_WEIGHTS', () => {
  it('has correct weights for all tiers', () => {
    expect(TIER_WEIGHTS.reference).toBe(1.0);
    expect(TIER_WEIGHTS.established).toBe(0.9);
    expect(TIER_WEIGHTS.regional).toBe(0.85);
    expect(TIER_WEIGHTS.hyperlocal).toBe(0.5);
    expect(TIER_WEIGHTS.niche).toBe(0.4);
    expect(TIER_WEIGHTS.unreliable).toBe(0.0);
  });
});

describe('extractDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractDomain('https://www.lemonde.fr/politique')).toBe('lemonde.fr');
  });

  it('returns undefined for empty string', () => {
    expect(extractDomain('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(extractDomain(undefined)).toBeUndefined();
  });

  it('returns undefined for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBeUndefined();
  });
});

describe('resolveCredibilityByDomain', () => {
  it('returns niche for undefined domain', () => {
    const result = resolveCredibilityByDomain(undefined);
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
    expect(result.filtered).toBe(false);
  });

  it('returns niche for unknown domain', () => {
    const result = resolveCredibilityByDomain('unknown-blog-xyz.com');
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
    expect(result.filtered).toBe(false);
  });

  it('resolves known outlet from registry (niche until tiers assigned)', () => {
    // lemonde.fr is in media-outlets.ts but has no credibilityTier yet
    const result = resolveCredibilityByDomain('lemonde.fr');
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('resolves override for wire service', () => {
    // efe.com is in overrides as reference
    const result = resolveCredibilityByDomain('efe.com');
    expect(result.tier).toBe('reference');
    expect(result.weight).toBe(1.0);
  });
});

describe('resolveCredibility', () => {
  it('extracts domain from source.url', () => {
    const article = makeArticle('https://www.lemonde.fr/politique');
    const result = resolveCredibility(article);
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('falls back to article.url when source.url is undefined', () => {
    const article = makeArticle(undefined as unknown as string, 'https://www.lemonde.fr/some-article');
    const result = resolveCredibility(article);
    expect(result).toBeDefined();
    expect(result.filtered).toBe(false);
  });

  it('returns niche when no URL yields a domain', () => {
    const article: NewsArticle = {
      id: '1',
      title: 'Test',
      url: '',
      publishedAt: new Date().toISOString(),
      source: { name: 'test' },
    };
    const result = resolveCredibility(article);
    expect(result.tier).toBe('niche');
    expect(result.weight).toBe(0.4);
  });

  it('weight matches TIER_WEIGHTS for resolved tier', () => {
    const article = makeArticle('https://unknown-site.org/page');
    const result = resolveCredibility(article);
    expect(result.weight).toBe(TIER_WEIGHTS[result.tier]);
  });
});
