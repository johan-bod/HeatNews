import type { NewsArticle } from '@/types/news';
import { getMarkerSize, getMarkerColor, getMarkerOpacity, clusterMarkers } from '@/utils/globeUtils';
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
  isPrimarySource?: boolean;
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

  function buildMarker(a: NewsArticle): GlobeMarkerData {
    const heat = a.heatLevel || 0;
    const isPrimary = a.sourceType === 'primary_source';
    const baseOpacity = isPrimary ? 1.0 : getMarkerOpacity(heat);
    return {
      id: a.id,
      lat: a.coordinates!.lat,
      lng: a.coordinates!.lng,
      size: getMarkerSize(heat, altitudeKm),
      color: isPrimary ? '#06B6D4' : getMarkerColor(heat),
      // Search dim: non-results drop to near-invisible; otherwise use heat-based opacity
      opacity: searchResultIds
        ? (searchResultIds.has(a.id) ? baseOpacity : 0.08)
        : baseOpacity,
      heatLevel: heat,
      article: a,
      label: a.title,
      isPrimarySource: isPrimary,
    };
  }

  if (!shouldCluster) {
    return articles.filter(a => a.coordinates).map(buildMarker);
  }

  const { singles, clusters } = clusterMarkers(articles);

  const singleMarkers: GlobeMarkerData[] = singles
    .filter(a => a.coordinates)
    .map(buildMarker);

  const altFraction = altitudeKm ? altitudeKm / 6371 : 0.5;
  const clusterMarkerData: GlobeMarkerData[] = clusters.map((c: ClusteredMarker, i: number) => ({
    id: `cluster-${i}`,
    lat: c.lat,
    lng: c.lng,
    size: Math.max(0.1, Math.min(2.0, (0.5 + Math.min(c.count, 10) * 0.05) * altFraction * 0.9)),
    color: c.color,
    opacity: getMarkerOpacity(c.maxHeatLevel),
    heatLevel: c.maxHeatLevel,
    article: c.articles[0],
    label: `${c.count} stories`,
    isCluster: true,
    clusterCount: c.count,
    clusterArticles: c.articles,
  }));

  return [...singleMarkers, ...clusterMarkerData];
}
