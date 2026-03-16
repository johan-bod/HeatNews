import type { NewsDataResponse, NewsDataArticle, NewsArticle } from '@/types/news';
import { MEDIA_OUTLETS } from '@/data/media-outlets';
import { resolveCredibility } from '@/utils/credibilityService';

const BASE_URL = '/api/news';

export interface NewsDataSearchParams {
  query?: string;
  country?: string | string[];
  category?: string | string[];
  language?: string | string[];
  size?: number;
  page?: string;
  domain?: string;
  domainurl?: string;
  prioritydomain?: 'top' | 'medium' | 'low';
  excludedomain?: string;
}

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

  const url = `${BASE_URL}?${searchParams.toString()}`;

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
}

export function convertNewsDataArticle(article: NewsDataArticle): NewsArticle | null {
  // Resolve country: prefer media-outlets lookup, fall back to API response
  const outlet = MEDIA_OUTLETS.find(o => o.domain && article.source_url?.includes(o.domain));
  const resolvedCountry = outlet?.country || article.country?.[0]?.toLowerCase();

  const converted: NewsArticle = {
    id: article.article_id,
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.link,
    publishedAt: article.pubDate,
    category: article.category?.[0],
    language: article.language,
    country: resolvedCountry,
    source: {
      name: article.source_id,
      url: article.source_url,
    },
    thumbnail: article.image_url,
    tags: article.keywords || [],
  };

  // Filter unreliable sources at ingestion
  const { filtered } = resolveCredibility(converted);
  if (filtered) return null;

  return converted;
}

export interface FilterAndSearchParams {
  query?: string;
  countries?: string[];
  languages?: string[];
  categories?: string[];
  scale?: 'all' | 'local' | 'regional' | 'national' | 'international';
  prioritydomain?: 'top' | 'medium' | 'low';
  size?: number;
}

export async function searchAndFilterNews(
  params: FilterAndSearchParams
): Promise<NewsArticle[]> {
  const {
    query,
    countries = [],
    languages = [],
    categories = [],
    prioritydomain,
    size = 10,
  } = params;

  const apiParams: NewsDataSearchParams = { size };

  if (query) apiParams.query = query;
  if (countries.length > 0) apiParams.country = countries;
  if (languages.length > 0) apiParams.language = languages;
  if (categories.length > 0) apiParams.category = categories;
  if (prioritydomain && prioritydomain !== ('all' as string)) {
    apiParams.prioritydomain = prioritydomain;
  }

  const response = await fetchNewsDataArticles(apiParams);
  return response.results
    .map(convertNewsDataArticle)
    .filter((a): a is NewsArticle => a !== null);
}
