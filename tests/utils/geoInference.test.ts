import { describe, it, expect, beforeAll } from 'vitest';
import { extractPlaceEntities, lookupGazetteer, setGazetteerForTesting } from '@/utils/geoInference';
import type { GazetteerEntry } from '@/utils/geoInference';

describe('extractPlaceEntities', () => {
  it('extracts dateline from title with em dash', () => {
    const results = extractPlaceEntities('PARIS — Fire breaks out in metro station');
    expect(results[0]).toMatchObject({
      name: 'PARIS',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with agency attribution', () => {
    const results = extractPlaceEntities('LONDON (Reuters) — Markets rally on trade deal');
    expect(results[0]).toMatchObject({
      name: 'LONDON',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with en dash', () => {
    const results = extractPlaceEntities('BERLIN – New coalition formed');
    expect(results[0]).toMatchObject({
      name: 'BERLIN',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts dateline with comma-date pattern', () => {
    const results = extractPlaceEntities('TOKYO, March 13 — Earthquake hits coast');
    expect(results[0]).toMatchObject({
      name: 'TOKYO',
      source: 'dateline',
      fromTitle: true,
    });
  });

  it('extracts NLP places from title', () => {
    const results = extractPlaceEntities('Protests erupt in Cairo over economic reforms');
    const cairo = results.find(r => r.name.toLowerCase() === 'cairo');
    expect(cairo).toBeDefined();
    expect(cairo!.source).toBe('nlp');
    expect(cairo!.fromTitle).toBe(true);
  });

  it('extracts NLP places from description', () => {
    const results = extractPlaceEntities(
      'Breaking news today',
      'The incident occurred in Madrid near the central station'
    );
    const madrid = results.find(r => r.name.toLowerCase() === 'madrid');
    expect(madrid).toBeDefined();
    expect(madrid!.fromTitle).toBe(false);
  });

  it('deduplicates dateline and NLP matches, keeping dateline', () => {
    const results = extractPlaceEntities('PARIS — Protests in Paris continue');
    const parisEntries = results.filter(r => r.name.toLowerCase() === 'paris');
    expect(parisEntries).toHaveLength(1);
    expect(parisEntries[0].source).toBe('dateline');
  });

  it('returns dateline matches before NLP matches', () => {
    const results = extractPlaceEntities('LONDON — Talks about Berlin trade deal');
    expect(results[0].name).toBe('LONDON');
    expect(results[0].source).toBe('dateline');
  });

  it('returns empty array when no places found', () => {
    const results = extractPlaceEntities('Generic headline with no location');
    expect(Array.isArray(results)).toBe(true);
  });

  it('handles undefined description gracefully', () => {
    const results = extractPlaceEntities('MOSCOW — Summit begins');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('MOSCOW');
  });

  it('extracts multi-word dateline cities', () => {
    const results = extractPlaceEntities('NEW YORK — Wall Street surges');
    expect(results[0]).toMatchObject({
      name: 'NEW YORK',
      source: 'dateline',
    });
  });
});

// Test gazetteer data
const TEST_GAZETTEER = new Map<string, GazetteerEntry[]>([
  ['paris', [
    { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'fr', pop: 2161000 },
    { name: 'Paris', lat: 33.6609, lng: -95.5555, country: 'us', pop: 25171 },
  ]],
  ['lyon', [
    { name: 'Lyon', lat: 45.7640, lng: 4.8357, country: 'fr', pop: 522969 },
  ]],
  ['london', [
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'gb', pop: 8982000 },
    { name: 'London', lat: 42.9834, lng: -81.2497, country: 'ca', pop: 383822 },
  ]],
  ['nice', [
    { name: 'Nice', lat: 43.7102, lng: 7.2620, country: 'fr', pop: 342295 },
  ]],
]);

describe('lookupGazetteer', () => {
  beforeAll(() => {
    setGazetteerForTesting(TEST_GAZETTEER);
  });

  it('returns highest-population entry when no country constraint', () => {
    const result = lookupGazetteer('Paris');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('fr');
    expect(result!.pop).toBe(2161000);
  });

  it('filters by country constraint', () => {
    const result = lookupGazetteer('Paris', 'us');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('us');
    expect(result!.pop).toBe(25171);
  });

  it('returns null when country constraint has no match', () => {
    const result = lookupGazetteer('Lyon', 'us');
    expect(result).toBeNull();
  });

  it('returns null for unknown city', () => {
    const result = lookupGazetteer('Atlantis');
    expect(result).toBeNull();
  });

  it('normalizes input (case-insensitive, trimmed)', () => {
    const result = lookupGazetteer('  LONDON  ');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('gb');
  });

  it('handles diacritics in lookup', () => {
    const result = lookupGazetteer('nice');
    expect(result).not.toBeNull();
    expect(result!.country).toBe('fr');
  });
});
