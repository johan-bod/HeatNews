import type { NewsArticle } from '@/types/news';

export interface Coordinates {
  lat: number;
  lng: number;
}

// Common locations database for quick lookup
const LOCATION_DATABASE: Record<string, Coordinates> = {
  // Major world cities
  'london': { lat: 51.5074, lng: -0.1278 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'moscow': { lat: 55.7558, lng: 37.6173 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'leeds': { lat: 53.8008, lng: -1.5491 },

  // Countries (using capital cities)
  'uk': { lat: 51.5074, lng: -0.1278 },
  'united kingdom': { lat: 51.5074, lng: -0.1278 },
  'usa': { lat: 38.9072, lng: -77.0369 },
  'united states': { lat: 38.9072, lng: -77.0369 },
  'france': { lat: 48.8566, lng: 2.3522 },
  'germany': { lat: 52.5200, lng: 13.4050 },
  'spain': { lat: 40.4168, lng: -3.7038 },
  'italy': { lat: 41.9028, lng: 12.4964 },
  'china': { lat: 39.9042, lng: 116.4074 },
  'russia': { lat: 55.7558, lng: 37.6173 },
  'japan': { lat: 35.6762, lng: 139.6503 },
  'india': { lat: 28.7041, lng: 77.1025 },
  'australia': { lat: -33.8688, lng: 151.2093 },
  'canada': { lat: 45.4215, lng: -75.6972 },
  'brazil': { lat: -15.8267, lng: -47.9218 },
  'mexico': { lat: 19.4326, lng: -99.1332 },
  'argentina': { lat: -34.6037, lng: -58.3816 },
  'south africa': { lat: -26.2041, lng: 28.0473 },
  'egypt': { lat: 30.0444, lng: 31.2357 },
  'nigeria': { lat: 6.5244, lng: 3.3792 },
  'turkey': { lat: 41.0082, lng: 28.9784 },
  'thailand': { lat: 13.7563, lng: 100.5018 },
  'south korea': { lat: 37.5665, lng: 126.9780 },
  'israel': { lat: 31.7683, lng: 35.2137 },
  'ukraine': { lat: 50.4501, lng: 30.5234 },
  'poland': { lat: 52.2297, lng: 21.0122 },
  'netherlands': { lat: 52.3676, lng: 4.9041 },
  'belgium': { lat: 50.8503, lng: 4.3517 },
  'sweden': { lat: 59.3293, lng: 18.0686 },
  'norway': { lat: 59.9139, lng: 10.7522 },
  'denmark': { lat: 55.6761, lng: 12.5683 },
  'finland': { lat: 60.1699, lng: 24.9384 },
  'ireland': { lat: 53.3498, lng: -6.2603 },
  'portugal': { lat: 38.7223, lng: -9.1393 },
  'greece': { lat: 37.9838, lng: 23.7275 },
};

/**
 * Extract potential location from article text
 */
export function extractLocation(article: NewsArticle): string | null {
  const text = `${article.title} ${article.description || ''} ${article.category || ''}`.toLowerCase();

  // Check section/category first (Guardian sections often indicate location)
  if (article.category) {
    const category = article.category.toLowerCase();
    const knownLocations = Object.keys(LOCATION_DATABASE);

    for (const location of knownLocations) {
      if (category.includes(location)) {
        return location;
      }
    }
  }

  // Check tags
  if (article.tags) {
    for (const tag of article.tags) {
      const tagLower = tag.toLowerCase();
      const knownLocations = Object.keys(LOCATION_DATABASE);

      for (const location of knownLocations) {
        if (tagLower === location || tagLower.includes(location)) {
          return location;
        }
      }
    }
  }

  // Search in title and description
  const knownLocations = Object.keys(LOCATION_DATABASE)
    .sort((a, b) => b.length - a.length); // Check longer names first

  for (const location of knownLocations) {
    if (text.includes(location)) {
      return location;
    }
  }

  return null;
}

/**
 * Get coordinates for a location string
 */
export function getCoordinates(location: string): Coordinates | null {
  const normalized = location.toLowerCase().trim();
  return LOCATION_DATABASE[normalized] || null;
}

/**
 * Geocode an article - add location and coordinates
 */
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
    };
  }

  // Default to London (Guardian HQ) if no location found
  return {
    ...article,
    location: 'London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
  };
}

/**
 * Geocode multiple articles
 */
export function geocodeArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.map(geocodeArticle);
}

/**
 * Get bounding box for all articles
 */
export function getArticlesBounds(articles: NewsArticle[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  const articlesWithCoords = articles.filter(a => a.coordinates);

  if (articlesWithCoords.length === 0) return null;

  const lats = articlesWithCoords.map(a => a.coordinates!.lat);
  const lngs = articlesWithCoords.map(a => a.coordinates!.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}
