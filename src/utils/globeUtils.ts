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
 * Marker size based on heat level, scaled by current altitude.
 * globe.gl pointRadius is in arc-degrees — same angular size appears
 * physically larger the closer you zoom. Scale down at low altitudes
 * to keep dots visually consistent and prevent close-up clutter.
 *
 * altitudeKm thresholds:
 *   ≥ 2000 km (national / international) → full size
 *   1000 km (regional)                  → 0.7×
 *   500 km (local)                      → 0.5×
 *   ≤ 200 km (hyper-local)              → 0.4× (floor)
 */
export function getMarkerSize(heatLevel: number, altitudeKm?: number): number {
  let baseSize: number;
  if (heatLevel <= 20) baseSize = 0.2;
  else if (heatLevel <= 40) baseSize = 0.3;
  else if (heatLevel <= 60) baseSize = 0.5;
  else if (heatLevel <= 80) baseSize = 0.8;
  else baseSize = 1.0;

  if (!altitudeKm) return baseSize;

  // Scale factor: clamp between 0.4 (very close) and 1.0 (far)
  const scaleFactor = Math.max(0.4, Math.min(1.0, altitudeKm / 2000));
  return baseSize * scaleFactor;
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

/**
 * Spatial clustering: groups nearby markers into cluster markers.
 * Only clusters when 20+ markers in view.
 */
export interface ClusteredMarker {
  lat: number;
  lng: number;
  count: number;
  maxHeatLevel: number;
  color: string;
  articles: NewsArticle[];
}

export function clusterMarkers(
  articles: NewsArticle[],
  distanceThreshold: number = 0.5
): { singles: NewsArticle[]; clusters: ClusteredMarker[] } {
  if (articles.length < 20) {
    return { singles: articles, clusters: [] };
  }

  const used = new Set<number>();
  const clusters: ClusteredMarker[] = [];
  const singles: NewsArticle[] = [];

  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue;
    const a = articles[i];
    if (!a.coordinates) { singles.push(a); continue; }

    const group: NewsArticle[] = [a];
    used.add(i);

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(j)) continue;
      const b = articles[j];
      if (!b.coordinates) continue;

      const dLat = Math.abs(a.coordinates.lat - b.coordinates.lat);
      const dLng = Math.abs(a.coordinates.lng - b.coordinates.lng);
      if (dLat <= distanceThreshold && dLng <= distanceThreshold) {
        group.push(b);
        used.add(j);
      }
    }

    if (group.length === 1) {
      singles.push(a);
    } else {
      const maxHeat = Math.max(...group.map(g => g.heatLevel || 0));
      const avgLat = group.reduce((s, g) => s + g.coordinates!.lat, 0) / group.length;
      const avgLng = group.reduce((s, g) => s + g.coordinates!.lng, 0) / group.length;
      clusters.push({
        lat: avgLat,
        lng: avgLng,
        count: group.length,
        maxHeatLevel: maxHeat,
        color: getMarkerColor(maxHeat),
        articles: group,
      });
    }
  }

  return { singles, clusters };
}
