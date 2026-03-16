import { describe, it, expect } from 'vitest';
import { matchesRule, computeStaleHours } from '@/services/watchRules';
import type { WatchRule } from '@/types/watchRule';
import type { NewsArticle } from '@/types/news';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<WatchRule> = {}): WatchRule {
  return {
    id: 'r1',
    createdAt: Date.now(),
    label: 'Test rule',
    keywords: [],
    regions: [],
    active: true,
    ...overrides,
  };
}

function makeArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: 'a1',
    title: 'Test article',
    url: 'https://example.com',
    publishedAt: new Date().toISOString(),
    source: { name: 'Test Source', url: 'https://example.com' },
    ...overrides,
  } as NewsArticle;
}

// ── matchesRule ───────────────────────────────────────────────────────────────

describe('matchesRule', () => {
  it('returns false when rule is inactive', () => {
    const rule = makeRule({ keywords: ['ukraine'], active: false });
    expect(matchesRule('Ukraine war update', [], [], rule)).toBe(false);
  });

  it('matches keyword in headline (case-insensitive)', () => {
    const rule = makeRule({ keywords: ['Ukraine'] });
    expect(matchesRule('ukraine war update', [], [], rule)).toBe(true);
  });

  it('matches keyword in topics', () => {
    const rule = makeRule({ keywords: ['conflict'] });
    expect(matchesRule('Local news', ['conflict', 'politics'], [], rule)).toBe(true);
  });

  it('does not match when keyword absent', () => {
    const rule = makeRule({ keywords: ['ukraine'] });
    expect(matchesRule('French elections today', ['politics'], [], rule)).toBe(false);
  });

  it('ANY keyword match is sufficient', () => {
    const rule = makeRule({ keywords: ['ukraine', 'russia'] });
    expect(matchesRule('Russia announces ceasefire', [], [], rule)).toBe(true);
  });

  it('empty keywords list always matches', () => {
    const rule = makeRule({ keywords: [] });
    expect(matchesRule('Anything at all', [], [], rule)).toBe(true);
  });

  it('region matches article country', () => {
    const rule = makeRule({ keywords: ['election'], regions: ['france'] });
    const article = makeArticle({ country: 'France', title: 'French election results' });
    expect(matchesRule('French election results', [], [article], rule)).toBe(true);
  });

  it('region matches article location', () => {
    const rule = makeRule({ keywords: ['protest'], regions: ['paris'] });
    const article = makeArticle({ location: 'Paris, France', title: 'Protest in Paris' });
    expect(matchesRule('Protest in Paris', [], [article], rule)).toBe(true);
  });

  it('fails when region does not match any article', () => {
    const rule = makeRule({ keywords: ['protest'], regions: ['berlin'] });
    const article = makeArticle({ country: 'France', location: 'Paris' });
    expect(matchesRule('Protest update', [], [article], rule)).toBe(false);
  });

  it('requires BOTH keyword and region when both specified', () => {
    const rule = makeRule({ keywords: ['floods'], regions: ['france'] });
    const article = makeArticle({ country: 'Germany' });
    // keyword matches but region does not
    expect(matchesRule('Floods in Germany', ['floods'], [article], rule)).toBe(false);
  });

  it('trims whitespace from keywords and regions', () => {
    const rule = makeRule({ keywords: [' ukraine '], regions: [' france '] });
    const article = makeArticle({ country: 'France' });
    expect(matchesRule('Ukraine latest', [], [article], rule)).toBe(true);
  });

  it('ignores blank keyword entries', () => {
    const rule = makeRule({ keywords: ['', '  ', 'ukraine'] });
    expect(matchesRule('Ukraine war', [], [], rule)).toBe(true);
  });
});

// ── computeStaleHours ─────────────────────────────────────────────────────────

describe('computeStaleHours', () => {
  it('returns null for empty array', () => {
    expect(computeStaleHours([])).toBeNull();
  });

  it('returns null when all dates are invalid', () => {
    const articles = [makeArticle({ publishedAt: 'not-a-date' })];
    expect(computeStaleHours(articles)).toBeNull();
  });

  it('computes hours since most recent article', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const fiveHoursAgo = new Date(Date.now() - 5 * 3_600_000).toISOString();
    const articles = [
      makeArticle({ publishedAt: twoHoursAgo }),
      makeArticle({ publishedAt: fiveHoursAgo }),
    ];
    const hours = computeStaleHours(articles)!;
    expect(hours).toBeGreaterThanOrEqual(1.9);
    expect(hours).toBeLessThan(2.1);
  });

  it('uses the MOST RECENT article (not the oldest)', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const tenHoursAgo = new Date(Date.now() - 10 * 3_600_000).toISOString();
    const articles = [
      makeArticle({ publishedAt: tenHoursAgo }),
      makeArticle({ publishedAt: oneHourAgo }),
    ];
    const hours = computeStaleHours(articles)!;
    // Should be ~1h (from most recent), not ~10h
    expect(hours).toBeLessThan(2);
  });

  it('is above 4 for articles older than 4 hours', () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000).toISOString();
    const articles = [makeArticle({ publishedAt: sixHoursAgo })];
    expect(computeStaleHours(articles)!).toBeGreaterThan(4);
  });
});
