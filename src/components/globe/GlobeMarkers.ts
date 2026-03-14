import type { NewsArticle } from '@/types/news';
import { getMarkerSize, getMarkerColor, clusterMarkers } from '@/utils/globeUtils';
import type { ClusteredMarker } from '@/utils/globeUtils';

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
  isCluster?: boolean;
  clusterCount?: number;
  clusterArticles?: NewsArticle[];
}

/**
 * Convert filtered articles into globe marker data points.
 * Each article with coordinates becomes one marker.
 * When altitudeKm < 3000, applies spatial clustering to reduce clutter.
 */
export function articlesToMarkers(
  articles: NewsArticle[],
  searchResultIds?: Set<string> | null,
  altitudeKm?: number
): GlobeMarkerData[] {
  const shouldCluster = altitudeKm !== undefined && altitudeKm < 3000;

  if (!shouldCluster) {
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

  const { singles, clusters } = clusterMarkers(articles);

  const singleMarkers: GlobeMarkerData[] = singles
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

  const clusterMarkerData: GlobeMarkerData[] = clusters.map((c: ClusteredMarker, i: number) => ({
    id: `cluster-${i}`,
    lat: c.lat,
    lng: c.lng,
    size: Math.min(1.5, 0.4 + c.count * 0.1),
    color: c.color,
    opacity: 1.0,
    heatLevel: c.maxHeatLevel,
    article: c.articles[0],
    label: `${c.count} stories`,
    isCluster: true,
    clusterCount: c.count,
    clusterArticles: c.articles,
  }));

  return [...singleMarkers, ...clusterMarkerData];
}
