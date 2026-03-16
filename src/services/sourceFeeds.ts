/**
 * Source feeds — Firestore (cross-device) + localStorage (instant load).
 * Stored at users/{uid}.sourceFeeds (nested map, compatible with existing rules).
 * Fetched articles cached separately at ht-feed-articles-{uid} with a 1h TTL.
 */

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseRssFeed } from '@/utils/feedParser';
import type { SourceFeed } from '@/types/sourceFeed';
import type { NewsArticle } from '@/types/news';

const FEED_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── CORS-aware fetch ──────────────────────────────────────────────────────────

const RSSHUB_ORIGINS = ['rsshub.app', 'rsshub.', 'rss.'];
const CORS_PROXY     = '/api/proxy?url=';

async function fetchFeedXml(url: string): Promise<string> {
  // RSSHub and Reddit serve with CORS headers — fetch directly
  const direct = RSSHUB_ORIGINS.some(o => url.includes(o)) || url.includes('reddit.com');
  const target = direct ? url : `${CORS_PROXY}${encodeURIComponent(url)}`;
  const res    = await fetch(target, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_FEEDS    = (uid: string) => `ht-source-feeds-${uid}`;
const LS_ARTICLES = (uid: string) => `ht-feed-articles-${uid}`;

function lsGet<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : null; }
  catch { return null; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ── Feed CRUD ─────────────────────────────────────────────────────────────────

export function getLocalFeeds(uid: string): SourceFeed[] {
  return lsGet<SourceFeed[]>(LS_FEEDS(uid)) ?? [];
}

export async function loadSourceFeeds(uid: string): Promise<SourceFeed[]> {
  if (!db) return getLocalFeeds(uid);
  try {
    const snap  = await getDoc(doc(db, 'users', uid));
    const map   = snap.data()?.sourceFeeds as Record<string, SourceFeed> | undefined;
    const feeds = map ? Object.values(map) : [];
    lsSet(LS_FEEDS(uid), feeds);
    return feeds;
  } catch {
    return getLocalFeeds(uid);
  }
}

export async function saveSourceFeed(uid: string, feed: SourceFeed): Promise<void> {
  const current = getLocalFeeds(uid);
  lsSet(LS_FEEDS(uid), [...current.filter(f => f.id !== feed.id), feed]);
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid), { sourceFeeds: { [feed.id]: feed } }, { merge: true });
  } catch { /* noop */ }
}

export async function removeSourceFeed(uid: string, feedId: string): Promise<void> {
  lsSet(LS_FEEDS(uid), getLocalFeeds(uid).filter(f => f.id !== feedId));
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { [`sourceFeeds.${feedId}`]: deleteField() });
  } catch { /* noop */ }
}

// ── Article cache ─────────────────────────────────────────────────────────────

interface ArticleCache {
  fetchedAt: number;
  articles: NewsArticle[];
}

export function getCachedFeedArticles(uid: string): NewsArticle[] {
  const cached = lsGet<ArticleCache>(LS_ARTICLES(uid));
  if (!cached) return [];
  if (Date.now() - cached.fetchedAt > FEED_CACHE_TTL_MS) return [];
  return cached.articles;
}

function setCachedFeedArticles(uid: string, articles: NewsArticle[]) {
  lsSet(LS_ARTICLES(uid), { fetchedAt: Date.now(), articles });
}

// ── Fetch + normalise ─────────────────────────────────────────────────────────

interface FetchResult {
  feedId: string;
  articles: NewsArticle[];
  error?: string;
}

export async function fetchOneFeed(feed: SourceFeed): Promise<FetchResult> {
  try {
    const xml      = await fetchFeedXml(feed.url);
    const articles = parseRssFeed(xml, feed);
    return { feedId: feed.id, articles };
  } catch (err) {
    return { feedId: feed.id, articles: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch all active feeds, merge results, update cache.
 * Returns the full merged article list.
 */
export async function fetchAllFeeds(uid: string, feeds: SourceFeed[]): Promise<NewsArticle[]> {
  const active = feeds.filter(f => f.active);
  if (active.length === 0) return [];

  const results = await Promise.allSettled(active.map(fetchOneFeed));

  const all: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value.articles);
  }

  setCachedFeedArticles(uid, all);
  return all;
}
