import { describe, it, expect } from 'vitest';
import { clusterArticles, calculateClusterHeat, heatLevelToColor } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';

const makeArticle = (id: string, title: string, source: string, hoursAgo = 1): NewsArticle => ({
  id,
  title,
  description: '',
  url: 'https://example.com',
  publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  source: { name: source, url: `https://${source}.com` },
});

describe('clusterArticles', () => {
  it('groups articles with similar titles into one cluster', () => {
    const articles = [
      makeArticle('1', 'Fire breaks out in downtown Paris building', 'lemonde'),
      makeArticle('2', 'Paris downtown building fire causes evacuation', 'lefigaro'),
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(1);
    expect(clusters[0].articles.length).toBe(2);
  });

  it('keeps dissimilar articles in separate clusters', () => {
    const articles = [
      makeArticle('1', 'Fire breaks out in downtown Paris', 'lemonde'),
      makeArticle('2', 'New tech startup raises funding in Berlin', 'spiegel'),
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(2);
  });
});

describe('calculateClusterHeat', () => {
  it('returns higher heat for more unique sources', () => {
    const heat1 = calculateClusterHeat(1, 1, 1);
    const heat3 = calculateClusterHeat(3, 3, 1);
    expect(heat3).toBeGreaterThan(heat1);
  });

  it('adds recency bonus for articles < 2 hours old', () => {
    const recent = calculateClusterHeat(2, 2, 0.5);
    const old = calculateClusterHeat(2, 2, 8);
    expect(recent).toBeGreaterThan(old);
  });

  it('caps at 100', () => {
    const heat = calculateClusterHeat(10, 20, 0.1);
    expect(heat).toBeLessThanOrEqual(100);
  });
});

describe('heatLevelToColor', () => {
  it('returns grey for cold (0-20)', () => {
    expect(heatLevelToColor(10)).toBe('#94A3B8');
  });
  it('returns amber for warming (21-40)', () => {
    expect(heatLevelToColor(30)).toBe('#F59E0B');
  });
  it('returns deep red for very hot (81-100)', () => {
    expect(heatLevelToColor(95)).toBe('#DC2626');
  });
});
