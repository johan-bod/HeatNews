import type { NewsArticle } from '@/types/news';
import { fetchNewsDataArticles, convertNewsDataArticle } from './newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import { setCacheData, getCacheData, getCacheMetadata } from '@/utils/cache';

/**
 * Pre-configured news queries for landing page
 */
export interface CachedNewsConfig {
  argentinaLocal: NewsArticle[]; // Hyperlocal news for Mendoza, Argentina
  asiaNational: NewsArticle[]; // National news from Asian countries
  international: NewsArticle[]; // International news
  lastUpdated: number;
}

const CACHE_KEY_ARGENTINA = 'argentina_local_news';
const CACHE_KEY_ASIA = 'asia_national_news';
const CACHE_KEY_INTERNATIONAL = 'international_news';
const CACHE_KEY_LAST_REFRESH = 'last_background_refresh';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const BACKGROUND_REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Fetch Argentina local news (Mendoza region)
 */
async function fetchArgentinaLocalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'ar', // Argentina
      language: 'es', // Spanish
      size: 10,
      // Search for Mendoza and other major Argentine cities
      query: 'Mendoza OR Córdoba OR Rosario OR "Buenos Aires"',
    });

    let articles = response.results.map(convertNewsDataArticle);

    // Geocode articles
    articles = geocodeArticles(articles);

    // Mark as local scale
    articles = articles.map(a => ({ ...a, scale: 'local' as const }));

    // Analyze heat for local scale
    const clusters = analyzeArticleHeat(articles, 'local');

    // Apply colors to articles
    articles = articles.map(article => ({
      ...article,
      color: getArticleColor(article, clusters),
      heatLevel: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.heatLevel || 0,
      coverage: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.coverage || 1,
    }));

    return articles;
  } catch (error) {
    console.error('Failed to fetch Argentina local news:', error);
    return [];
  }
}

/**
 * Fetch Asia national news
 */
async function fetchAsiaNationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['in', 'jp', 'cn', 'kr', 'sg', 'th', 'id', 'my'], // Asian countries
      language: 'en',
      size: 10,
      category: ['top', 'politics', 'business'],
    });

    let articles = response.results.map(convertNewsDataArticle);

    // Geocode articles
    articles = geocodeArticles(articles);

    // Mark as national scale
    articles = articles.map(a => ({ ...a, scale: 'national' as const }));

    // Analyze heat for national scale
    const clusters = analyzeArticleHeat(articles, 'national');

    // Apply colors to articles
    articles = articles.map(article => ({
      ...article,
      color: getArticleColor(article, clusters),
      heatLevel: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.heatLevel || 0,
      coverage: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.coverage || 1,
    }));

    return articles;
  } catch (error) {
    console.error('Failed to fetch Asia national news:', error);
    return [];
  }
}

/**
 * Fetch international news
 */
async function fetchInternationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['us', 'gb', 'de', 'fr', 'es', 'it', 'br', 'ca', 'au', 'za'],
      language: 'en',
      size: 10,
      category: ['top', 'world'],
    });

    let articles = response.results.map(convertNewsDataArticle);

    // Geocode articles
    articles = geocodeArticles(articles);

    // Mark as international scale
    articles = articles.map(a => ({ ...a, scale: 'international' as const }));

    // Analyze heat for international scale
    const clusters = analyzeArticleHeat(articles, 'international');

    // Apply colors to articles
    articles = articles.map(article => ({
      ...article,
      color: getArticleColor(article, clusters),
      heatLevel: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.heatLevel || 0,
      coverage: clusters.find(c =>
        c.articles.some(a => a.id === article.id)
      )?.coverage || 1,
    }));

    return articles;
  } catch (error) {
    console.error('Failed to fetch international news:', error);
    return [];
  }
}

/**
 * Check if cache needs background refresh (4-hour threshold)
 */
function shouldRefreshCache(): boolean {
  const lastRefresh = getCacheData<number>(CACHE_KEY_LAST_REFRESH);

  if (!lastRefresh) return true;

  const timeSinceRefresh = Date.now() - lastRefresh;
  return timeSinceRefresh >= CACHE_TTL;
}

/**
 * Get cached news or fetch fresh if cache is invalid
 * This function is smart: it returns cached data immediately,
 * but triggers background refresh if needed
 */
export async function getCachedNews(
  forceRefresh: boolean = false
): Promise<CachedNewsConfig> {
  // Try to get from cache first
  if (!forceRefresh) {
    const cachedArgentina = getCacheData<NewsArticle[]>(CACHE_KEY_ARGENTINA);
    const cachedAsia = getCacheData<NewsArticle[]>(CACHE_KEY_ASIA);
    const cachedInternational = getCacheData<NewsArticle[]>(
      CACHE_KEY_INTERNATIONAL
    );

    // If we have cached data, return it immediately
    if (cachedArgentina && cachedAsia && cachedInternational) {
      console.log('📦 Using cached news data');

      // Check if we should refresh in background
      if (shouldRefreshCache()) {
        console.log('🔄 Cache is older than 4 hours, refreshing in background...');
        // Trigger background refresh (don't await)
        refreshCacheInBackground();
      }

      const metadata = getCacheMetadata(CACHE_KEY_LAST_REFRESH);

      return {
        argentinaLocal: cachedArgentina,
        asiaNational: cachedAsia,
        international: cachedInternational,
        lastUpdated: metadata?.timestamp || Date.now(),
      };
    }
  }

  console.log('🔄 No cached data found, fetching fresh news...');

  // Fetch fresh data (first time or force refresh)
  return await fetchAndCacheNews();
}

/**
 * Fetch fresh news and update cache
 */
async function fetchAndCacheNews(): Promise<CachedNewsConfig> {
  const [argentinaLocal, asiaNational, international] = await Promise.all([
    fetchArgentinaLocalNews(),
    fetchAsiaNationalNews(),
    fetchInternationalNews(),
  ]);

  const now = Date.now();

  // Cache the results
  setCacheData(CACHE_KEY_ARGENTINA, argentinaLocal, {
    region: 'Mendoza, Argentina',
    scale: 'local',
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_ASIA, asiaNational, {
    region: 'Asia',
    scale: 'national',
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_INTERNATIONAL, international, {
    region: 'World',
    scale: 'international',
    ttl: CACHE_TTL,
  });

  // Store last refresh timestamp
  setCacheData(CACHE_KEY_LAST_REFRESH, now, {
    region: 'System',
    scale: 'international',
    ttl: CACHE_TTL,
  });

  return {
    argentinaLocal,
    asiaNational,
    international,
    lastUpdated: now,
  };
}

/**
 * Background refresh (doesn't block UI)
 */
async function refreshCacheInBackground(): Promise<void> {
  try {
    await fetchAndCacheNews();
    console.log('✅ Background cache refresh completed');

    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('cacheRefreshed'));
  } catch (error) {
    console.error('❌ Background cache refresh failed:', error);
  }
}

/**
 * Manually refresh the cache (user-triggered)
 */
export async function refreshNewsCache(): Promise<CachedNewsConfig> {
  return getCachedNews(true);
}

/**
 * Get all cached articles combined
 */
export async function getAllCachedArticles(): Promise<NewsArticle[]> {
  const config = await getCachedNews();
  return [
    ...config.argentinaLocal,
    ...config.asiaNational,
    ...config.international,
  ];
}

/**
 * Initialize background refresh checker
 * Call this once when app starts
 */
export function initializeBackgroundRefresh(): void {
  // Check every 5 minutes if cache needs refresh
  setInterval(() => {
    if (shouldRefreshCache()) {
      console.log('⏰ Automatic 4-hour refresh triggered');
      refreshCacheInBackground();
    }
  }, BACKGROUND_REFRESH_CHECK_INTERVAL);

  console.log('✅ Background refresh checker initialized (checks every 5 minutes)');
}
