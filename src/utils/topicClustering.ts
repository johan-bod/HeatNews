import type { NewsArticle } from '@/types/news';
import { resolveCredibilityByDomain, extractDomain } from '@/utils/credibilityService';
import { normalizeOrgId } from '@/utils/sourceNormalization';

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
  sourceDomains: Map<string, string | undefined>; // source.name → domain
  heatLevel: number;
  coverage: number;
}

/**
 * Normalize title: lowercase, strip punctuation, remove stopwords,
 * extract significant terms (3+ chars).
 */
export function extractTerms(text: string): Set<string> {
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
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const term of a) {
    if (b.has(term)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const CLUSTER_THRESHOLD = 0.25;
/** Within-org duplicate story threshold: higher bar than clustering. */
const DEDUP_THRESHOLD = 0.70;

/**
 * Count distinct stories across a set of articles from the SAME organization.
 * Articles with Jaccard similarity ≥ DEDUP_THRESHOLD are considered the same
 * story (cross-channel reposts) and counted only once.
 */
function countDistinctStoriesForOrg(articles: NewsArticle[]): number {
  if (articles.length <= 1) return articles.length;
  const storyClusters: Set<string>[] = [];
  for (const a of articles) {
    const terms = extractTerms(a.title);
    let matched = false;
    for (const story of storyClusters) {
      if (jaccardSimilarity(terms, story) >= DEDUP_THRESHOLD) {
        for (const t of terms) story.add(t);
        matched = true;
        break;
      }
    }
    if (!matched) storyClusters.push(new Set(terms));
  }
  return storyClusters.length;
}

/**
 * Count "distinct stories" across all articles in a cluster, deduplicating
 * cross-channel reposts from the same organization.
 *
 * Articles from the same canonical org with near-identical titles count as
 * ONE story, regardless of how many channels (web, Telegram, Facebook, etc.)
 * the org used to publish it.
 */
export function deduplicateArticleCount(articles: NewsArticle[]): number {
  const byOrg = new Map<string, NewsArticle[]>();
  for (const a of articles) {
    const orgId = normalizeOrgId(a.source.name, a.source.url);
    const group = byOrg.get(orgId) ?? [];
    group.push(a);
    byOrg.set(orgId, group);
  }
  let total = 0;
  for (const [, orgArticles] of byOrg) {
    total += countDistinctStoriesForOrg(orgArticles);
  }
  return total;
}

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
        if (!cluster.sourceDomains.has(article.source.name)) {
          cluster.sourceDomains.set(article.source.name, extractDomain(article.source.url));
        }
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
        sourceDomains: new Map([[article.source.name, extractDomain(article.source.url)]]),
        heatLevel: 0,
        coverage: 1,
      });
    }
  }

  // Calculate heat for each cluster
  for (const cluster of clusters) {
    // Group articles by canonical org — prevents same org from contributing
    // multiple times via different channels (web, Telegram, Facebook, etc.).
    const canonicalOrgs = new Map<string, { weight: number; isHyperlocal: boolean }>();
    for (const article of cluster.articles) {
      const orgId  = normalizeOrgId(article.source.name, article.source.url);
      const domain = extractDomain(article.source.url);
      const { weight, tier } = resolveCredibilityByDomain(domain);
      const existing = canonicalOrgs.get(orgId);
      // Keep only the highest-credibility channel per org
      if (!existing || weight > existing.weight) {
        canonicalOrgs.set(orgId, { weight, isHyperlocal: tier === 'hyperlocal' });
      }
    }

    let weightedSources = 0;
    let hyperlocalCount = 0;
    for (const { weight, isHyperlocal } of canonicalOrgs.values()) {
      weightedSources += weight;
      if (isHyperlocal) hyperlocalCount++;
    }

    const newestArticleHoursAgo = Math.min(
      ...cluster.articles.map(a => {
        const diffMs = Date.now() - new Date(a.publishedAt).getTime();
        return diffMs / (1000 * 60 * 60);
      })
    );

    // Use deduplicated article count: same org publishing same story via
    // multiple channels counts as ONE, not N.
    const deduplicatedCount = deduplicateArticleCount(cluster.articles);

    cluster.heatLevel = calculateClusterHeat(
      weightedSources,
      deduplicatedCount,
      newestArticleHoursAgo,
      hyperlocalCount
    );
    cluster.coverage = cluster.uniqueSources.size;
  }

  return clusters;
}

/**
 * Heat formula from spec:
 * heatScore = min(100, (weightedSources * 20) + (articleCount * 5) + recencyBonus + convergenceBonus)
 */
export function calculateClusterHeat(
  weightedSources: number,
  articleCount: number,
  newestArticleHoursAgo: number,
  hyperlocalCount: number = 0
): number {
  let recencyBonus = 0;
  if (newestArticleHoursAgo < 2) recencyBonus = 10;
  else if (newestArticleHoursAgo < 6) recencyBonus = 5;

  const convergenceBonus = hyperlocalCount >= 3 ? hyperlocalCount * 3 : 0;

  return Math.min(100, (weightedSources * 20) + (articleCount * 5) + recencyBonus + convergenceBonus);
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
