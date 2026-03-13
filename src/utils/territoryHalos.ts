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
