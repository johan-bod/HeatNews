/**
 * Saved stories — localStorage (instant) + Firestore (cross-device sync).
 * Stored as a nested map inside users/{uid}.savedStories so existing
 * Firestore security rules (allow read/write for own uid) cover it without changes.
 */

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SavedStory, MinimalArticle } from '@/types/savedStory';
import type { StoryCluster } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';
import type { PotentialAssessment, TimelineInfo } from '@/utils/storyBrief';
import type { CoverageGapResult } from '@/utils/coverageGap';

const LS_KEY = (uid: string) => `ht-saved-v1-${uid}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTopTopics(articles: NewsArticle[], max = 5): string[] {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    if (a.primaryTopic) counts[a.primaryTopic] = (counts[a.primaryTopic] ?? 0) + 1;
    for (const t of a.secondaryTopics ?? []) counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, max).map(([t]) => t);
}

/** Build a SavedStory from live cluster data. */
export function createSavedStory(
  cluster: StoryCluster,
  lead: NewsArticle,
  potential: PotentialAssessment,
  timeline: TimelineInfo | null,
  coverageGap: CoverageGapResult | null,
): SavedStory {
  const now = Date.now();
  return {
    id: `${lead.id}-${now}`,
    savedAt: now,
    lastViewedAt: now,
    headline: lead.title,
    leadArticleId: lead.id,
    leadUrl: lead.url,
    heatAtSave: cluster.heatLevel,
    potential: potential.level,
    sourceCount: cluster.articles.length,
    topSources: [...new Set(cluster.articles.map(a => a.source.name))].slice(0, 4),
    topics: getTopTopics(cluster.articles),
    coverageGapLabel: coverageGap?.gapLabel ?? '',
    timelineStatus: timeline?.status ?? null,
    articles: cluster.articles.map((a): MinimalArticle => ({
      id: a.id,
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      language: a.language,
      country: a.country,
      location: a.location,
      coordinates: a.coordinates,
      heatLevel: a.heatLevel,
      color: a.color,
      scale: a.scale,
      primaryTopic: a.primaryTopic,
      secondaryTopics: a.secondaryTopics,
    })),
  };
}

// ── localStorage layer ────────────────────────────────────────────────────────

export function getLocalSaved(uid: string): SavedStory[] {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? (JSON.parse(raw) as SavedStory[]) : [];
  } catch {
    return [];
  }
}

function setLocalSaved(uid: string, stories: SavedStory[]): void {
  try {
    localStorage.setItem(LS_KEY(uid), JSON.stringify(stories));
  } catch {
    // localStorage full — skip caching
  }
}

// ── Firestore layer ───────────────────────────────────────────────────────────

export async function loadSavedStories(uid: string): Promise<SavedStory[]> {
  if (!db) return getLocalSaved(uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const map = snap.data()?.savedStories as Record<string, SavedStory> | undefined;
    const stories = map ? Object.values(map) : [];
    setLocalSaved(uid, stories);
    return stories;
  } catch {
    return getLocalSaved(uid);
  }
}

export async function saveStory(uid: string, story: SavedStory): Promise<void> {
  const current = getLocalSaved(uid);
  setLocalSaved(uid, [...current.filter(s => s.id !== story.id), story]);
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid),
      { savedStories: { [story.id]: story } },
      { merge: true },
    );
  } catch {
    // Firestore unavailable — localStorage persists the save
  }
}

export async function removeSavedStory(uid: string, storyId: string): Promise<void> {
  setLocalSaved(uid, getLocalSaved(uid).filter(s => s.id !== storyId));
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      [`savedStories.${storyId}`]: deleteField(),
    });
  } catch { /* noop */ }
}

export async function markStoryViewed(uid: string, storyId: string): Promise<void> {
  const ts = Date.now();
  const updated = getLocalSaved(uid).map(s =>
    s.id === storyId ? { ...s, lastViewedAt: ts } : s,
  );
  setLocalSaved(uid, updated);
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      [`savedStories.${storyId}.lastViewedAt`]: ts,
    });
  } catch { /* noop */ }
}
