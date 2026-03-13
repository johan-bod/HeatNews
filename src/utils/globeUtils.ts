import type { NewsArticle } from '@/types/news';

type ArticleScale = 'local' | 'regional' | 'national' | 'international';

/**
 * Zoom-level thresholds from spec:
 * > 8000km: international only
 * 3000-8000km: national + international
 * 800-3000km: regional + national + international
 * < 800km: all scales
 */
export function altitudeToScale(altitudeKm: number): ArticleScale {
  if (altitudeKm > 8000) return 'international';
  if (altitudeKm > 3000) return 'national';
  if (altitudeKm > 800) return 'regional';
  return 'local';
}

const SCALE_VISIBILITY: Record<ArticleScale, ArticleScale[]> = {
  international: ['international'],
  national: ['national', 'international'],
  regional: ['regional', 'national', 'international'],
  local: ['local', 'regional', 'national', 'international'],
};

/**
 * Filter articles visible at a given altitude.
 * Caps at maxMarkers, keeping highest-heat articles.
 */
export function filterArticlesByAltitude(
  articles: NewsArticle[],
  altitudeKm: number,
  maxMarkers: number = 200
): NewsArticle[] {
  const scale = altitudeToScale(altitudeKm);
  const visibleScales = SCALE_VISIBILITY[scale];

  const filtered = articles
    .filter(a => a.scale && visibleScales.includes(a.scale) && a.coordinates)
    .sort((a, b) => (b.heatLevel || 0) - (a.heatLevel || 0));

  return filtered.slice(0, maxMarkers);
}

/**
 * Marker size based on heat level.
 * Spec visual mapping:
 * 0-20: small (cold)
 * 21-40: small (warming)
 * 41-60: medium (warm)
 * 61-80: large (hot)
 * 81-100: large (very hot)
 */
export function getMarkerSize(heatLevel: number): number {
  if (heatLevel <= 20) return 0.2;
  if (heatLevel <= 40) return 0.3;
  if (heatLevel <= 60) return 0.5;
  if (heatLevel <= 80) return 0.8;
  return 1.0;
}

/**
 * Marker color matching spec visual mapping.
 * Same as heatLevelToColor in topicClustering.ts but kept
 * here for globe-specific independence.
 */
export function getMarkerColor(heatLevel: number): string {
  if (heatLevel <= 20) return '#94A3B8'; // grey (cold)
  if (heatLevel <= 40) return '#F59E0B'; // amber (warming)
  if (heatLevel <= 60) return '#F97316'; // orange (warm)
  if (heatLevel <= 80) return '#EA580C'; // orange-red (hot)
  return '#DC2626'; // red with pulse (very hot)
}

/**
 * Check if WebGL is available in the browser.
 */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Max visible markers based on screen width.
 * Spec: < 768px → 100, otherwise → 200.
 */
export function getMaxMarkers(screenWidth: number): number {
  return screenWidth < 768 ? 100 : 200;
}

export function computeResultsCentroid(
  articles: NewsArticle[]
): { lat: number; lng: number } | null {
  const withCoords = articles.filter(a => a.coordinates);
  if (withCoords.length === 0) return null;

  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;

  for (const a of withCoords) {
    const weight = Math.max(1, a.heatLevel || 1);
    weightedLat += a.coordinates!.lat * weight;
    weightedLng += a.coordinates!.lng * weight;
    totalWeight += weight;
  }

  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
  };
}

export function computeFlyToAltitude(articles: NewsArticle[]): number {
  const withCoords = articles.filter(a => a.coordinates);
  if (withCoords.length <= 1) return 0.3;

  const lats = withCoords.map(a => a.coordinates!.lat);
  const lngs = withCoords.map(a => a.coordinates!.lng);

  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const maxSpread = Math.max(latSpread, lngSpread);

  return Math.max(0.3, Math.min(2.5, maxSpread / 40));
}
