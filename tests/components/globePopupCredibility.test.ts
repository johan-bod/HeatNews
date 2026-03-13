// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getTierLabel, getTierColor, getBreakdownLabel, buildSourceBreakdown } from '@/components/globe/credibilityHelpers';

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
