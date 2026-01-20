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
  // Heat mapping for topic popularity
  heatLevel?: number; // 0-100
  color?: string; // Hex/RGB color for visualization
  coverage?: number; // Number of sources covering this topic
  scale?: 'local' | 'regional' | 'national' | 'international';
}

// NewsData.io API Types
export interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description?: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id: string;
  source_priority: number;
  source_url?: string;
  source_icon?: string;
  language: string;
  country: string[];
  category: string[];
  ai_tag?: string;
  sentiment?: string;
  sentiment_stats?: string;
  ai_region?: string;
  ai_org?: string;
}

export interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

// Legacy Guardian API Types (keeping for reference, can be removed later)
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
