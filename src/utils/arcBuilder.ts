import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from './topicClustering';

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

export function hexToRgbaArc(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

function coordKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

export function countDistinctLocations(cluster: StoryCluster): number {
  const seen = new Set<string>();
  for (const article of cluster.articles) {
    if (!article.coordinates) continue;
    seen.add(coordKey(article.coordinates.lat, article.coordinates.lng));
  }
  return seen.size;
}

export function buildClusterArcs(
  cluster: StoryCluster,
  currentArticle: NewsArticle
): ArcData[] {
  if (!currentArticle.coordinates) return [];

  const startLat = currentArticle.coordinates.lat;
  const startLng = currentArticle.coordinates.lng;
  const currentKey = coordKey(startLat, startLng);
  const color = hexToRgbaArc(currentArticle.color || '#94A3B8', 0.6);

  const seenKeys = new Set<string>([currentKey]);
  const arcs: ArcData[] = [];

  for (const article of cluster.articles) {
    if (article.id === currentArticle.id) continue;
    if (!article.coordinates) continue;

    const key = coordKey(article.coordinates.lat, article.coordinates.lng);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    arcs.push({
      startLat,
      startLng,
      endLat: article.coordinates.lat,
      endLng: article.coordinates.lng,
      color,
    });
  }

  return arcs;
}
