// Type definitions for news articles and API responses

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  publishedAt: string;
  category?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  source: {
    name: string;
    url?: string;
  };
  thumbnail?: string;
  tags?: string[];
}

export interface GuardianArticle {
  id: string;
  type: string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  apiUrl: string;
  fields?: {
    headline?: string;
    trailText?: string;
    bodyText?: string;
    thumbnail?: string;
  };
  tags?: Array<{
    id: string;
    type: string;
    webTitle: string;
  }>;
}

export interface GuardianResponse {
  response: {
    status: string;
    userTier: string;
    total: number;
    startIndex: number;
    pageSize: number;
    currentPage: number;
    pages: number;
    results: GuardianArticle[];
  };
}

export type NewsScope = 'hyper-local' | 'regional' | 'global';
