import type { NewsArticle } from '@/types/news';

export interface Coordinates {
  lat: number;
  lng: number;
}

const LOCATION_DATABASE: Record<string, Coordinates> = {
  // === French cities (hyperlocal) ===
  'paris': { lat: 48.8566, lng: 2.3522 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'toulouse': { lat: 43.6047, lng: 1.4442 },
  'nice': { lat: 43.7102, lng: 7.2620 },
  'bordeaux': { lat: 44.8378, lng: -0.5792 },
  'lille': { lat: 50.6292, lng: 3.0573 },
  'strasbourg': { lat: 48.5734, lng: 7.7521 },
  'nantes': { lat: 47.2184, lng: -1.5536 },
  'montpellier': { lat: 43.6108, lng: 3.8767 },
  'rennes': { lat: 48.1173, lng: -1.6778 },
  'grenoble': { lat: 45.1885, lng: 5.7245 },
  'rouen': { lat: 49.4432, lng: 1.0999 },
  'toulon': { lat: 43.1242, lng: 5.9280 },
  'clermont-ferrand': { lat: 45.7772, lng: 3.0870 },
  'dijon': { lat: 47.3220, lng: 5.0415 },

  // === French regions ===
  'bretagne': { lat: 48.2020, lng: -2.9326 },
  'provence': { lat: 43.5298, lng: 5.4474 },
  'normandie': { lat: 48.8799, lng: 0.1713 },
  'auvergne-rhône-alpes': { lat: 45.4432, lng: 4.3872 },
  'nouvelle-aquitaine': { lat: 44.8378, lng: -0.5792 },
  'occitanie': { lat: 43.6047, lng: 1.4442 },
  'île-de-france': { lat: 48.8499, lng: 2.6370 },
  'hauts-de-france': { lat: 49.8941, lng: 2.2958 },
  'grand est': { lat: 48.5734, lng: 7.7521 },
  'pays de la loire': { lat: 47.4784, lng: -0.5632 },
  'bourgogne-franche-comté': { lat: 47.2805, lng: 5.9993 },
  'centre-val de loire': { lat: 47.3941, lng: 1.6940 },
  'corse': { lat: 42.0396, lng: 9.0129 },
  'alsace': { lat: 48.3182, lng: 7.4416 },

  // === European cities ===
  'london': { lat: 51.5074, lng: -0.1278 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'brussels': { lat: 50.8503, lng: 4.3517 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'geneva': { lat: 46.2044, lng: 6.1432 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'munich': { lat: 48.1351, lng: 11.5820 },
  'milan': { lat: 45.4642, lng: 9.1900 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'leeds': { lat: 53.8008, lng: -1.5491 },

  // === Major world cities ===
  'new york': { lat: 40.7128, lng: -74.0060 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'moscow': { lat: 55.7558, lng: 37.6173 },

  // === Countries (capital coordinates) ===
  'france': { lat: 48.8566, lng: 2.3522 },
  'germany': { lat: 52.5200, lng: 13.4050 },
  'uk': { lat: 51.5074, lng: -0.1278 },
  'united kingdom': { lat: 51.5074, lng: -0.1278 },
  'italy': { lat: 41.9028, lng: 12.4964 },
  'spain': { lat: 40.4168, lng: -3.7038 },
  'netherlands': { lat: 52.3676, lng: 4.9041 },
  'belgium': { lat: 50.8503, lng: 4.3517 },
  'switzerland': { lat: 46.9480, lng: 7.4474 },
  'usa': { lat: 38.9072, lng: -77.0369 },
  'united states': { lat: 38.9072, lng: -77.0369 },
  'canada': { lat: 45.4215, lng: -75.6972 },
  'australia': { lat: -33.8688, lng: 151.2093 },
  'brazil': { lat: -15.8267, lng: -47.9218 },
  'china': { lat: 39.9042, lng: 116.4074 },
  'japan': { lat: 35.6762, lng: 139.6503 },
  'india': { lat: 28.7041, lng: 77.1025 },
  'russia': { lat: 55.7558, lng: 37.6173 },
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
  'sweden': { lat: 59.3293, lng: 18.0686 },
  'norway': { lat: 59.9139, lng: 10.7522 },
  'denmark': { lat: 55.6761, lng: 12.5683 },
  'finland': { lat: 60.1699, lng: 24.9384 },
  'ireland': { lat: 53.3498, lng: -6.2603 },
  'portugal': { lat: 38.7223, lng: -9.1393 },
  'greece': { lat: 37.9838, lng: 23.7275 },
  'austria': { lat: 48.2082, lng: 16.3738 },
};

// Pre-sort locations by name length (longest first) for matching priority
const SORTED_LOCATION_KEYS = Object.keys(LOCATION_DATABASE)
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

  // Search in title and description (longest names checked first)
  for (const location of SORTED_LOCATION_KEYS) {
    if (text.includes(location)) {
      return location;
    }
  }

  return null;
}

export function getCoordinates(location: string): Coordinates | null {
  return LOCATION_DATABASE[location.toLowerCase().trim()] || null;
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
    };
  }

  return article;
}

export function geocodeArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.map(geocodeArticle);
}
