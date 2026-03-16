export type FeedSourceType =
  | 'rss'        // Generic RSS/Atom (government sites, agencies, blogs)
  | 'telegram'   // Telegram public channel via RSSHub
  | 'facebook'   // Facebook public page via RSSHub
  | 'youtube'    // YouTube channel via RSSHub
  | 'reddit'     // Subreddit via RSS
  | 'custom';    // Any other RSS-compatible URL

export interface SourceFeed {
  id: string;
  createdAt: number;
  label: string;
  /** RSS/Atom endpoint URL (may be a RSSHub route or direct feed URL). */
  url: string;
  type: FeedSourceType;
  /** User-assigned topic tags — applied to all articles from this feed. */
  tags: string[];
  /** ISO-2 country code to assign to ingested articles (for geocoding). */
  country?: string;
  /** BCP-47 language tag (e.g. 'ar', 'fr', 'en'). */
  language?: string;
  /** Max items to ingest per fetch. Default 20. */
  maxItems: number;
  active: boolean;
  lastFetchedAt?: number;
  lastError?: string;
}
