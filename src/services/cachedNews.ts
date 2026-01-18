import type { NewsArticle } from '@/types/news';
import { fetchNewsDataArticles, convertNewsDataArticle } from './newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import { setCacheData, getCacheData } from '@/utils/cache';

/**
 * Pre-configured news queries for landing page
 */
export interface CachedNewsConfig {
  bretagne: NewsArticle[]; // Hyperlocal news for Bretagne region
  international: NewsArticle[]; // International news
  lastUpdated: number;
}

const CACHE_KEY_BRETAGNE = 'bretagne_news';
const CACHE_KEY_INTERNATIONAL = 'international_news';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch Bretagne regional news (hyperlocal)
 */
async function fetchBretagneNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'fr', // France
      language: 'fr', // French
      size: 10,
      // Note: NewsData.io doesn't have specific region filtering in free tier
      // We'll filter by keywords related to Bretagne
      query: 'Bretagne OR Rennes OR Brest OR Nantes OR Quimper',
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
    console.error('Failed to fetch Bretagne news:', error);
    return [];
  }
}

/**
 * Fetch international news
 */
async function fetchInternationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['us', 'gb', 'de', 'fr', 'es', 'it', 'jp', 'cn', 'in', 'au'],
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
 * Get cached news or fetch fresh if cache is invalid
 */
export async function getCachedNews(
  forceRefresh: boolean = false
): Promise<CachedNewsConfig> {
  // Try to get from cache first
  if (!forceRefresh) {
    const cachedBretagne = getCacheData<NewsArticle[]>(CACHE_KEY_BRETAGNE);
    const cachedInternational = getCacheData<NewsArticle[]>(
      CACHE_KEY_INTERNATIONAL
    );

    if (cachedBretagne && cachedInternational) {
      console.log('📦 Using cached news data');
      return {
        bretagne: cachedBretagne,
        international: cachedInternational,
        lastUpdated: Date.now(), // We don't track this yet
      };
    }
  }

  console.log('🔄 Fetching fresh news data...');

  // Fetch fresh data
  const [bretagne, international] = await Promise.all([
    fetchBretagneNews(),
    fetchInternationalNews(),
  ]);

  // Cache the results
  setCacheData(CACHE_KEY_BRETAGNE, bretagne, {
    region: 'Bretagne',
    scale: 'regional',
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_INTERNATIONAL, international, {
    region: 'World',
    scale: 'international',
    ttl: CACHE_TTL,
  });

  return {
    bretagne,
    international,
    lastUpdated: Date.now(),
  };
}

/**
 * Manually refresh the cache
 */
export async function refreshNewsCache(): Promise<CachedNewsConfig> {
  return getCachedNews(true);
}

/**
 * Get all cached articles combined
 */
export async function getAllCachedArticles(): Promise<NewsArticle[]> {
  const config = await getCachedNews();
  return [...config.bretagne, ...config.international];
}
