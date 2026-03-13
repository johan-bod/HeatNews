import type { CredibilityTier } from '@/data/media-types';
import { resolveCredibilityByDomain, TIER_WEIGHTS } from '@/utils/credibilityService';

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
