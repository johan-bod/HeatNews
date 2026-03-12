// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setCacheData,
  getCacheData,
  getCacheMetadata,
  clearExpiredCache,
  clearAllCache,
  getCacheAge,
  isCacheValid,
  type CacheMetadata,
  type CachedNewsData,
} from '@/utils/cache';

const CACHE_PREFIX = 'news_cache_';

const defaultOpts = {
  region: 'France',
  scale: 'local' as const,
};

describe('cache utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // setCacheData / getCacheData — basic round-trip
  // ---------------------------------------------------------------------------

  describe('setCacheData and getCacheData', () => {
    it('stores and retrieves a plain object', () => {
      const data = { title: 'Breaking news', id: 42 };
      setCacheData('test_key', data, defaultOpts);
      const result = getCacheData<typeof data>('test_key');
      expect(result).toEqual(data);
    });

    it('stores and retrieves an array', () => {
      const data = [1, 2, 3];
      setCacheData('array_key', data, defaultOpts);
      expect(getCacheData('array_key')).toEqual([1, 2, 3]);
    });

    it('stores and retrieves a primitive string', () => {
      setCacheData('str_key', 'hello', defaultOpts);
      expect(getCacheData('str_key')).toBe('hello');
    });

    it('stores and retrieves a number', () => {
      setCacheData('num_key', 12345, defaultOpts);
      expect(getCacheData<number>('num_key')).toBe(12345);
    });

    it('uses the news_cache_ prefix in localStorage', () => {
      setCacheData('prefixed', 'value', defaultOpts);
      expect(localStorage.getItem(`${CACHE_PREFIX}prefixed`)).not.toBeNull();
      expect(localStorage.getItem('prefixed')).toBeNull();
    });

    it('returns null for a key that was never set', () => {
      expect(getCacheData('nonexistent')).toBeNull();
    });

    it('overwrites existing data for the same key', () => {
      setCacheData('dup_key', 'first', defaultOpts);
      setCacheData('dup_key', 'second', defaultOpts);
      expect(getCacheData('dup_key')).toBe('second');
    });
  });

  // ---------------------------------------------------------------------------
  // TTL / expiry
  // ---------------------------------------------------------------------------

  describe('TTL expiration', () => {
    it('returns data when TTL has not elapsed', () => {
      setCacheData('fresh_key', 'still fresh', { ...defaultOpts, ttl: 60_000 });
      expect(getCacheData('fresh_key')).toBe('still fresh');
    });

    it('returns null after TTL has elapsed', () => {
      // Store with a very short TTL, then fake time past expiry
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('expired_key', 'old data', { ...defaultOpts, ttl: 1000 });

      // Advance time by 2 seconds
      vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
      expect(getCacheData('expired_key')).toBeNull();
    });

    it('removes the localStorage entry when expired data is read', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('stale_key', 'stale', { ...defaultOpts, ttl: 500 });

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000);
      getCacheData('stale_key'); // triggers removal

      expect(localStorage.getItem(`${CACHE_PREFIX}stale_key`)).toBeNull();
    });

    it('uses 24-hour default TTL when ttl option is omitted', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('default_ttl', 'data', defaultOpts); // no ttl

      // 23 hours later — still valid
      vi.spyOn(Date, 'now').mockReturnValue(now + 23 * 60 * 60 * 1000);
      expect(getCacheData('default_ttl')).toBe('data');

      // 25 hours later — expired
      vi.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000);
      expect(getCacheData('default_ttl')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getCacheMetadata
  // ---------------------------------------------------------------------------

  describe('getCacheMetadata', () => {
    it('returns metadata with correct region and scale', () => {
      setCacheData('meta_key', 'payload', { region: 'Paris', scale: 'regional' });
      const meta = getCacheMetadata('meta_key');
      expect(meta).not.toBeNull();
      expect(meta!.region).toBe('Paris');
      expect(meta!.scale).toBe('regional');
    });

    it('returns metadata with a timestamp close to now', () => {
      const before = Date.now();
      setCacheData('ts_key', 'x', defaultOpts);
      const after = Date.now();
      const meta = getCacheMetadata('ts_key');
      expect(meta!.timestamp).toBeGreaterThanOrEqual(before);
      expect(meta!.timestamp).toBeLessThanOrEqual(after);
    });

    it('returns metadata with expiresAt = timestamp + ttl', () => {
      const ttl = 30_000;
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('expires_key', 'y', { ...defaultOpts, ttl });
      const meta = getCacheMetadata('expires_key');
      expect(meta!.expiresAt).toBe(now + ttl);
    });

    it('returns null when key does not exist', () => {
      expect(getCacheMetadata('ghost_key')).toBeNull();
    });

    it('returns metadata even for expired entries (no expiry check)', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('old_meta', 'z', { ...defaultOpts, ttl: 100 });

      vi.spyOn(Date, 'now').mockReturnValue(now + 5000);
      // getCacheMetadata does NOT check expiry
      expect(getCacheMetadata('old_meta')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getCacheAge
  // ---------------------------------------------------------------------------

  describe('getCacheAge', () => {
    it('returns approximate age in milliseconds', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('age_key', 'data', defaultOpts);

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000);
      const age = getCacheAge('age_key');
      expect(age).toBe(3000);
    });

    it('returns null when key does not exist', () => {
      expect(getCacheAge('no_such_key')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isCacheValid
  // ---------------------------------------------------------------------------

  describe('isCacheValid', () => {
    it('returns true for a fresh cache entry', () => {
      setCacheData('valid_key', 'ok', defaultOpts);
      expect(isCacheValid('valid_key')).toBe(true);
    });

    it('returns false for a missing key', () => {
      expect(isCacheValid('missing_key')).toBe(false);
    });

    it('returns false for an expired entry', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('expire_valid', 'soon gone', { ...defaultOpts, ttl: 500 });

      vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
      expect(isCacheValid('expire_valid')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // clearExpiredCache
  // ---------------------------------------------------------------------------

  describe('clearExpiredCache', () => {
    it('removes only expired entries', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      setCacheData('fresh', 'keep me', { ...defaultOpts, ttl: 60_000 });
      setCacheData('stale', 'remove me', { ...defaultOpts, ttl: 100 });

      vi.spyOn(Date, 'now').mockReturnValue(now + 500);
      clearExpiredCache();

      expect(localStorage.getItem(`${CACHE_PREFIX}fresh`)).not.toBeNull();
      expect(localStorage.getItem(`${CACHE_PREFIX}stale`)).toBeNull();
    });

    it('does not touch non-cache localStorage keys', () => {
      localStorage.setItem('my_app_setting', 'dark_mode');
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      setCacheData('exp_entry', 'bye', { ...defaultOpts, ttl: 100 });
      vi.spyOn(Date, 'now').mockReturnValue(now + 500);
      clearExpiredCache();

      expect(localStorage.getItem('my_app_setting')).toBe('dark_mode');
    });

    it('removes entries with corrupted JSON', () => {
      localStorage.setItem(`${CACHE_PREFIX}corrupt`, 'not-valid-json{{{');
      clearExpiredCache();
      expect(localStorage.getItem(`${CACHE_PREFIX}corrupt`)).toBeNull();
    });

    it('leaves empty localStorage untouched (no errors)', () => {
      expect(() => clearExpiredCache()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // clearAllCache
  // ---------------------------------------------------------------------------

  describe('clearAllCache', () => {
    it('removes all cache entries', () => {
      setCacheData('a', 1, defaultOpts);
      setCacheData('b', 2, defaultOpts);
      setCacheData('c', 3, defaultOpts);
      clearAllCache();
      expect(getCacheData('a')).toBeNull();
      expect(getCacheData('b')).toBeNull();
      expect(getCacheData('c')).toBeNull();
    });

    it('preserves non-cache localStorage keys', () => {
      localStorage.setItem('user_theme', 'light');
      setCacheData('news', [], defaultOpts);
      clearAllCache();
      expect(localStorage.getItem('user_theme')).toBe('light');
    });

    it('does not throw on empty localStorage', () => {
      expect(() => clearAllCache()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // localStorage error handling
  // ---------------------------------------------------------------------------

  describe('localStorage error handling', () => {
    it('getCacheData returns null when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(getCacheData('any_key')).toBeNull();
    });

    it('getCacheData returns null for malformed JSON in storage', () => {
      localStorage.setItem(`${CACHE_PREFIX}bad_json`, '{{invalid}}');
      expect(getCacheData('bad_json')).toBeNull();
    });

    it('getCacheMetadata returns null when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(getCacheMetadata('any_key')).toBeNull();
    });

    it('setCacheData attempts clearExpiredCache then retries when setItem throws once', () => {
      let callCount = 0;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new DOMException('QuotaExceededError');
        // second call succeeds (default mock behaviour is to do nothing)
      });
      // Should not throw
      expect(() => setCacheData('quota_key', 'data', defaultOpts)).not.toThrow();
    });

    it('setCacheData silently fails when both setItem attempts throw', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() => setCacheData('fail_key', 'data', defaultOpts)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Scale variants
  // ---------------------------------------------------------------------------

  describe('scale variants stored correctly', () => {
    const scales = ['local', 'regional', 'national', 'international'] as const;

    scales.forEach((scale) => {
      it(`stores scale "${scale}" and reads it back from metadata`, () => {
        setCacheData(`scale_${scale}`, 'payload', { region: 'Test', scale });
        const meta = getCacheMetadata(`scale_${scale}`);
        expect(meta!.scale).toBe(scale);
      });
    });
  });
});
