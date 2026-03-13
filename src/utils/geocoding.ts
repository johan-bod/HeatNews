import type { NewsArticle } from '@/types/news';
import { LOCATIONS } from '@/data/geocoding-locations';
import type { Coordinates } from '@/data/geocoding-locations';
import { findOutletBySourceId } from './mediaLookup';

export type { Coordinates };

const SORTED_LOCATION_KEYS = Object.keys(LOCATIONS)
  .sort((a, b) => b.length - a.length);

export function extractLocation(article: NewsArticle): string | null {
  const text = `${article.title} ${article.description || ''} ${article.category || ''}`.toLowerCase();

  // Check tags first (most specific signal)
  if (article.tags) {
    for (const tag of article.tags) {
      const tagLower = tag.toLowerCase();
      for (const location of SORTED_LOCATION_KEYS) {
        if (tagLower === location || tagLower.includes(location)) {
          return location;
        }
      }
    }
  }

  // Check category
  if (article.category) {
    const category = article.category.toLowerCase();
    for (const location of SORTED_LOCATION_KEYS) {
      if (category.includes(location)) {
        return location;
      }
    }
  }

  // Search in title and description
  for (const location of SORTED_LOCATION_KEYS) {
    if (text.includes(location)) {
      return location;
    }
  }

  // Fallback: use media outlet's primary reach area
  const outlet = findOutletBySourceId(article.source.name);
  if (outlet && outlet.reach.length > 0) {
    const primaryReach = outlet.reach[0].name.toLowerCase();
    if (LOCATIONS[primaryReach]) {
      return primaryReach;
    }
  }

  return null;
}

export function getCoordinates(location: string): Coordinates | null {
  return LOCATIONS[location.toLowerCase().trim()] || null;
}

export function geocodeArticle(article: NewsArticle): NewsArticle {
  const location = extractLocation(article);

  if (location) {
    const coordinates = getCoordinates(location);
    return {
      ...article,
      location: location.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      coordinates: coordinates || undefined,
      locationConfidence: coordinates ? 'exact' : undefined,
    };
  }

  return article;
}

export function geocodeArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.map(geocodeArticle);
}
