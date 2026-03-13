// src/utils/coverageGap.ts
import type { CredibilityTier } from '@/data/media-types';
import type { StoryCluster } from './topicClustering';
import { resolveCredibilityByDomain, extractDomain } from './credibilityService';

export interface CoverageGapResult {
  hasGap: boolean;
  missingTiers: CredibilityTier[];
  gapLabel: string;
  imbalanceNote: string | null;
}

const NO_GAP: CoverageGapResult = {
  hasGap: false,
  missingTiers: [],
  gapLabel: '',
  imbalanceNote: null,
};

export function analyzeCoverageGap(cluster: StoryCluster): CoverageGapResult {
  const tierCounts = new Map<CredibilityTier, number>();

  for (const article of cluster.articles) {
    const domain = extractDomain(article.source.url) ?? extractDomain(article.url);
    const { tier } = resolveCredibilityByDomain(domain);
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  const total = cluster.articles.length;
  if (total === 0) return NO_GAP;

  // Primary signal: missing top tiers
  const hasReference = (tierCounts.get('reference') || 0) > 0;
  const hasEstablished = (tierCounts.get('established') || 0) > 0;

  const missingTiers: CredibilityTier[] = [];
  let gapLabel = '';

  if (!hasReference && !hasEstablished) {
    missingTiers.push('reference', 'established');
    gapLabel = 'No wire service or national coverage';
  } else if (!hasReference) {
    missingTiers.push('reference');
    gapLabel = 'No wire service coverage';
  } else if (!hasEstablished) {
    missingTiers.push('established');
    gapLabel = 'No national outlet coverage';
  }

  // Secondary signal: imbalance
  const topCount = (tierCounts.get('reference') || 0) + (tierCounts.get('established') || 0);
  const bottomCount = (tierCounts.get('niche') || 0) + (tierCounts.get('hyperlocal') || 0);
  const topRatio = topCount / total;
  const bottomRatio = bottomCount / total;

  const imbalanceNote =
    topRatio < 0.2 && bottomRatio > 0.6
      ? 'Coverage is predominantly from independent/local sources'
      : null;

  const hasGap = missingTiers.length > 0 || imbalanceNote !== null;

  if (!hasGap) return NO_GAP;

  return { hasGap, missingTiers, gapLabel, imbalanceNote };
}
