import { describe, it, expect } from 'vitest';
import { clusterArticles, calculateClusterHeat, heatLevelToColor, deduplicateArticleCount } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';

const makeArticle = (id: string, title: string, source: string, hoursAgo = 1, sourceUrl?: string): NewsArticle => ({
  id,
  title,
  description: '',
  url: 'https://example.com',
  publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  source: { name: source, url: sourceUrl ?? `https://${source}.com` },
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

describe('calculateClusterHeat with credibility', () => {
  it('uses weighted sources instead of raw count', () => {
    // newestArticleHoursAgo=4 → recencyBonus=5 (between 2 and 6 hours)
    const refHeat = calculateClusterHeat(3.0, 3, 4, 0);
    const nicheHeat = calculateClusterHeat(1.2, 3, 4, 0);
    expect(refHeat).toBeGreaterThan(nicheHeat);
    // refHeat = min(100, 60 + 15 + 5) = 80
    expect(refHeat).toBe(80);
    // nicheHeat = min(100, 24 + 15 + 5) = 44
    expect(nicheHeat).toBe(44);
  });

  it('adds convergence bonus when 3+ hyperlocal sources', () => {
    // newestArticleHoursAgo=4 → recencyBonus=5
    const withConvergence = calculateClusterHeat(2.0, 4, 4, 4);
    const withoutConvergence = calculateClusterHeat(2.0, 4, 4, 2);
    // withConvergence: min(100, 40 + 20 + 5 + 12) = 77
    expect(withConvergence).toBe(77);
    // withoutConvergence: min(100, 40 + 20 + 5 + 0) = 65
    expect(withoutConvergence).toBe(65);
  });

  it('convergence bonus does not exceed cap', () => {
    const heat = calculateClusterHeat(4.0, 10, 0.5, 10);
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

// ── Source deduplication ──────────────────────────────────────────────────────

describe('deduplicateArticleCount', () => {
  it('counts a single article as 1', () => {
    const articles = [makeArticle('1', 'Paris floods after heavy rain', 'lemonde', 1, 'https://lemonde.fr')];
    expect(deduplicateArticleCount(articles)).toBe(1);
  });

  it('counts two articles from different orgs as 2', () => {
    const articles = [
      makeArticle('1', 'Paris floods after heavy rain', 'lemonde', 1, 'https://lemonde.fr'),
      makeArticle('2', 'Paris flooding latest updates', 'lefigaro', 1, 'https://lefigaro.fr'),
    ];
    expect(deduplicateArticleCount(articles)).toBe(2);
  });

  it('counts same story published on web and Telegram as 1', () => {
    const articles = [
      makeArticle('1', 'Russia announces ceasefire in Ukraine', 'TASS', 1, 'https://tass.ru'),
      makeArticle('2', 'Russia announces ceasefire in Ukraine', 'TASS Agency', 1, 'https://t.me/tass_agency'),
    ];
    // Same org (tass), same story → should be 1, not 2
    expect(deduplicateArticleCount(articles)).toBe(1);
  });

  it('counts different stories from same org separately', () => {
    const articles = [
      makeArticle('1', 'Russia announces ceasefire in Ukraine', 'TASS', 1, 'https://tass.ru'),
      makeArticle('2', 'Ukrainian forces advance near Kharkiv', 'TASS', 1, 'https://tass.ru'),
    ];
    // Same org, different stories → should be 2
    expect(deduplicateArticleCount(articles)).toBe(2);
  });

  it('does not conflate different orgs with similar names', () => {
    const articles = [
      makeArticle('1', 'Election results announced', 'BBC News', 1, 'https://bbc.co.uk'),
      makeArticle('2', 'Election results announced', 'CBC News', 1, 'https://cbc.ca'),
    ];
    // BBC ≠ CBC → 2 distinct orgs even though titles are identical
    expect(deduplicateArticleCount(articles)).toBe(2);
  });
});

describe('clusterArticles — source deduplication in heat', () => {
  it('same org on web+Telegram scores lower than two independent orgs', () => {
    // Scenario: TASS publishes on tass.ru AND t.me/tass_agency (same story)
    const disseminated = [
      makeArticle('1', 'Kremlin announces new sanctions response', 'TASS', 1, 'https://tass.ru'),
      makeArticle('2', 'Kremlin announces new sanctions response', 'TASS Agency', 1, 'https://t.me/tass_agency'),
    ];
    // Scenario: Reuters AND AFP both independently cover the same story
    const independent = [
      makeArticle('3', 'Kremlin announces new sanctions response', 'Reuters', 1, 'https://reuters.com'),
      makeArticle('4', 'Kremlin new response to sanctions announced', 'AFP', 1, 'https://afp.com'),
    ];

    const disseminatedCluster = clusterArticles(disseminated)[0];
    const independentCluster  = clusterArticles(independent)[0];

    // Independent coverage from two orgs should score higher than
    // one org amplifying itself via two channels
    expect(independentCluster.heatLevel).toBeGreaterThan(disseminatedCluster.heatLevel);
  });

  it('multiple channels from same org do not inflate heat beyond single channel', () => {
    const singleChannel = [
      makeArticle('1', 'Flood warning issued for southern France', 'lemonde', 1, 'https://lemonde.fr'),
    ];
    const multiChannel = [
      makeArticle('2', 'Flood warning issued for southern France', 'lemonde', 1, 'https://lemonde.fr'),
      makeArticle('3', 'Flood warning issued for southern France', 'Le Monde', 1, 'https://t.me/lemonde_channel'),
    ];

    const single = clusterArticles(singleChannel)[0];
    const multi  = clusterArticles(multiChannel)[0];

    // Adding a second channel for the same story should NOT increase heat
    expect(multi.heatLevel).toBe(single.heatLevel);
  });
});

describe('clusterArticles with credibility weighting', () => {
  it('cluster with reference sources gets higher heat than niche sources', () => {
    const refArticles = [
      makeArticle('1', 'Global summit on climate change begins today', 'reuters', 1, 'https://reuters.com'),
      makeArticle('2', 'Climate change summit begins with key agreements', 'apnews', 1, 'https://apnews.com'),
      makeArticle('3', 'Today climate change global summit kicks off', 'afp', 1, 'https://afp.com'),
    ];
    const nicheArticles = [
      makeArticle('4', 'Global summit on climate change begins today', 'blog1', 1, 'https://random-blog-1.com'),
      makeArticle('5', 'Climate change summit begins with key agreements', 'blog2', 1, 'https://random-blog-2.com'),
      makeArticle('6', 'Today climate change global summit kicks off', 'blog3', 1, 'https://random-blog-3.com'),
    ];

    const refClusters = clusterArticles(refArticles);
    const nicheClusters = clusterArticles(nicheArticles);

    expect(refClusters[0].heatLevel).toBeGreaterThan(nicheClusters[0].heatLevel);
  });

  it('hyperlocal convergence boosts heat when 3+ sources', () => {
    // newestArticleHoursAgo=4 → recencyBonus=5
    const heat3hyperlocal = calculateClusterHeat(1.5, 3, 4, 3); // 3 hyperlocal = 9 bonus
    const heat2hyperlocal = calculateClusterHeat(1.0, 2, 4, 2); // 2 hyperlocal = 0 bonus
    // heat3: min(100, 30 + 15 + 5 + 9) = 59
    // heat2: min(100, 20 + 10 + 5 + 0) = 35
    expect(heat3hyperlocal).toBe(59);
    expect(heat2hyperlocal).toBe(35);
  });
});
