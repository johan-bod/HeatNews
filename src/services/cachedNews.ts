import type { NewsArticle } from '@/types/news';
import { fetchNewsDataArticles, convertNewsDataArticle } from './newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { inferArticleOrigins, loadCoreGazetteer } from '@/utils/geoInference';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import { indexArticleTopics } from '@/utils/topicIndexer';
import { setCacheData, getCacheData, getCacheMetadata, getRotationIndex, setRotationIndex } from '@/utils/cache';
import { buildRefreshQueries, toSearchParams } from './sharedPool';
import {
  incrementUsage,
  canMakeRequest,
  SHARED_POOL_BUDGET,
  incrementUserFetch,
  canUserFetch,
  syncUsageToFirestore,
} from './apiBudget';
import { buildPersonalizedQueries } from './personalizedFetch';
import type { UserPreferences } from '@/types/preferences';

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
 * Shared processing: geocode, infer origins, assign scale, compute heat colors
 */
async function processArticles(articles: NewsArticle[], scale: ArticleScale): Promise<NewsArticle[]> {
  let processed = geocodeArticles(articles);
  await loadCoreGazetteer();
  processed = inferArticleOrigins(processed);
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

/**
 * Execute shared pool queries, respecting budget.
 * Fetches in batches to avoid overwhelming the API.
 */
async function fetchSharedPool(): Promise<{
  local: NewsArticle[];
  regional: NewsArticle[];
  national: NewsArticle[];
  international: NewsArticle[];
}> {
  const result = {
    local: [] as NewsArticle[],
    regional: [] as NewsArticle[],
    national: [] as NewsArticle[],
    international: [] as NewsArticle[],
  };

  if (!canMakeRequest(SHARED_POOL_BUDGET)) {
    console.warn('API budget insufficient for shared pool refresh');
    return result;
  }

  const rotationIndex = getRotationIndex();
  const { queries, nextIndex } = buildRefreshQueries(rotationIndex);

  // Execute in small batches (5 concurrent) to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        try {
          const params = toSearchParams(q);
          const response = await fetchNewsDataArticles(params);
          incrementUsage(1);
          return { scale: q.scale, articles: response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null) };
        } catch (error) {
          console.warn(`Shared pool query failed (${q.id}):`, error);
          return { scale: q.scale, articles: [] };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        const { scale, articles } = r.value;
        result[scale].push(...await processArticles(articles, scale));
      }
    }
  }

  setRotationIndex(nextIndex);

  return result;
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
  const pool = await fetchSharedPool();

  const now = Date.now();
  const cacheOpts = (region: string, scale: ArticleScale) => ({
    region,
    scale,
    ttl: CACHE_TTL,
  });

  setCacheData(CACHE_KEY_LOCAL, pool.local, cacheOpts('France - Cities', 'local'));
  setCacheData(CACHE_KEY_REGIONAL, pool.regional, cacheOpts('France - Regions', 'regional'));
  setCacheData(CACHE_KEY_NATIONAL, pool.national, cacheOpts('Europe - Countries', 'national'));
  setCacheData(CACHE_KEY_INTERNATIONAL, pool.international, cacheOpts('World', 'international'));
  setCacheData(CACHE_KEY_LAST_REFRESH, now, cacheOpts('System', 'international'));

  return {
    localNews: pool.local,
    regionalNews: pool.regional,
    nationalNews: pool.national,
    international: pool.international,
    lastUpdated: now,
  };
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

/**
 * Execute a personalized fetch for a signed-in user.
 * Uses their preference topics + locations to build targeted queries.
 * Results are cached separately and merged with shared pool.
 */
export async function fetchPersonalizedNews(
  uid: string,
  preferences: UserPreferences
): Promise<NewsArticle[]> {
  if (!canUserFetch(uid)) {
    throw new Error('Daily personalized fetch limit reached');
  }

  const queries = buildPersonalizedQueries(preferences);
  if (queries.length === 0) return [];

  const articles: NewsArticle[] = [];

  for (const params of queries) {
    try {
      const response = await fetchNewsDataArticles(params);
      incrementUsage(1);
      articles.push(...response.results.map(convertNewsDataArticle).filter((a): a is NewsArticle => a !== null));
    } catch (error) {
      console.warn('Personalized fetch query failed:', error);
    }
  }

  incrementUserFetch(uid);
  syncUsageToFirestore(uid).catch(console.warn); // fire-and-forget

  // Process and cache
  const processed = await processArticles(articles, 'international');
  setCacheData(`personalized_news_${uid}`, processed, {
    region: 'Personalized',
    scale: 'international',
    ttl: CACHE_TTL,
  });

  return processed;
}

/**
 * Get cached personalized articles (if any).
 */
export function getCachedPersonalizedNews(uid: string): NewsArticle[] {
  return getCacheData<NewsArticle[]>(`personalized_news_${uid}`) || [];
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
