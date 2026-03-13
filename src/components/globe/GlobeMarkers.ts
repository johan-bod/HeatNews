import type { NewsArticle } from '@/types/news';
import { getMarkerSize, getMarkerColor } from '@/utils/globeUtils';

export interface GlobeMarkerData {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  opacity: number;
  heatLevel: number;
  article: NewsArticle;
  label: string;
}

/**
 * Convert filtered articles into globe marker data points.
 * Each article with coordinates becomes one marker.
 */
export function articlesToMarkers(
  articles: NewsArticle[],
  searchResultIds?: Set<string> | null
): GlobeMarkerData[] {
  return articles
    .filter(a => a.coordinates)
    .map(a => ({
      id: a.id,
      lat: a.coordinates!.lat,
      lng: a.coordinates!.lng,
      size: getMarkerSize(a.heatLevel || 0),
      color: getMarkerColor(a.heatLevel || 0),
      opacity: searchResultIds ? (searchResultIds.has(a.id) ? 1.0 : 0.1) : 1.0,
      heatLevel: a.heatLevel || 0,
      article: a,
      label: a.title,
    }));
}
