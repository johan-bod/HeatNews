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
 * Marker size — altitude-proportional so dots look consistent in pixel
 * size regardless of zoom level.
 *
 * globe.gl pointRadius is in arc-degrees. A fixed degree value looks
 * physically larger as you zoom in, so we scale radius linearly with
 * altitude: radius = heatFactor × (altitudeKm / 6371) × K
 *
 * K = 0.9 gives:
 *   close zoom  (alt 0.3 / 1913 km) → hot: 0.27°, cold: 0.11°
 *   national    (alt 0.8 / 5097 km) → hot: 0.72°, cold: 0.29°
 *   continental (alt 2.0 /12742 km) → hot: 1.80°, cold: 0.72°
 *
 * 3 visual tiers:
 *   cold   (≤ 30)  → 0.40 × altitude
 *   medium (31–65) → 0.65 × altitude
 *   hot    (> 65)  → 1.00 × altitude
 */
export function getMarkerSize(heatLevel: number, altitudeKm?: number): number {
  const heatFactor = heatLevel <= 30 ? 0.40 : heatLevel <= 65 ? 0.65 : 1.00;

  if (!altitudeKm) return heatFactor * 0.5; // safe fallback (no zoom context)

  const altFraction = altitudeKm / 6371; // = raw globe.gl altitude value
  return Math.max(0.08, Math.min(2.0, heatFactor * altFraction * 0.9));
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
