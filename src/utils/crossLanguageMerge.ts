import type { StoryCluster } from './topicClustering';

// Words that appear capitalized in headlines but aren't proper nouns we care about
const EXCLUDED_CAPS = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
  'janvier', 'février', 'mars', 'avril', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre',
  'minister', 'president', 'premier', 'senate', 'house', 'court',
  'government', 'gouvernement', 'parliament', 'parlement',
]);

/**
 * Extract proper nouns (capitalized mid-title words and acronyms) from a headline.
 * Language-agnostic — works on both French and English.
 */
export function extractProperNouns(title: string): Set<string> {
  const words = title.split(/\s+/);
  const result = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
    if (clean.length < 3) continue;

    // Acronyms: all-caps 2+ chars (NATO, BCE, UE, EU, etc.)
    if (/^[A-ZÀ-Ü]{2,}$/.test(clean)) {
      result.add(clean.toLowerCase());
      continue;
    }

    // Capitalized word (Title Case)
    if (/^[A-ZÀ-Ü][a-zà-ÿ]{2,}$/.test(clean)) {
      const key = clean.toLowerCase();
      // Skip sentence-initial word unless it also appears mid-title
      if (i === 0) {
        const appearsLater = words
          .slice(1)
          .some(w => w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').toLowerCase() === key);
        if (!appearsLater) continue;
      }
      if (!EXCLUDED_CAPS.has(key)) {
        result.add(key);
      }
    }
  }

  return result;
}

function coordinatesClose(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  thresholdKm = 100
): boolean {
  const avgLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (a.lng - b.lng) * Math.cos(avgLat);
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy) * 111.32 <= thresholdKm;
}

function timeClose(a: string, b: string, hoursThreshold = 6): boolean {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff <= hoursThreshold * 3_600_000;
}

class UnionFind {
  private parent: number[];
  constructor(n: number) { this.parent = Array.from({ length: n }, (_, i) => i); }
  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x: number, y: number) { this.parent[this.find(x)] = this.find(y); }
}

function dominantLang(cluster: StoryCluster): string {
  const counts = new Map<string, number>();
  for (const a of cluster.articles) {
    const lang = (a.language ?? 'en').toLowerCase().slice(0, 2);
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  let best = 'en', bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) { best = lang; bestCount = count; }
  }
  return best;
}

function repCoords(cluster: StoryCluster) {
  for (const a of cluster.articles) if (a.coordinates) return a.coordinates;
  return null;
}

function newestTime(cluster: StoryCluster): string {
  return [...cluster.articles].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )[0]?.publishedAt ?? '';
}

/**
 * Pass 2 of clustering: merge clusters that cover the same story
 * in different languages (French + English), using proper noun overlap
 * + geographic + temporal proximity.
 */
export function mergeCrossLanguageClusters(clusters: StoryCluster[]): StoryCluster[] {
  if (clusters.length < 2) return clusters;

  const n = clusters.length;
  const uf = new UnionFind(n);

  // Precompute metadata for each cluster
  const meta = clusters.map(c => {
    const nouns = new Set<string>();
    for (const a of c.articles) {
      for (const noun of extractProperNouns(a.title)) nouns.add(noun);
    }
    return { lang: dominantLang(c), coords: repCoords(c), time: newestTime(c), nouns };
  });

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      // Only merge across different dominant languages
      if (meta[i].lang === meta[j].lang) continue;

      // Must share at least one proper noun
      const sharedCount = [...meta[i].nouns].filter(n => meta[j].nouns.has(n)).length;
      if (sharedCount === 0) continue;

      // Must be temporally close
      if (meta[i].time && meta[j].time && !timeClose(meta[i].time, meta[j].time, 6)) continue;

      // Coordinate check (or require 2+ nouns if coordinates are missing)
      const ci = meta[i].coords, cj = meta[j].coords;
      if (ci && cj) {
        if (!coordinatesClose(ci, cj, 100)) continue;
      } else if (sharedCount < 2) {
        continue;
      }

      uf.union(i, j);
    }
  }

  // Build merged cluster list
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    const g = groups.get(root) ?? [];
    g.push(i);
    groups.set(root, g);
  }

  const result: StoryCluster[] = [];
  for (const indices of groups.values()) {
    if (indices.length === 1) {
      result.push(clusters[indices[0]]);
      continue;
    }
    const merged: StoryCluster = {
      articles: [],
      terms: new Set(),
      uniqueSources: new Set(),
      sourceDomains: new Map(),
      heatLevel: 0,
      coverage: 0,
    };
    for (const idx of indices) {
      const c = clusters[idx];
      merged.articles.push(...c.articles);
      for (const t of c.terms) merged.terms.add(t);
      for (const s of c.uniqueSources) merged.uniqueSources.add(s);
      for (const [name, domain] of c.sourceDomains) merged.sourceDomains.set(name, domain);
    }
    result.push(merged);
  }

  return result;
}
