import type { CredibilityTier } from '@/data/media-types';
import type { NewsArticle } from '@/types/news';
import { CREDIBILITY_OVERRIDES } from '@/data/credibility-overrides';
import { findOutletByDomain } from '@/utils/mediaLookup';

export const TIER_WEIGHTS: Record<CredibilityTier, number> = {
  reference: 1.0,
  established: 0.9,
  regional: 0.85,
  hyperlocal: 0.5,
  niche: 0.4,
  unreliable: 0.0,
};

interface CredibilityResult {
  tier: CredibilityTier;
  weight: number;
  filtered: boolean;
}

const NICHE_FALLBACK: CredibilityResult = {
  tier: 'niche',
  weight: TIER_WEIGHTS.niche,
  filtered: false,
};

/**
 * Extract hostname from a URL string, stripping www. prefix.
 * Returns undefined if the URL is falsy or unparseable.
 */
export function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve credibility by domain string.
 * Resolution order: overrides → outlet registry → niche fallback.
 */
export function resolveCredibilityByDomain(domain: string | undefined): CredibilityResult {
  if (!domain) return NICHE_FALLBACK;

  const normalized = domain.replace(/^www\./, '').toLowerCase();

  // 1. Check editorial overrides
  const overrideTier = CREDIBILITY_OVERRIDES[normalized];
  if (overrideTier) {
    return {
      tier: overrideTier,
      weight: TIER_WEIGHTS[overrideTier],
      filtered: overrideTier === 'unreliable',
    };
  }

  // 2. Check outlet registry
  const outlet = findOutletByDomain(normalized);
  if (outlet) {
    const tier = outlet.credibilityTier ?? 'niche';
    return {
      tier,
      weight: TIER_WEIGHTS[tier],
      filtered: tier === 'unreliable',
    };
  }

  // 3. Fallback
  return NICHE_FALLBACK;
}

/**
 * Resolve credibility for a full article.
 * Extracts domain from article.source.url, falling back to article.url.
 */
export function resolveCredibility(article: NewsArticle): CredibilityResult {
  const domain = extractDomain(article.source.url) ?? extractDomain(article.url);
  return resolveCredibilityByDomain(domain);
}
