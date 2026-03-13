import type { CredibilityTier } from './media-types';

/**
 * Editorial overrides for source credibility, keyed by domain.
 * Overrides take priority over the outlet registry's credibilityTier.
 *
 * Workflow: spot a problematic source → add its domain here → commit.
 * Git history tracks every editorial decision.
 */
export const CREDIBILITY_OVERRIDES: Record<string, CredibilityTier> = {
  // Wire services not yet in the outlet registry
  'efe.com': 'reference',
  'ansa.it': 'reference',
  'dpa.com': 'reference',
  // Test/example overrides
  'fake-news-site.com': 'unreliable',
};
