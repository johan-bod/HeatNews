import type { NewsArticle } from '@/types/news';
import { fetchNewsDataArticles, convertNewsDataArticle } from './newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import { indexArticleTopics } from '@/utils/topicIndexer';
import { setCacheData, getCacheData, getCacheMetadata } from '@/utils/cache';

export interface CachedNewsConfig {
  localNews: NewsArticle[];
  regionalNews: NewsArticle[];
  nationalNews: NewsArticle[];
  international: NewsArticle[];
  lastUpdated: number;
}

type ArticleScale = 'local' | 'regional' | 'national' | 'international';

const CACHE_KEY_LOCAL = 'local_news';
const CACHE_KEY_REGIONAL = 'regional_news';
const CACHE_KEY_NATIONAL = 'national_news';
const CACHE_KEY_INTERNATIONAL = 'international_news';
const CACHE_KEY_LAST_REFRESH = 'last_background_refresh';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const BACKGROUND_REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Shared processing: geocode, assign scale, compute heat colors
 */
function processArticles(articles: NewsArticle[], scale: ArticleScale): NewsArticle[] {
  let processed = geocodeArticles(articles);
  processed = processed.map(a => {
    const topics = indexArticleTopics(a, a.language || 'en');
    return {
      ...a,
      scale,
      primaryTopic: topics.primary || undefined,
      secondaryTopics: topics.secondary.length > 0 ? topics.secondary : undefined,
    };
  });

  const clusters = analyzeArticleHeat(processed, scale);

  const clusterMap = new Map<string, typeof clusters[0]>();
  clusters.forEach(cluster => {
    cluster.articles.forEach(a => clusterMap.set(a.id, cluster));
  });

  return processed.map(article => {
    const cluster = clusterMap.get(article.id);
    return {
      ...article,
      color: cluster ? getArticleColor(article, clusters) : '#6B7280',
      heatLevel: cluster?.heatLevel || 0,
      coverage: cluster?.coverage || 1,
    };
  });
}

async function fetchFranceLocalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'fr',
      language: 'fr',
      size: 10,
      query: 'Paris OR Lyon OR Marseille OR Toulouse OR Nice OR Bordeaux OR Lille',
    });
    return processArticles(response.results.map(convertNewsDataArticle), 'local');
  } catch (error) {
    console.error('Failed to fetch France local news:', error);
    return [];
  }
}

async function fetchFranceRegionalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: 'fr',
      language: 'fr',
      size: 10,
      query: 'Bretagne OR Provence OR Normandie OR "Auvergne-Rhône-Alpes" OR "Nouvelle-Aquitaine" OR Occitanie',
    });
    return processArticles(response.results.map(convertNewsDataArticle), 'regional');
  } catch (error) {
    console.error('Failed to fetch France regional news:', error);
    return [];
  }
}

async function fetchEuropeNationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['fr', 'de', 'gb', 'it', 'es', 'nl', 'be', 'ch'],
      language: 'en',
      size: 10,
      category: ['top', 'politics', 'business'],
    });
    return processArticles(response.results.map(convertNewsDataArticle), 'national');
  } catch (error) {
    console.error('Failed to fetch Europe national news:', error);
    return [];
  }
}

async function fetchInternationalNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetchNewsDataArticles({
      country: ['us', 'gb', 'de', 'fr', 'es', 'it', 'br', 'ca', 'au', 'za'],
      language: 'en',
      size: 10,
      category: ['top', 'world'],
    });
    return processArticles(response.results.map(convertNewsDataArticle), 'international');
  } catch (error) {
    console.error('Failed to fetch international news:', error);
    return [];
  }
}

function shouldRefreshCache(): boolean {
  const lastRefresh = getCacheData<number>(CACHE_KEY_LAST_REFRESH);
  if (!lastRefresh) return true;
  return Date.now() - lastRefresh >= CACHE_TTL;
}

export async function getCachedNews(
  forceRefresh: boolean = false
): Promise<CachedNewsConfig> {
  if (!forceRefresh) {
    const cachedLocal = getCacheData<NewsArticle[]>(CACHE_KEY_LOCAL);
    const cachedRegional = getCacheData<NewsArticle[]>(CACHE_KEY_REGIONAL);
    const cachedNational = getCacheData<NewsArticle[]>(CACHE_KEY_NATIONAL);
    const cachedInternational = getCacheData<NewsArticle[]>(CACHE_KEY_INTERNATIONAL);

    if (cachedLocal && cachedRegional && cachedNational && cachedInternational) {
      if (shouldRefreshCache()) {
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

  return await fetchAndCacheNews();
}

async function fetchAndCacheNews(): Promise<CachedNewsConfig> {
  const [localNews, regionalNews, nationalNews, international] = await Promise.all([
    fetchFranceLocalNews(),
    fetchFranceRegionalNews(),
    fetchEuropeNationalNews(),
    fetchInternationalNews(),
  ]);

  const now = Date.now();
  const cacheOpts = (region: string, scale: ArticleScale) => ({
    region,
    scale,
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_LOCAL, localNews, cacheOpts('France - Cities', 'local'));
  setCacheData(CACHE_KEY_REGIONAL, regionalNews, cacheOpts('France - Regions', 'regional'));
  setCacheData(CACHE_KEY_NATIONAL, nationalNews, cacheOpts('Europe - Countries', 'national'));
  setCacheData(CACHE_KEY_INTERNATIONAL, international, cacheOpts('World', 'international'));
  setCacheData(CACHE_KEY_LAST_REFRESH, now, cacheOpts('System', 'international'));

  return { localNews, regionalNews, nationalNews, international, lastUpdated: now };
}

async function refreshCacheInBackground(): Promise<void> {
  try {
    await fetchAndCacheNews();
    window.dispatchEvent(new CustomEvent('cacheRefreshed'));
  } catch (error) {
    console.error('Background cache refresh failed:', error);
  }
}

export async function refreshNewsCache(): Promise<CachedNewsConfig> {
  return getCachedNews(true);
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

export function initializeBackgroundRefresh(): () => void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }

  refreshIntervalId = setInterval(() => {
    if (shouldRefreshCache()) {
      refreshCacheInBackground();
    }
  }, BACKGROUND_REFRESH_CHECK_INTERVAL);

  return () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
  };
}
