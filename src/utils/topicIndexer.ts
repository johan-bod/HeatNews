import type { Topic } from '@/data/keywords/taxonomy';
import { API_CATEGORY_MAP } from '@/data/keywords/taxonomy';
import { COMMON_KEYWORDS } from '@/data/keywords/common';
import { FR_KEYWORDS } from '@/data/keywords/fr';
import { EN_KEYWORDS } from '@/data/keywords/en';
import { DE_KEYWORDS } from '@/data/keywords/de';
import { ES_KEYWORDS } from '@/data/keywords/es';
import { IT_KEYWORDS } from '@/data/keywords/it';
import { findOutletBySourceId } from './mediaLookup';
import type { NewsArticle } from '@/types/news';

export interface TopicResult {
  primary: Topic | null;
  secondary: Topic[];
  scores: Record<string, number>;
}

const LANGUAGE_DICTIONARIES: Record<string, Record<string, Topic>> = {
  fr: FR_KEYWORDS,
  en: EN_KEYWORDS,
  de: DE_KEYWORDS,
  es: ES_KEYWORDS,
  it: IT_KEYWORDS,
};

const SCORE_THRESHOLD = 1.5;

/**
 * Score article topics using 3-layer approach:
 * Layer 1: keyword dictionary matching (weight: 2)
 * Layer 2: source outlet bias (weight: 1.5)
 * Layer 3: API category (weight: 1)
 */
export function indexArticleTopics(
  article: NewsArticle,
  language: string
): TopicResult {
  const scores: Record<string, number> = {};
  const text = `${article.title} ${article.description || ''}`.toLowerCase();

  // Layer 1: Keyword matching
  const langDict = LANGUAGE_DICTIONARIES[language] || {};
  const allKeywords = { ...COMMON_KEYWORDS, ...langDict };

  for (const [keyword, topic] of Object.entries(allKeywords)) {
    if (text.includes(keyword)) {
      scores[topic] = (scores[topic] || 0) + 2;
    }
  }

  // Layer 2: Source bias
  const outlet = findOutletBySourceId(article.source.name);
  if (outlet) {
    for (const topic of outlet.primaryTopics) {
      scores[topic] = (scores[topic] || 0) + 1.5;
    }
  }

  // Layer 3: API category
  if (article.category) {
    const mappedTopic = API_CATEGORY_MAP[article.category.toLowerCase()];
    if (mappedTopic) {
      scores[mappedTopic] = (scores[mappedTopic] || 0) + 1;
    }
  }

  // Determine primary and secondary
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const primary = sorted.length > 0 && sorted[0][1] >= SCORE_THRESHOLD
    ? sorted[0][0] as Topic
    : null;

  const secondary = sorted
    .slice(primary ? 1 : 0)
    .filter(([, score]) => score >= SCORE_THRESHOLD)
    .map(([topic]) => topic as Topic);

  return { primary, secondary, scores };
}
