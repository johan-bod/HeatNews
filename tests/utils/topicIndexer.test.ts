import { describe, it, expect } from 'vitest';
import { indexArticleTopics } from '@/utils/topicIndexer';
import type { NewsArticle } from '@/types/news';

const makeArticle = (
  title: string,
  opts: { description?: string; category?: string; sourceId?: string; language?: string } = {}
): NewsArticle => ({
  id: '1',
  title,
  description: opts.description,
  url: 'https://example.com',
  publishedAt: new Date().toISOString(),
  category: opts.category,
  source: { name: opts.sourceId || 'unknown', url: 'https://test.com' },
});

describe('topicIndexer', () => {
  it('detects politics from English keywords', () => {
    const result = indexArticleTopics(
      makeArticle('Parliament votes on new legislation', { language: 'en' }),
      'en'
    );
    expect(result.primary).toBe('politics');
  });

  it('detects sports from French keywords', () => {
    const result = indexArticleTopics(
      makeArticle('Victoire en Ligue 1 pour le PSG', { language: 'fr' }),
      'fr'
    );
    expect(result.primary).toBe('sports');
  });

  it('uses API category as signal', () => {
    const result = indexArticleTopics(
      makeArticle('New development announced', { category: 'technology', language: 'en' }),
      'en'
    );
    expect(result.primary).toBe('technology');
  });

  it('boosts topic from source outlet primaryTopics', () => {
    const result = indexArticleTopics(
      makeArticle('Paris match results', { sourceId: 'lequipe', language: 'fr' }),
      'fr'
    );
    expect(result.primary).toBe('sports');
  });

  it('returns multiple secondary topics', () => {
    const result = indexArticleTopics(
      makeArticle('Election campaign focuses on climate policy and economy', { language: 'en' }),
      'en'
    );
    expect(result.secondary.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to common keywords for unknown language', () => {
    const result = indexArticleTopics(
      makeArticle('NATO summit discusses Ukraine defense', {}),
      'xx'
    );
    expect(result.primary).toBe('defense');
  });

  it('returns empty topics for unclassifiable article', () => {
    const result = indexArticleTopics(
      makeArticle('Abc def ghi jkl', {}),
      'en'
    );
    expect(result.primary).toBeNull();
    expect(result.secondary).toEqual([]);
  });
});
