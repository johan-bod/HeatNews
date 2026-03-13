// tests/pages/investigatePage.test.ts
import { describe, it, expect } from 'vitest';
import { groupByTier } from '@/pages/InvestigatePage';
import type { ClusterArticleItem } from '@/components/globe/credibilityHelpers';
import type { NewsArticle } from '@/types/news';

function makeItem(id: string, tier: string): ClusterArticleItem {
  return {
    article: {
      id,
      title: `Article ${id}`,
      url: `https://example.com/${id}`,
      publishedAt: new Date().toISOString(),
      source: { name: `Source ${id}`, url: `https://source${id}.com` },
    } as NewsArticle,
    tier: tier as any,
    tierLabel: tier,
    tierColor: `text-${tier}`,
  };
}

describe('groupByTier', () => {
  it('groups consecutive items by tier', () => {
    const items = [
      makeItem('1', 'reference'),
      makeItem('2', 'reference'),
      makeItem('3', 'established'),
      makeItem('4', 'niche'),
    ];
    const groups = groupByTier(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].tier).toBe('reference');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].tier).toBe('established');
    expect(groups[1].items).toHaveLength(1);
    expect(groups[2].tier).toBe('niche');
    expect(groups[2].items).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupByTier([])).toEqual([]);
  });

  it('returns single group when all same tier', () => {
    const items = [
      makeItem('1', 'regional'),
      makeItem('2', 'regional'),
    ];
    const groups = groupByTier(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });
});
