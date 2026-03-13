import type { CredibilityTier } from '@/data/media-types';
import { resolveCredibilityByDomain, TIER_WEIGHTS } from '@/utils/credibilityService';
import type { NewsArticle } from '@/types/news';

const TIER_LABELS: Record<CredibilityTier, string> = {
  reference: 'Reference',
  established: 'Established',
  regional: 'Regional',
  hyperlocal: 'Hyperlocal',
  niche: 'Niche',
  unreliable: 'Unreliable',
};

const TIER_COLORS: Record<CredibilityTier, string> = {
  reference: 'text-blue-400',
  established: 'text-emerald-400',
  regional: 'text-teal-400',
  hyperlocal: 'text-amber-400',
  niche: 'text-slate-400',
  unreliable: 'text-red-400',
};

const BREAKDOWN_LABELS: Record<CredibilityTier, string> = {
  reference: 'wire service',
  established: 'national',
  regional: 'regional',
  hyperlocal: 'local',
  niche: 'independent',
  unreliable: 'unreliable',
};

export function getTierLabel(tier: CredibilityTier): string {
  return TIER_LABELS[tier];
}

export function getTierColor(tier: CredibilityTier): string {
  return TIER_COLORS[tier];
}

export function getBreakdownLabel(tier: CredibilityTier, count: number): string {
  const label = BREAKDOWN_LABELS[tier];
  if (tier === 'reference' && count > 1) return label + 's';
  return label;
}

const MAX_CLUSTER_ITEMS = 5;

export interface ClusterArticleItem {
  article: NewsArticle;
  tier: CredibilityTier;
  tierLabel: string;
  tierColor: string;
}

export function getClusterArticles(
  articles: NewsArticle[],
  currentArticleId: string
): ClusterArticleItem[] {
  const others = articles.filter(a => a.id !== currentArticleId);

  const withTier = others.map(article => {
    const domain = extractDomainFromArticle(article);
    const { tier } = resolveCredibilityByDomain(domain);
    return {
      article,
      tier,
      tierLabel: getTierLabel(tier),
      tierColor: getTierColor(tier),
      weight: TIER_WEIGHTS[tier],
    };
  });

  withTier.sort((a, b) => b.weight - a.weight);

  return withTier.slice(0, MAX_CLUSTER_ITEMS).map(({ article, tier, tierLabel, tierColor }) => ({
    article,
    tier,
    tierLabel,
    tierColor,
  }));
}

export function getAllClusterArticles(
  articles: NewsArticle[]
): ClusterArticleItem[] {
  const withTier = articles.map(article => {
    const domain = extractDomainFromArticle(article);
    const { tier } = resolveCredibilityByDomain(domain);
    return {
      article,
      tier,
      tierLabel: getTierLabel(tier),
      tierColor: getTierColor(tier),
      weight: TIER_WEIGHTS[tier],
    };
  });

  withTier.sort((a, b) => b.weight - a.weight);

  return withTier.map(({ article, tier, tierLabel, tierColor }) => ({
    article,
    tier,
    tierLabel,
    tierColor,
  }));
}

function extractDomainFromArticle(article: NewsArticle): string | undefined {
  try {
    const url = article.source.url || article.url;
    if (!url) return undefined;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function buildSourceBreakdown(
  sourceDomains: Map<string, string | undefined>
): { total: number; summary: string } {
  const total = sourceDomains.size;
  if (total <= 1) return { total, summary: '' };

  const tierCounts = new Map<CredibilityTier, number>();

  for (const [, domain] of sourceDomains) {
    const { tier } = resolveCredibilityByDomain(domain);
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  // Sort tiers by weight descending
  const sortedTiers = [...tierCounts.entries()]
    .sort(([a], [b]) => TIER_WEIGHTS[b] - TIER_WEIGHTS[a]);

  const parts = sortedTiers.map(
    ([tier, count]) => `${count} ${getBreakdownLabel(tier, count)}`
  );

  return { total, summary: parts.join(', ') };
}
