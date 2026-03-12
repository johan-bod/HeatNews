import type { NewsArticle } from '@/types/news';

/**
 * Topic cluster with heat level
 */
export interface TopicCluster {
  topic: string;
  keywords: string[];
  articles: NewsArticle[];
  coverage: number; // Number of unique sources
  heatLevel: number; // 0-100
  color: string; // Hex color for visualization
}

/**
 * Heat level configuration by scale
 */
export interface HeatConfig {
  coldThreshold: number; // Articles below this = grey
  warmThreshold: number; // Articles above this = warm colors
  hotThreshold: number; // Articles above this = red hot
}

const HEAT_CONFIGS: Record<string, HeatConfig> = {
  local: {
    coldThreshold: 2,
    warmThreshold: 5,
    hotThreshold: 10,
  },
  regional: {
    coldThreshold: 3,
    warmThreshold: 8,
    hotThreshold: 15,
  },
  national: {
    coldThreshold: 5,
    warmThreshold: 15,
    hotThreshold: 30,
  },
  international: {
    coldThreshold: 10,
    warmThreshold: 25,
    hotThreshold: 50,
  },
};

/**
 * Calculate similarity between two strings (Jaccard similarity on words)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(
    str1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3) // Ignore short words
  );

  const words2 = new Set(
    str2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Extract key topics from article
 */
function extractTopics(article: NewsArticle): string[] {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();

  // Extract meaningful words (longer than 3 chars, not common words)
  const commonWords = new Set([
    'about',
    'after',
    'before',
    'could',
    'first',
    'from',
    'have',
    'into',
    'more',
    'most',
    'other',
    'over',
    'says',
    'some',
    'than',
    'that',
    'their',
    'there',
    'these',
    'they',
    'this',
    'what',
    'when',
    'where',
    'which',
    'will',
    'with',
    'would',
  ]);

  const words = text
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.has(w));

  // Use tags/keywords if available
  const keywords = article.tags || [];

  return [...new Set([...words, ...keywords])];
}

/**
 * Cluster articles by topic similarity
 */
export function clusterArticlesByTopic(
  articles: NewsArticle[],
  similarityThreshold: number = 0.3
): TopicCluster[] {
  const clusters: TopicCluster[] = [];

  articles.forEach(article => {
    let assignedToCluster = false;

    // Try to find a matching cluster
    for (const cluster of clusters) {
      // Check similarity with existing articles in cluster
      const similarity = calculateSimilarity(
        article.title + ' ' + (article.description || ''),
        cluster.articles[0].title + ' ' + (cluster.articles[0].description || '')
      );

      if (similarity >= similarityThreshold) {
        cluster.articles.push(article);
        assignedToCluster = true;
        break;
      }
    }

    // Create new cluster if no match
    if (!assignedToCluster) {
      clusters.push({
        topic: article.title.substring(0, 50) + '...', // Use first article title as topic
        keywords: extractTopics(article),
        articles: [article],
        coverage: 1,
        heatLevel: 0,
        color: '#6B7280', // Default grey
      });
    }
  });

  return clusters;
}

/**
 * Calculate heat level based on coverage and scale
 */
export function calculateHeatLevel(
  coverage: number,
  scale: 'local' | 'regional' | 'national' | 'international'
): number {
  const config = HEAT_CONFIGS[scale];

  if (coverage <= config.coldThreshold) {
    // Cold: 0-20
    return (coverage / config.coldThreshold) * 20;
  } else if (coverage <= config.warmThreshold) {
    // Warm: 20-60
    const range = config.warmThreshold - config.coldThreshold;
    const position = coverage - config.coldThreshold;
    return 20 + (position / range) * 40;
  } else if (coverage <= config.hotThreshold) {
    // Hot: 60-90
    const range = config.hotThreshold - config.warmThreshold;
    const position = coverage - config.warmThreshold;
    return 60 + (position / range) * 30;
  } else {
    // Very hot: 90-100
    return Math.min(100, 90 + (coverage - config.hotThreshold) / 10);
  }
}

/**
 * Convert heat level to color (grey → yellow → orange → red)
 */
export function heatLevelToColor(heatLevel: number): string {
  if (heatLevel <= 20) {
    // Grey (cold)
    const intensity = Math.floor(100 + (heatLevel / 20) * 55); // 100-155
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  } else if (heatLevel <= 40) {
    // Grey to Yellow
    const t = (heatLevel - 20) / 20; // 0-1
    const r = Math.floor(155 + t * 100); // 155-255
    const g = Math.floor(155 + t * 100); // 155-255
    const b = Math.floor(155 - t * 155); // 155-0
    return `rgb(${r}, ${g}, ${b})`;
  } else if (heatLevel <= 60) {
    // Yellow to Orange
    const t = (heatLevel - 40) / 20; // 0-1
    const r = 255;
    const g = Math.floor(255 - t * 90); // 255-165
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else if (heatLevel <= 80) {
    // Orange to Red
    const t = (heatLevel - 60) / 20; // 0-1
    const r = 255;
    const g = Math.floor(165 - t * 165); // 165-0
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Red (very hot)
    const t = (heatLevel - 80) / 20; // 0-1
    const r = 255;
    const g = 0;
    const b = Math.floor(t * 50); // 0-50 (slight glow)
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Analyze articles and create heat-mapped clusters
 */
export function analyzeArticleHeat(
  articles: NewsArticle[],
  scale: 'local' | 'regional' | 'national' | 'international'
): TopicCluster[] {
  // Cluster by topic
  const clusters = clusterArticlesByTopic(articles);

  // Calculate heat for each cluster
  clusters.forEach(cluster => {
    // Count unique sources
    const uniqueSources = new Set(
      cluster.articles.map(a => a.source.name)
    ).size;

    cluster.coverage = uniqueSources;
    cluster.heatLevel = calculateHeatLevel(uniqueSources, scale);
    cluster.color = heatLevelToColor(cluster.heatLevel);

    // Update topic to be more representative
    if (cluster.articles.length > 1) {
      // Find most common keywords
      const keywordCounts = new Map<string, number>();

      cluster.articles.forEach(article => {
        const topics = extractTopics(article);
        topics.forEach(topic => {
          keywordCounts.set(topic, (keywordCounts.get(topic) || 0) + 1);
        });
      });

      // Get top 3 keywords
      const topKeywords = Array.from(keywordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword]) => keyword);

      cluster.keywords = topKeywords;
      cluster.topic = topKeywords.join(', ');
    }
  });

  // Sort by heat level (hottest first)
  return clusters.sort((a, b) => b.heatLevel - a.heatLevel);
}

/**
 * Get color for individual article based on its cluster
 */
export function getArticleColor(
  article: NewsArticle,
  clusters: TopicCluster[]
): string {
  for (const cluster of clusters) {
    if (cluster.articles.some(a => a.id === article.id)) {
      return cluster.color;
    }
  }

  return '#6B7280'; // Default grey
}

