// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseRssFeed, buildFeedUrl } from '@/utils/feedParser';
import type { SourceFeed } from '@/types/sourceFeed';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFeed(overrides: Partial<SourceFeed> = {}): SourceFeed {
  return {
    id: 'test-feed',
    createdAt: Date.now(),
    label: 'Test Feed',
    url: 'https://example.com/feed.xml',
    type: 'rss',
    tags: [],
    maxItems: 10,
    active: true,
    ...overrides,
  };
}

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Channel</title>
    <link>https://example.com</link>
    <item>
      <title>First story headline</title>
      <link>https://example.com/story/1</link>
      <description>A brief description of the first story.</description>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second story headline</title>
      <link>https://example.com/story/2</link>
      <pubDate>Mon, 01 Jan 2024 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Channel</title>
  <link href="https://atom.example.com" rel="alternate"/>
  <entry>
    <title>Atom entry one</title>
    <link href="https://atom.example.com/entry/1"/>
    <content type="html">Entry content here</content>
    <published>2024-03-15T12:00:00Z</published>
  </entry>
  <entry>
    <title>Atom entry two</title>
    <link href="https://atom.example.com/entry/2"/>
    <published>2024-03-15T11:00:00Z</published>
  </entry>
</feed>`;

const INVALID_XML = `this is not xml at all <<<`;

// ── parseRssFeed ──────────────────────────────────────────────────────────────

describe('parseRssFeed — RSS 2.0', () => {
  it('parses items from RSS feed', () => {
    const feed = makeFeed();
    const articles = parseRssFeed(RSS_XML, feed);
    expect(articles).toHaveLength(2);
  });

  it('maps title correctly', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(articles[0].title).toBe('First story headline');
  });

  it('maps url from <link>', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(articles[0].url).toBe('https://example.com/story/1');
  });

  it('parses pubDate as ISO string', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(new Date(articles[0].publishedAt).getFullYear()).toBe(2024);
  });

  it('maps source.name from channel title', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(articles[0].source.name).toBe('Test Channel');
  });

  it('strips HTML from description', () => {
    const xml = RSS_XML.replace('A brief description of the first story.', '<p>HTML <b>content</b></p>');
    const articles = parseRssFeed(xml, makeFeed());
    expect(articles[0].description).not.toContain('<p>');
    expect(articles[0].description).toContain('HTML');
  });

  it('sets sourceType to primary_source', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(articles[0].sourceType).toBe('primary_source');
  });

  it('attaches feedId from feed config', () => {
    const feed = makeFeed({ id: 'my-feed-123' });
    const articles = parseRssFeed(RSS_XML, feed);
    expect(articles[0].feedId).toBe('my-feed-123');
  });

  it('applies feed tags as secondaryTopics', () => {
    const feed = makeFeed({ tags: ['conflict', 'middle-east'] });
    const articles = parseRssFeed(RSS_XML, feed);
    expect(articles[0].secondaryTopics).toEqual(['conflict', 'middle-east']);
  });

  it('applies feed country and language', () => {
    const feed = makeFeed({ country: 'IR', language: 'fa' });
    const articles = parseRssFeed(RSS_XML, feed);
    expect(articles[0].country).toBe('IR');
    expect(articles[0].language).toBe('fa');
  });

  it('respects maxItems cap', () => {
    const feed = makeFeed({ maxItems: 1 });
    const articles = parseRssFeed(RSS_XML, feed);
    expect(articles).toHaveLength(1);
  });

  it('produces stable unique IDs for same item', () => {
    const feed = makeFeed();
    const a1 = parseRssFeed(RSS_XML, feed);
    const a2 = parseRssFeed(RSS_XML, feed);
    expect(a1[0].id).toBe(a2[0].id);
  });

  it('produces different IDs for different items', () => {
    const articles = parseRssFeed(RSS_XML, makeFeed());
    expect(articles[0].id).not.toBe(articles[1].id);
  });
});

describe('parseRssFeed — Atom', () => {
  it('parses entries from Atom feed', () => {
    const articles = parseRssFeed(ATOM_XML, makeFeed());
    expect(articles).toHaveLength(2);
  });

  it('maps title from Atom entry', () => {
    const articles = parseRssFeed(ATOM_XML, makeFeed());
    expect(articles[0].title).toBe('Atom entry one');
  });

  it('maps url from <link href>', () => {
    const articles = parseRssFeed(ATOM_XML, makeFeed());
    expect(articles[0].url).toBe('https://atom.example.com/entry/1');
  });

  it('parses published date', () => {
    const articles = parseRssFeed(ATOM_XML, makeFeed());
    expect(articles[0].publishedAt).toBe('2024-03-15T12:00:00.000Z');
  });

  it('sets sourceType to primary_source', () => {
    const articles = parseRssFeed(ATOM_XML, makeFeed());
    expect(articles[0].sourceType).toBe('primary_source');
  });
});

describe('parseRssFeed — error handling', () => {
  it('returns empty array for invalid XML', () => {
    expect(parseRssFeed(INVALID_XML, makeFeed())).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseRssFeed('', makeFeed())).toEqual([]);
  });

  it('skips items with no title or link', () => {
    const xml = `<rss version="2.0"><channel><title>T</title>
      <item><description>no title or link</description></item>
    </channel></rss>`;
    expect(parseRssFeed(xml, makeFeed())).toHaveLength(0);
  });
});

// ── buildFeedUrl ──────────────────────────────────────────────────────────────

describe('buildFeedUrl', () => {
  it('builds Telegram RSSHub URL', () => {
    const url = buildFeedUrl('telegram', 'hezbollah');
    expect(url).toBe('https://rsshub.app/telegram/channel/hezbollah');
  });

  it('strips leading @ from Telegram handle', () => {
    const url = buildFeedUrl('telegram', '@TASS_agency');
    expect(url).toBe('https://rsshub.app/telegram/channel/TASS_agency');
  });

  it('builds Facebook RSSHub URL', () => {
    expect(buildFeedUrl('facebook', 'guardiannews')).toBe('https://rsshub.app/facebook/page/guardiannews');
  });

  it('builds YouTube RSSHub URL', () => {
    expect(buildFeedUrl('youtube', 'UCxxxxx')).toBe('https://rsshub.app/youtube/channel/UCxxxxx');
  });

  it('builds Reddit RSS URL', () => {
    expect(buildFeedUrl('reddit', 'worldnews')).toBe('https://www.reddit.com/r/worldnews/.rss');
  });

  it('strips leading r/ from subreddit', () => {
    expect(buildFeedUrl('reddit', 'r/france')).toBe('https://www.reddit.com/r/france/.rss');
  });

  it('returns raw URL for rss type', () => {
    const url = 'https://feeds.bbci.co.uk/news/rss.xml';
    expect(buildFeedUrl('rss', url)).toBe(url);
  });

  it('returns raw URL for custom type', () => {
    const url = 'https://custom.example.com/atom.xml';
    expect(buildFeedUrl('custom', url)).toBe(url);
  });

  it('uses custom RSSHub base URL', () => {
    const url = buildFeedUrl('telegram', 'channel_name', 'https://my-rsshub.vercel.app');
    expect(url).toBe('https://my-rsshub.vercel.app/telegram/channel/channel_name');
  });
});
