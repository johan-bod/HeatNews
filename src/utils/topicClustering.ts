import type { NewsArticle } from '@/types/news';

// Stopwords for title normalization (English + French)
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'and', 'or', 'but', 'not', 'by', 'from', 'as', 'it', 'this',
  'that', 'has', 'have', 'had', 'be', 'been', 'will', 'would', 'can', 'could',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'en', 'est', 'sur',
  'dans', 'pour', 'par', 'avec', 'qui', 'que', 'son', 'ses', 'aux', 'ce', 'cette',
]);

export interface StoryCluster {
  articles: NewsArticle[];
  terms: Set<string>;
  uniqueSources: Set<string>;
  heatLevel: number;
  coverage: number;
}

/**
 * Normalize title: lowercase, strip punctuation, remove stopwords,
 * extract significant terms (3+ chars).
 */
function extractTerms(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüÿçñ-]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Jaccard similarity between two term sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const term of a) {
    if (b.has(term)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const CLUSTER_THRESHOLD = 0.25;

/**
 * Cluster articles by title similarity using Jaccard index.
 */
export function clusterArticles(articles: NewsArticle[]): StoryCluster[] {
  const clusters: StoryCluster[] = [];

  for (const article of articles) {
    const terms = extractTerms(article.title);
    let matched = false;

    for (const cluster of clusters) {
      if (jaccardSimilarity(terms, cluster.terms) >= CLUSTER_THRESHOLD) {
        cluster.articles.push(article);
        cluster.uniqueSources.add(article.source.name);
        // Merge terms
        for (const t of terms) cluster.terms.add(t);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        articles: [article],
        terms,
        uniqueSources: new Set([article.source.name]),
        heatLevel: 0,
        coverage: 1,
      });
    }
  }

  // Calculate heat for each cluster
  for (const cluster of clusters) {
    const newestArticleHoursAgo = Math.min(
      ...cluster.articles.map(a => {
        const diffMs = Date.now() - new Date(a.publishedAt).getTime();
        return diffMs / (1000 * 60 * 60);
      })
    );
    cluster.heatLevel = calculateClusterHeat(
      cluster.uniqueSources.size,
      cluster.articles.length,
      newestArticleHoursAgo
    );
    cluster.coverage = cluster.uniqueSources.size;
  }

  return clusters;
}

/**
 * Heat formula from spec:
 * heatScore = min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus)
 */
export function calculateClusterHeat(
  uniqueSources: number,
  articleCount: number,
  newestArticleHoursAgo: number
): number {
  let recencyBonus = 0;
  if (newestArticleHoursAgo < 2) recencyBonus = 10;
  else if (newestArticleHoursAgo < 6) recencyBonus = 5;

  return Math.min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus);
}

/**
 * Map heat level to color.
 */
export function heatLevelToColor(heat: number): string {
  if (heat <= 20) return '#94A3B8'; // grey (cold)
  if (heat <= 40) return '#F59E0B'; // amber (warming)
  if (heat <= 60) return '#F97316'; // orange (warm)
  if (heat <= 80) return '#EF4444'; // red (hot)
  return '#DC2626'; // deep red (very hot)
}

/**
 * Get color for an article based on its cluster's heat level.
 */
export function getArticleColor(
  article: NewsArticle,
  clusters: StoryCluster[]
): string {
  for (const cluster of clusters) {
    if (cluster.articles.some(a => a.id === article.id)) {
      return heatLevelToColor(cluster.heatLevel);
    }
  }
  return '#94A3B8';
}

/**
 * Convenience: analyze articles and return clusters.
 * The `scale` parameter is kept for API compatibility but no longer
 * changes the formula (spec uses a single universal formula).
 */
export function analyzeArticleHeat(
  articles: NewsArticle[],
  _scale?: string
): StoryCluster[] {
  return clusterArticles(articles);
}
