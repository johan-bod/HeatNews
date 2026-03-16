import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLocalSaved,
  loadSavedStories,
  saveStory,
  removeSavedStory,
  markStoryViewed,
} from '@/services/savedStories';
import type { SavedStory } from '@/types/savedStory';
import type { StoryCluster } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';

/** Reconstruct a minimal StoryCluster from stored articles (used when live cache has expired). */
export function reconstructCluster(
  story: SavedStory,
): { cluster: StoryCluster; article: NewsArticle } {
  const articles = (story.articles as unknown[]).filter(
    (a): a is NewsArticle =>
      typeof a === 'object' && a !== null &&
      typeof (a as Record<string, unknown>).id === 'string' &&
      typeof (a as Record<string, unknown>).title === 'string' &&
      typeof (a as Record<string, unknown>).url === 'string' &&
      typeof (a as Record<string, unknown>).publishedAt === 'string',
  );
  const lead = articles.find(a => a.id === story.leadArticleId) ?? articles[0];
  const cluster: StoryCluster = {
    articles,
    terms: new Set(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel: story.heatAtSave,
    coverage: 0,
  };
  return { cluster, article: lead };
}

export function useSavedStories() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedStory[]>(() =>
    user ? getLocalSaved(user.uid) : [],
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync from Firestore on mount / user change
  useEffect(() => {
    if (!user) { setSaved([]); return; }
    setIsLoading(true);
    loadSavedStories(user.uid)
      .then(setSaved)
      .finally(() => setIsLoading(false));
  }, [user]);

  const save = useCallback(async (story: SavedStory) => {
    if (!user) return;
    setSaved(prev => [...prev.filter(s => s.id !== story.id), story]);
    await saveStory(user.uid, story);
  }, [user]);

  const remove = useCallback(async (storyId: string) => {
    if (!user) return;
    setSaved(prev => prev.filter(s => s.id !== storyId));
    await removeSavedStory(user.uid, storyId);
  }, [user]);

  const markViewed = useCallback(async (storyId: string) => {
    if (!user) return;
    setSaved(prev =>
      prev.map(s => s.id === storyId ? { ...s, lastViewedAt: Date.now() } : s),
    );
    await markStoryViewed(user.uid, storyId);
  }, [user]);

  /** Whether the cluster whose lead article has this ID is already saved */
  const isSaved = useCallback(
    (leadArticleId: string) => saved.some(s => s.leadArticleId === leadArticleId),
    [saved],
  );

  /** Get the full SavedStory for a given lead article ID */
  const getSaved = useCallback(
    (leadArticleId: string) => saved.find(s => s.leadArticleId === leadArticleId),
    [saved],
  );

  return { saved, isLoading, save, remove, markViewed, isSaved, getSaved };
}
