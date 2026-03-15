import type { NewsArticle } from '@/types/news';

// --- Country heat aggregation ---

export interface CountryHeatEntry {
  heat: number;
  color: string;
}

export function aggregateCountryHeat(
  articles: NewsArticle[]
): Map<string, CountryHeatEntry> {
  const map = new Map<string, CountryHeatEntry>();

  for (const article of articles) {
    if (!article.country || article.heatLevel == null) continue;

    const existing = map.get(article.country);
    if (!existing || article.heatLevel > existing.heat) {
      map.set(article.country, {
        heat: article.heatLevel,
        color: article.color || '#94A3B8',
      });
    }
  }

  return map;
}

export function heatToFillOpacity(heat: number): number {
  if (heat <= 20) return 0.05;
  if (heat <= 50) return 0.12;
  if (heat <= 80) return 0.2;
  return 0.3;
}

// --- Audience scale mapping ---

const AUDIENCE_RADIUS_KM: Record<string, number> = {
  small: 50,
  medium: 150,
  large: 400,
};

const DEFAULT_RADIUS_KM = 80;

export function audienceScaleToRadiusKm(
  scale: 'small' | 'medium' | 'large' | undefined
): number {
  if (!scale) return DEFAULT_RADIUS_KM;
  return AUDIENCE_RADIUS_KM[scale] ?? DEFAULT_RADIUS_KM;
}

// --- Radial blob polygon generation ---

interface BlobFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: Record<string, unknown>;
}

const BLOB_POINTS = 8;
const KM_PER_DEGREE_LAT = 111.32;

export function generateBlobPolygon(
  lat: number,
  lng: number,
  radiusKm: number
): BlobFeature {
  const latOffset = radiusKm / KM_PER_DEGREE_LAT;
  const lngOffset = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  const coords: [number, number][] = [];
  for (let i = 0; i < BLOB_POINTS; i++) {
    const angle = (2 * Math.PI * i) / BLOB_POINTS;
    coords.push([
      lng + lngOffset * Math.cos(angle),
      lat + latOffset * Math.sin(angle),
    ]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

// --- Altitude crossfade ---
// Country polygons always visible. Blobs fade in only at high altitude
// where overlap is minimal. Below 2500km (regional/local), blobs hidden
// to prevent indecipherable yellow mass from 100+ overlapping articles.

const CROSSFADE_LOW = 2500;
const CROSSFADE_HIGH = 5000;

export function crossfadeOpacity(altitudeKm: number): {
  country: number;
  blob: number;
} {
  if (altitudeKm >= CROSSFADE_HIGH) return { country: 1, blob: 1 };
  if (altitudeKm <= CROSSFADE_LOW) return { country: 1, blob: 0 };

  const t = (altitudeKm - CROSSFADE_LOW) / (CROSSFADE_HIGH - CROSSFADE_LOW);
  return { country: 1, blob: t };
}
