/**
 * Cache utility for persisting news data in localStorage
 */

export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
  region: string;
  scale: 'local' | 'regional' | 'national' | 'international';
}

export interface CachedNewsData<T> {
  data: T;
  metadata: CacheMetadata;
}

const CACHE_PREFIX = 'news_cache_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save data to cache with metadata
 */
export function setCacheData<T>(
  key: string,
  data: T,
  options: {
    region: string;
    scale: 'local' | 'regional' | 'national' | 'international';
    ttl?: number;
  }
): void {
  const { region, scale, ttl = DEFAULT_TTL } = options;

  const cacheEntry: CachedNewsData<T> = {
    data,
    metadata: {
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      region,
      scale,
    },
  };

  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(cacheEntry)
    );
  } catch (error) {
    console.error('Failed to save to cache:', error);
    // If localStorage is full, clear old entries
    clearExpiredCache();
    // Try again
    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      );
    } catch (retryError) {
      console.error('Failed to save to cache after cleanup:', retryError);
    }
  }
}

/**
 * Get data from cache if not expired
 */
export function getCacheData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);

    if (!cached) return null;

    const entry: CachedNewsData<T> = JSON.parse(cached);

    // Check if expired
    if (Date.now() > entry.metadata.expiresAt) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to get from cache:', error);
    return null;
  }
}

/**
 * Get cache metadata
 */
export function getCacheMetadata(key: string): CacheMetadata | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);

    if (!cached) return null;

    const entry: CachedNewsData<any> = JSON.parse(cached);

    return entry.metadata;
  } catch (error) {
    console.error('Failed to get cache metadata:', error);
    return null;
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  const keysToRemove: string[] = [];

  // Find all cache keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key?.startsWith(CACHE_PREFIX)) continue;

    try {
      const cached = localStorage.getItem(key);
      if (!cached) continue;

      const entry: CachedNewsData<any> = JSON.parse(cached);

      if (now > entry.metadata.expiresAt) {
        keysToRemove.push(key);
      }
    } catch (error) {
      // Invalid cache entry, mark for removal
      keysToRemove.push(key);
    }
  }

  // Remove expired entries
  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log(`Cleared ${keysToRemove.length} expired cache entries`);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log(`Cleared ${keysToRemove.length} cache entries`);
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(key: string): number | null {
  const metadata = getCacheMetadata(key);

  if (!metadata) return null;

  return Date.now() - metadata.timestamp;
}

/**
 * Check if cache is valid (exists and not expired)
 */
export function isCacheValid(key: string): boolean {
  return getCacheData(key) !== null;
}
