import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLocalFeeds,
  loadSourceFeeds,
  saveSourceFeed,
  removeSourceFeed,
  getCachedFeedArticles,
  fetchAllFeeds,
} from '@/services/sourceFeeds';
import type { SourceFeed } from '@/types/sourceFeed';
import type { NewsArticle } from '@/types/news';

export function useSourceFeeds(isPaid = false) {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<SourceFeed[]>(() => user ? getLocalFeeds(user.uid) : []);
  const [feedArticles, setFeedArticles] = useState<NewsArticle[]>(() => user ? getCachedFeedArticles(user.uid) : []);
  const [isFetching, setIsFetching] = useState(false);

  // Load feeds + cached articles on mount / user change
  useEffect(() => {
    if (!user) { setFeeds([]); setFeedArticles([]); return; }
    loadSourceFeeds(user.uid).then(loaded => {
      setFeeds(loaded);
      // Use cache first; background-refresh if stale
      const cached = getCachedFeedArticles(user.uid);
      if (cached.length > 0) {
        setFeedArticles(cached);
      } else if (loaded.some(f => f.active)) {
        fetchAllFeeds(user.uid, loaded).then(setFeedArticles);
      }
    });
  }, [user]);

  const addFeed = useCallback(async (feed: SourceFeed): Promise<{ success: boolean; limitReached: boolean }> => {
    if (!user) return { success: false, limitReached: false };
    if (!isPaid && feeds.length >= 2) return { success: false, limitReached: true };
    setFeeds(prev => [...prev.filter(f => f.id !== feed.id), feed]);
    await saveSourceFeed(user.uid, feed);
    // Immediately fetch the new feed.
    // Read the freshest feed list from localStorage (via getLocalFeeds) rather than
    // the closed-over `feeds` state, which may be stale if multiple feeds are added
    // in rapid succession.
    setIsFetching(true);
    try {
      const freshFeeds = getLocalFeeds(user.uid);
      const updated = [...freshFeeds.filter(f => f.id !== feed.id), feed];
      const articles = await fetchAllFeeds(user.uid, updated);
      setFeedArticles(articles);
    } finally {
      setIsFetching(false);
    }
    return { success: true, limitReached: false };
  }, [user, isPaid, feeds]);

  const toggleFeed = useCallback(async (feedId: string) => {
    if (!user) return;
    setFeeds(prev => {
      const updated = prev.map(f => f.id === feedId ? { ...f, active: !f.active } : f);
      const changed = updated.find(f => f.id === feedId);
      if (changed) saveSourceFeed(user.uid, changed);
      return updated;
    });
  }, [user]);

  const deleteFeed = useCallback(async (feedId: string) => {
    if (!user) return;
    const updated = feeds.filter(f => f.id !== feedId);
    setFeeds(updated);
    setFeedArticles(prev => prev.filter(a => a.feedId !== feedId));
    await removeSourceFeed(user.uid, feedId);
  }, [user, feeds]);

  const refreshFeeds = useCallback(async () => {
    if (!user || feeds.length === 0) return;
    setIsFetching(true);
    try {
      const articles = await fetchAllFeeds(user.uid, feeds);
      setFeedArticles(articles);
    } finally {
      setIsFetching(false);
    }
  }, [user, feeds]);

  return { feeds, feedArticles, isFetching, addFeed, toggleFeed, deleteFeed, refreshFeeds };
}
