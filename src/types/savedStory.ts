import type { StoryPotential } from '@/utils/storyBrief';

/** Trimmed article stored inside a SavedStory — enough to re-open the investigation */
export interface MinimalArticle {
  id: string;
  title: string;
  url: string;
  source: { name: string; url?: string };
  publishedAt: string;
  language?: string;
  country?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  heatLevel?: number;
  color?: string;
  scale?: 'local' | 'regional' | 'national' | 'international';
  primaryTopic?: string;
  secondaryTopics?: string[];
}

export interface SavedStory {
  id: string;              // `${leadArticleId}-${savedAt}`
  savedAt: number;         // ms timestamp
  lastViewedAt: number;    // updated each time the story is opened
  headline: string;
  leadArticleId: string;   // to find in live cache
  leadUrl: string;         // fallback link if cache expired
  heatAtSave: number;
  potential: StoryPotential;
  sourceCount: number;
  topSources: string[];
  topics: string[];
  coverageGapLabel: string;
  timelineStatus: string | null;
  articles: MinimalArticle[];
}
