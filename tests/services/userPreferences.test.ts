// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedPreferences,
  setCachedPreferences,
  clearCachedPreferences,
  PREFERENCES_CACHE_KEY,
} from '@/services/userPreferences';
import type { UserPreferences } from '@/types/preferences';

// Only test the localStorage caching layer — Firestore is tested via integration
describe('userPreferences localStorage cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockPrefs: UserPreferences = {
    topics: ['politics', 'technology'],
    locations: [
      { name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' },
    ],
    onboardingComplete: true,
    updatedAt: Date.now(),
  };

  it('returns null when no cached preferences', () => {
    expect(getCachedPreferences('test-uid')).toBeNull();
  });

  it('stores and retrieves preferences', () => {
    setCachedPreferences('test-uid', mockPrefs);
    const cached = getCachedPreferences('test-uid');
    expect(cached).toEqual(mockPrefs);
  });

  it('returns null for different uid', () => {
    setCachedPreferences('test-uid', mockPrefs);
    expect(getCachedPreferences('other-uid')).toBeNull();
  });

  it('clears cached preferences', () => {
    setCachedPreferences('test-uid', mockPrefs);
    clearCachedPreferences('test-uid');
    expect(getCachedPreferences('test-uid')).toBeNull();
  });

  it('handles corrupted localStorage data', () => {
    localStorage.setItem(`${PREFERENCES_CACHE_KEY}_test-uid`, 'not-json');
    expect(getCachedPreferences('test-uid')).toBeNull();
  });
});
