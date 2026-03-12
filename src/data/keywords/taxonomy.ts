export const TOPICS = [
  'politics', 'economy', 'technology', 'climate', 'sports',
  'health', 'education', 'culture', 'crime', 'energy',
  'transport', 'housing', 'agriculture', 'defense', 'immigration',
  'science', 'entertainment', 'finance', 'labor', 'environment',
  'diplomacy', 'religion', 'social', 'media', 'legal',
] as const;

export type Topic = typeof TOPICS[number];

/**
 * Map NewsData.io API categories to our topic taxonomy.
 * NewsData categories: business, entertainment, environment, food, health,
 * politics, science, sports, technology, top, tourism, world
 */
export const API_CATEGORY_MAP: Record<string, Topic> = {
  business: 'economy',
  entertainment: 'entertainment',
  environment: 'environment',
  food: 'culture',
  health: 'health',
  politics: 'politics',
  science: 'science',
  sports: 'sports',
  technology: 'technology',
  top: 'politics',
  tourism: 'culture',
  world: 'diplomacy',
};
