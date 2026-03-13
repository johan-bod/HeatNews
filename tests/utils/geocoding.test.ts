import { describe, it, expect } from 'vitest';
import { extractLocation, getCoordinates, geocodeArticle } from '@/utils/geocoding';
import type { NewsArticle } from '@/types/news';

const makeArticle = (title: string, opts: { description?: string; source?: string } = {}): NewsArticle => ({
  id: '1',
  title,
  description: opts.description,
  url: 'https://example.com',
  publishedAt: new Date().toISOString(),
  source: { name: opts.source || 'test', url: 'https://test.com' },
});

describe('geocoding', () => {
  it('extracts Paris from article title', () => {
    const loc = extractLocation(makeArticle('Fire in Paris metro'));
    expect(loc).toBe('paris');
  });

  it('prefers longer location names over shorter ones', () => {
    const loc = extractLocation(makeArticle('News from Saint-Étienne today'));
    expect(loc).toBe('saint-étienne');
  });

  it('returns coordinates for known location', () => {
    const coords = getCoordinates('paris');
    expect(coords).toEqual({ lat: 48.8566, lng: 2.3522 });
  });

  it('returns null for unknown location', () => {
    const coords = getCoordinates('atlantis');
    expect(coords).toBeNull();
  });

  it('geocodeArticle adds location and coordinates', () => {
    const article = makeArticle('Protest in Lyon streets');
    const result = geocodeArticle(article);
    expect(result.location).toBe('Lyon');
    expect(result.coordinates).toBeDefined();
    expect(result.coordinates!.lat).toBeCloseTo(45.764, 1);
  });

  it('falls back to media outlet reach when no location in text', () => {
    const article = makeArticle('Generic news headline with no city', { source: 'ouest-france' });
    const loc = extractLocation(article);
    expect(loc).toBe('rennes');
  });

  it('geocodeArticle sets locationConfidence to exact when coordinates found', () => {
    const article = makeArticle('Protest in Lyon streets');
    const result = geocodeArticle(article);
    expect(result.locationConfidence).toBe('exact');
  });

  it('geocodeArticle does not set locationConfidence when no location found', () => {
    const article = makeArticle('Generic news with no city name');
    const result = geocodeArticle(article);
    expect(result.locationConfidence).toBeUndefined();
  });
});
