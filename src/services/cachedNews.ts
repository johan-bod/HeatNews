import type { NewsArticle } from '@/types/news';
import { fetchNewsDataArticles, convertNewsDataArticle } from './newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import { setCacheData, getCacheData, getCacheMetadata } from '@/utils/cache';

/**
 * Pre-configured news queries for landing page
 */
export interface CachedNewsConfig {
  localNews: NewsArticle[]; // Hyperlocal: French cities (Paris, Lyon, etc.)
  regionalNews: NewsArticle[]; // Regional: French regions (Bretagne, Provence, etc.)
  nationalNews: NewsArticle[]; // National: European countries (France, Germany, UK, etc.)
  international: NewsArticle[]; // International: Worldwide news
  lastUpdated: number;
}

const CACHE_KEY_LOCAL = 'local_news';
const CACHE_KEY_REGIONAL = 'regional_news';
const CACHE_KEY_NATIONAL = 'national_news';
const CACHE_KEY_INTERNATIONAL = 'international_news';
const CACHE_KEY_LAST_REFRESH = 'last_background_refresh';
const CACHE_KEY_USER_LOCATION = 'user_detected_location';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const BACKGROUND_REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Fetch France hyperlocal news (major French cities)
 */
async function fetchFranceLocalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'fr', // France
      language: 'fr', // French
      size: 10,
      // Search for major French cities (hyperlocal)
      query: 'Paris OR Lyon OR Marseille OR Toulouse OR Nice OR Bordeaux OR Lille',
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
    console.error('Failed to fetch France local news:', error);
    return [];
  }
}

/**
 * Fetch France regional news (French regions: Bretagne, Provence, Normandie, etc.)
 */
async function fetchFranceRegionalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'fr', // France
      language: 'fr', // French
      size: 10,
      // Search for French regions (intermediate between city and country)
      query: 'Bretagne OR Provence OR Normandie OR "Auvergne-Rhône-Alpes" OR "Nouvelle-Aquitaine" OR Occitanie',
    });

    let articles = response.results.map(convertNewsDataArticle);

    // Geocode articles
    articles = geocodeArticles(articles);

    // Mark as regional scale
    articles = articles.map(a => ({ ...a, scale: 'regional' as const }));

    // Analyze heat for regional scale
    const clusters = analyzeArticleHeat(articles, 'regional');

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
    console.error('Failed to fetch France regional news:', error);
    return [];
  }
}

/**
 * Fetch Europe national news (individual European countries)
 */
async function fetchEuropeNationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['fr', 'de', 'gb', 'it', 'es', 'nl', 'be', 'ch'], // European countries
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
    console.error('Failed to fetch Europe national news:', error);
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
    const cachedLocal = getCacheData<NewsArticle[]>(CACHE_KEY_LOCAL);
    const cachedRegional = getCacheData<NewsArticle[]>(CACHE_KEY_REGIONAL);
    const cachedNational = getCacheData<NewsArticle[]>(CACHE_KEY_NATIONAL);
    const cachedInternational = getCacheData<NewsArticle[]>(CACHE_KEY_INTERNATIONAL);

    // If we have cached data, return it immediately
    if (cachedLocal && cachedRegional && cachedNational && cachedInternational) {
      console.log('📦 Using cached news data (4 scales)');

      // Check if we should refresh in background
      if (shouldRefreshCache()) {
        console.log('🔄 Cache is older than 4 hours, refreshing in background...');
        // Trigger background refresh (don't await)
        refreshCacheInBackground();
      }

      const metadata = getCacheMetadata(CACHE_KEY_LAST_REFRESH);

      return {
        localNews: cachedLocal,
        regionalNews: cachedRegional,
        nationalNews: cachedNational,
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
 * Fetches all 4 scales: Local (cities) → Regional (regions) → National (countries) → International (global)
 */
async function fetchAndCacheNews(): Promise<CachedNewsConfig> {
  const [localNews, regionalNews, nationalNews, international] = await Promise.all([
    fetchFranceLocalNews(),      // French cities
    fetchFranceRegionalNews(),   // French regions (Bretagne, etc.)
    fetchEuropeNationalNews(),   // European countries
    fetchInternationalNews(),    // Worldwide
  ]);

  const now = Date.now();

  // Cache the results
  setCacheData(CACHE_KEY_LOCAL, localNews, {
    region: 'France - Cities',
    scale: 'local',
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_REGIONAL, regionalNews, {
    region: 'France - Regions',
    scale: 'regional',
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_NATIONAL, nationalNews, {
    region: 'Europe - Countries',
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
    localNews,
    regionalNews,
    nationalNews,
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
    ...config.localNews,
    ...config.asiaNational,
    ...config.international,
  ];
}

// Store interval ID to prevent multiple intervals
let refreshIntervalId: NodeJS.Timeout | null = null;

/**
 * Initialize background refresh checker
 * Call this once when app starts
 * Returns cleanup function to clear the interval
 */
export function initializeBackgroundRefresh(): () => void {
  // Clear any existing interval first
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }

  // Check every 5 minutes if cache needs refresh
  refreshIntervalId = setInterval(() => {
    if (shouldRefreshCache()) {
      console.log('⏰ Automatic 4-hour refresh triggered');
      refreshCacheInBackground();
    }
  }, BACKGROUND_REFRESH_CHECK_INTERVAL);

  console.log('✅ Background refresh checker initialized (checks every 5 minutes)');

  // Return cleanup function
  return () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
      console.log('🧹 Background refresh checker cleaned up');
    }
  };
}
