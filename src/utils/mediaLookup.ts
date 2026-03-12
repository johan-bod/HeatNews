import { MEDIA_OUTLETS } from '@/data/media-outlets';
import type { MediaOutlet } from '@/data/media-types';

// Pre-build lookup map: domain → outlet
const domainMap = new Map<string, MediaOutlet>();
for (const outlet of MEDIA_OUTLETS) {
  domainMap.set(outlet.domain, outlet);
  // Also index without TLD for partial matching
  const base = outlet.domain.replace(/\.\w+$/, '');
  domainMap.set(base, outlet);
}

/**
 * Find media outlet by full or partial domain.
 * Handles "www.lemonde.fr" → matches "lemonde.fr"
 */
export function findOutletByDomain(domain: string): MediaOutlet | undefined {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  if (domainMap.has(normalized)) return domainMap.get(normalized);
  // Try base name
  const base = normalized.replace(/\.\w+$/, '');
  return domainMap.get(base);
}

/**
 * Find media outlet by NewsData.io source_id.
 * source_id is typically the domain base (e.g., "lemonde", "bbc").
 */
export function findOutletBySourceId(sourceId: string): MediaOutlet | undefined {
  const lower = sourceId.toLowerCase();
  // Direct match on domain base
  const found = domainMap.get(lower);
  if (found) return found;
  // Fuzzy: check if sourceId is a substring of any domain
  for (const outlet of MEDIA_OUTLETS) {
    if (outlet.domain.includes(lower) || lower.includes(outlet.domain.replace(/\.\w+$/, ''))) {
      return outlet;
    }
  }
  return undefined;
}
