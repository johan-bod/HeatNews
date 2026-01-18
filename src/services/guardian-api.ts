import type { GuardianResponse, GuardianArticle, NewsArticle } from '@/types/news';

const API_KEY = import.meta.env.VITE_GUARDIAN_API_KEY;
const BASE_URL = 'https://content.guardianapis.com';

export interface GuardianSearchParams {
  query?: string;
  section?: string;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  page?: number;
  orderBy?: 'newest' | 'oldest' | 'relevance';
  showFields?: string;
  showTags?: string;
}

/**
 * Fetch articles from The Guardian API
 */
export async function fetchGuardianArticles(
  params: GuardianSearchParams = {}
): Promise<GuardianResponse> {
  const {
    query,
    section,
    fromDate,
    toDate = new Date().toISOString().split('T')[0], // Today
    pageSize = 20,
    page = 1,
    orderBy = 'newest',
    showFields = 'headline,trailText,bodyText,thumbnail',
    showTags = 'keyword',
  } = params;

  const searchParams = new URLSearchParams({
    'api-key': API_KEY || 'test',
    'page-size': pageSize.toString(),
    page: page.toString(),
    'order-by': orderBy,
    'show-fields': showFields,
    'show-tags': showTags,
  });

  if (query) searchParams.append('q', query);
  if (section) searchParams.append('section', section);
  if (fromDate) searchParams.append('from-date', fromDate);
  if (toDate) searchParams.append('to-date', toDate);

  const url = `${BASE_URL}/search?${searchParams.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Guardian API error: ${response.status} ${response.statusText}`);
    }

    const data: GuardianResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Guardian articles:', error);
    throw error;
  }
}

/**
 * Convert Guardian article format to our NewsArticle format
 */
export function convertGuardianArticle(article: GuardianArticle): NewsArticle {
  return {
    id: article.id,
    title: article.fields?.headline || article.webTitle,
    description: article.fields?.trailText,
    content: article.fields?.bodyText,
    url: article.webUrl,
    publishedAt: article.webPublicationDate,
    category: article.sectionName,
    source: {
      name: 'The Guardian',
      url: 'https://www.theguardian.com',
    },
    thumbnail: article.fields?.thumbnail,
    tags: article.tags?.map(tag => tag.webTitle),
  };
}

/**
 * Fetch today's news articles
 */
export async function fetchTodayNews(params: Omit<GuardianSearchParams, 'toDate'> = {}): Promise<NewsArticle[]> {
  const today = new Date().toISOString().split('T')[0];

  const response = await fetchGuardianArticles({
    ...params,
    fromDate: today,
    toDate: today,
  });

  return response.response.results.map(convertGuardianArticle);
}
