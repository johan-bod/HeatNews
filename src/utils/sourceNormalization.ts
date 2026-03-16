/**
 * Source organization normalization.
 *
 * Maps different channels/outlets of the same organization to a single
 * canonical ID, preventing cross-channel dissemination from artificially
 * inflating heat scores.
 *
 * Examples:
 *   tass.ru           + t.me/tass_agency  → "tass"   (same org, two channels)
 *   reuters.com       + t.me/Reuters      → "reuters"
 *   lemonde.fr        + facebook.com/lemonde → "lemonde"
 */

import { extractDomain } from '@/utils/credibilityService';

const SOCIAL_DOMAINS = new Set([
  't.me', 'telegram.me', 'telegram.org',
  'facebook.com', 'instagram.com',
  'youtube.com', 'youtu.be',
  'twitter.com', 'x.com',
  'reddit.com', 'redd.it',
  'rsshub.app',
]);

/** Language variant suffixes common in Telegram channel handles */
const LANG_SUFFIX  = /[_-](en|fr|ar|ru|de|es|zh|fa|pt|ja|ko|uk|pl|tr|he|it|nl|sv)$/i;
/** Noise words as handle suffixes */
const HANDLE_NOISE = /[_-](agency|news|media|official|channel|online|wire|live|update|world|global|bot|eng|feed|int|breaking|arabic|english|russian)$/i;
/** Noise words anywhere in an org name */
const NAME_NOISE   = /\b(agency|news|media|official|channel|online|wire|breaking|live|update|arabic|english|russian|french|international|world|global)\b/gi;

function normalizeHandle(handle: string): string {
  return handle
    .replace(LANG_SUFFIX, '')
    .replace(HANDLE_NOISE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeName(name: string): string {
  return name
    .replace(NAME_NOISE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Returns a canonical organization identifier for a news source.
 *
 * Priority order:
 * 1. Web sources  → first hostname segment  (tass.ru → "tass")
 * 2. Social/RSSHub → normalized URL handle  (t.me/tass_agency → "tass")
 * 3. Fallback      → normalized source name (strip noise words)
 */
export function normalizeOrgId(sourceName: string, sourceUrl?: string): string {
  if (sourceUrl) {
    const domain = extractDomain(sourceUrl);
    if (domain) {
      if (SOCIAL_DOMAINS.has(domain)) {
        // Social platform: the path segment IS the org handle
        try {
          const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
          const handle = parts[0];
          if (handle) {
            const normalized = normalizeHandle(handle);
            if (normalized.length >= 2) return normalized;
          }
        } catch { /* noop */ }
      } else {
        // Web source: first domain segment is the org root
        const root = domain.replace(/^www\./, '').split('.')[0];
        if (root && root.length >= 2) return root.toLowerCase();
      }
    }
  }

  // Fallback: strip noise words from source name
  const norm = normalizeName(sourceName);
  return norm.length >= 2 ? norm : sourceName.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, '');
}
