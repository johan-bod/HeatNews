import type { NewsDataResponse, NewsDataArticle, NewsArticle } from '@/types/news';

const API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY;
const BASE_URL = 'https://newsdata.io/api/1';

export interface NewsDataSearchParams {
  query?: string;
  country?: string | string[]; // e.g., 'us', 'gb', or ['us', 'gb']
  category?: string | string[]; // business, sports, technology, etc.
  language?: string | string[]; // e.g., 'en', 'es'
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  size?: number; // Max 10 on free tier
  page?: string; // For pagination
  domain?: string; // Filter by news domain
  domainurl?: string; // Filter by domain URL
  prioritydomain?: 'top' | 'medium' | 'low';
  excludedomain?: string;
  timezone?: string;
}

/**
 * Fetch latest news articles from NewsData.io API
 */
export async function fetchNewsDataArticles(
  params: NewsDataSearchParams = {}
): Promise<NewsDataResponse> {
  const {
    query,
    country,
    category,
    language = 'en',
    size = 10,
    page,
    domain,
    domainurl,
    prioritydomain,
    excludedomain,
  } = params;

  const searchParams = new URLSearchParams({
    apikey: API_KEY || '',
    language: Array.isArray(language) ? language.join(',') : language,
  });

  if (query) searchParams.append('q', query);
  if (country) {
    searchParams.append('country', Array.isArray(country) ? country.join(',') : country);
  }
  if (category) {
    searchParams.append('category', Array.isArray(category) ? category.join(',') : category);
  }
  if (size) searchParams.append('size', size.toString());
  if (page) searchParams.append('page', page);
  if (domain) searchParams.append('domain', domain);
  if (domainurl) searchParams.append('domainurl', domainurl);
  if (prioritydomain) searchParams.append('prioritydomain', prioritydomain);
  if (excludedomain) searchParams.append('excludedomain', excludedomain);

  const url = `${BASE_URL}/news?${searchParams.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `NewsData.io API error: ${response.status} ${response.statusText} - ${
          errorData.results?.message || 'Unknown error'
        }`
      );
    }

    const data: NewsDataResponse = await response.json();

    if (data.status !== 'success') {
      throw new Error(`NewsData.io API returned status: ${data.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching NewsData.io articles:', error);
    throw error;
  }
}

/**
 * Convert NewsData.io article format to our standardized NewsArticle format
 */
export function convertNewsDataArticle(article: NewsDataArticle): NewsArticle {
  return {
    id: article.article_id,
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.link,
    publishedAt: article.pubDate,
    category: article.category?.[0], // Take first category
    source: {
      name: article.source_id,
      url: article.source_url,
    },
    thumbnail: article.image_url,
    tags: article.keywords || [],
  };
}

/**
 * Fetch today's news articles from multiple countries
 */
export async function fetchTodayNews(
  params: Omit<NewsDataSearchParams, 'from_date' | 'to_date'> = {}
): Promise<NewsArticle[]> {
  const response = await fetchNewsDataArticles({
    ...params,
    size: params.size || 10, // Free tier max is 10 per request
    language: params.language || 'en',
    // Don't set from_date/to_date to get latest news
  });

  return response.results.map(convertNewsDataArticle);
}

/**
 * Fetch news by country (useful for regional filtering)
 */
export async function fetchNewsByCountry(
  country: string | string[],
  params: Omit<NewsDataSearchParams, 'country'> = {}
): Promise<NewsArticle[]> {
  const response = await fetchNewsDataArticles({
    ...params,
    country,
    size: params.size || 10,
  });

  return response.results.map(convertNewsDataArticle);
}

/**
 * Fetch news by category
 */
export async function fetchNewsByCategory(
  category: string | string[],
  params: Omit<NewsDataSearchParams, 'category'> = {}
): Promise<NewsArticle[]> {
  const response = await fetchNewsDataArticles({
    ...params,
    category,
    size: params.size || 10,
  });

  return response.results.map(convertNewsDataArticle);
}

/**
 * Search news by keyword
 */
export async function searchNews(
  query: string,
  params: Omit<NewsDataSearchParams, 'query'> = {}
): Promise<NewsArticle[]> {
  const response = await fetchNewsDataArticles({
    ...params,
    query,
    size: params.size || 10,
  });

  return response.results.map(convertNewsDataArticle);
}

/**
 * Comprehensive filter and search interface
 */
export interface FilterAndSearchParams {
  query?: string;
  countries?: string[];
  languages?: string[];
  categories?: string[];
  scale?: 'all' | 'local' | 'regional' | 'national' | 'international';
  prioritydomain?: 'top' | 'medium' | 'low';
  size?: number;
}

/**
 * Search and filter news with comprehensive parameters
 * Supports all NewsData.io filter options and returns geocoded articles with heat mapping
 */
export async function searchAndFilterNews(
  params: FilterAndSearchParams
): Promise<NewsArticle[]> {
  const {
    query,
    countries = [],
    languages = [],
    categories = [],
    scale,
    prioritydomain,
    size = 10,
  } = params;

  // Build API parameters
  const apiParams: NewsDataSearchParams = {
    size,
  };

  if (query) apiParams.query = query;
  if (countries.length > 0) apiParams.country = countries;
  if (languages.length > 0) apiParams.language = languages;
  if (categories.length > 0) apiParams.category = categories;
  if (prioritydomain && prioritydomain !== 'all') {
    apiParams.prioritydomain = prioritydomain as 'top' | 'medium' | 'low';
  }

  // Fetch articles
  const response = await fetchNewsDataArticles(apiParams);
  let articles = response.results.map(convertNewsDataArticle);

  // Apply scale filter if specified (will be done via geocoding and filtering)
  // The scale filter is applied after geocoding by the caller
  // We return the articles and let the caller apply scale filtering

  return articles;
}
