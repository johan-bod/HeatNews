import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

export interface SerializedCluster {
  articles: NewsArticle[];
  terms: string[];
  uniqueSources: string[];
  sourceDomains: [string, string | undefined][];
  heatLevel: number;
  coverage: number;
}

export interface ClusterWorkerInput {
  articles: NewsArticle[];
  requestId: number;
}

export interface ClusterWorkerOutput {
  clusters: SerializedCluster[];
  requestId: number;
}

export function serializeCluster(c: StoryCluster): SerializedCluster {
  return {
    articles: c.articles,
    terms: Array.from(c.terms),
    uniqueSources: Array.from(c.uniqueSources),
    sourceDomains: Array.from(c.sourceDomains.entries()),
    heatLevel: c.heatLevel,
    coverage: c.coverage,
  };
}

export function deserializeCluster(s: SerializedCluster): StoryCluster {
  return {
    articles: s.articles,
    terms: new Set(s.terms),
    uniqueSources: new Set(s.uniqueSources),
    sourceDomains: new Map(s.sourceDomains),
    heatLevel: s.heatLevel,
    coverage: s.coverage,
  };
}
