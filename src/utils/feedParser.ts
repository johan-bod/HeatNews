/**
 * RSS/Atom feed parser.
 * Pure functions — no side effects, no network calls.
 * Uses browser DOMParser (available in both browser and jsdom/vitest).
 */

import type { SourceFeed } from '@/types/sourceFeed';
import type { NewsArticle } from '@/types/news';

// ── Helpers ───────────────────────────────────────────────────────────────────

function text(el: Element, tag: string): string {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

function attr(el: Element, tag: string, attribute: string): string {
  return el.getElementsByTagName(tag)[0]?.getAttribute(attribute) ?? '';
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Stable article ID from feed URL + item link/guid, avoiding collisions with news IDs. */
function feedItemId(feedId: string, itemUrl: string): string {
  // Simple hash: sum of char codes, base36
  let h = 0;
  for (let i = 0; i < itemUrl.length; i++) h = (h * 31 + itemUrl.charCodeAt(i)) >>> 0;
  return `feed-${feedId}-${h.toString(36)}`;
}

// ── RSS 2.0 parser ────────────────────────────────────────────────────────────

function parseRssItems(doc: Document, feed: SourceFeed, max: number): NewsArticle[] {
  const channelTitle = text(doc.documentElement, 'title') || feed.label;
  const channelUrl   = text(doc.documentElement, 'link')  || feed.url;
  const items        = Array.from(doc.getElementsByTagName('item')).slice(0, max);

  return items.flatMap(item => {
    const link  = text(item, 'link') || attr(item, 'guid', 'isPermaLink') || text(item, 'guid');
    const title = stripHtml(text(item, 'title'));
    if (!link || !title) return [];

    const rawDesc = text(item, 'description') || text(item, 'content:encoded');
    const pubDate = text(item, 'pubDate');

    return [{
      id:          feedItemId(feed.id, link),
      title,
      description: rawDesc ? stripHtml(rawDesc).slice(0, 300) : undefined,
      url:         link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      source:      { name: channelTitle, url: channelUrl },
      language:    feed.language,
      country:     feed.country,
      secondaryTopics: feed.tags.length > 0 ? feed.tags : undefined,
      scale:       'international' as const,
      sourceType:  'primary_source' as const,
      feedId:      feed.id,
    }];
  });
}

// ── Atom parser ───────────────────────────────────────────────────────────────

function parseAtomEntries(doc: Document, feed: SourceFeed, max: number): NewsArticle[] {
  const channelTitle = text(doc.documentElement, 'title') || feed.label;
  const channelUrl   = attr(doc.documentElement, 'link', 'href') || feed.url;
  const entries      = Array.from(doc.getElementsByTagName('entry')).slice(0, max);

  return entries.flatMap(entry => {
    const link  = attr(entry, 'link', 'href') || text(entry, 'id');
    const title = stripHtml(text(entry, 'title'));
    if (!link || !title) return [];

    const rawContent = text(entry, 'content') || text(entry, 'summary');
    const published  = text(entry, 'published') || text(entry, 'updated');

    return [{
      id:          feedItemId(feed.id, link),
      title,
      description: rawContent ? stripHtml(rawContent).slice(0, 300) : undefined,
      url:         link,
      publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
      source:      { name: channelTitle, url: channelUrl },
      language:    feed.language,
      country:     feed.country,
      secondaryTopics: feed.tags.length > 0 ? feed.tags : undefined,
      scale:       'international' as const,
      sourceType:  'primary_source' as const,
      feedId:      feed.id,
    }];
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse raw RSS/Atom XML string into NewsArticle array.
 * Returns [] on parse failure (never throws).
 */
export function parseRssFeed(xml: string, feed: SourceFeed): NewsArticle[] {
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'application/xml');

    // DOMParser signals failure via a <parsererror> element
    if (doc.querySelector('parsererror')) {
      console.warn('[feedParser] XML parse error for feed:', feed.label);
      return [];
    }

    const root = doc.documentElement.tagName.toLowerCase();
    const max  = Math.max(1, Math.min(feed.maxItems, 50));

    if (root === 'feed') return parseAtomEntries(doc, feed, max);
    if (root === 'rss' || root === 'rdf:rdf') return parseRssItems(doc, feed, max);

    return [];
  } catch (err) {
    console.warn('[feedParser] Failed to parse feed:', feed.label, err);
    return [];
  }
}

/**
 * Build a RSSHub URL for common source types.
 * Returns the raw URL unchanged for type='rss' or 'custom'.
 */
export function buildFeedUrl(type: SourceFeed['type'], handle: string, rsshubBase = 'https://rsshub.app'): string {
  switch (type) {
    case 'telegram':  return `${rsshubBase}/telegram/channel/${handle.replace(/^@/, '')}`;
    case 'facebook':  return `${rsshubBase}/facebook/page/${handle}`;
    case 'youtube':   return `${rsshubBase}/youtube/channel/${handle}`;
    case 'reddit':    return `https://www.reddit.com/r/${handle.replace(/^r\//, '')}/.rss`;
    default:          return handle; // 'rss' / 'custom' — user provides full URL
  }
}
