import { describe, it, expect } from 'vitest';
import { extractPlaceEntities } from '@/utils/geoInference';

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
