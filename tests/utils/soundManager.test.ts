// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { isSoundEnabled, setSoundEnabled, SOUND_STORAGE_KEY } from '@/utils/soundManager';

describe('soundManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isSoundEnabled', () => {
    it('defaults to false', () => {
      expect(isSoundEnabled()).toBe(false);
    });

    it('returns true when localStorage is set to true', () => {
      localStorage.setItem(SOUND_STORAGE_KEY, 'true');
      expect(isSoundEnabled()).toBe(true);
    });

    it('returns false when localStorage is set to false', () => {
      localStorage.setItem(SOUND_STORAGE_KEY, 'false');
      expect(isSoundEnabled()).toBe(false);
    });
  });

  describe('setSoundEnabled', () => {
    it('persists true to localStorage', () => {
      setSoundEnabled(true);
      expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('true');
    });

    it('persists false to localStorage', () => {
      setSoundEnabled(true);
      setSoundEnabled(false);
      expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('false');
    });
  });
});
