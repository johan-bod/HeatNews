/**
 * Watch rules + story alerts service.
 * Stored in users/{uid}.watchRules and users/{uid}.storyAlerts (nested maps,
 * compatible with existing Firestore security rules).
 */

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WatchRule, StoryAlert } from '@/types/watchRule';
import type { NewsArticle } from '@/types/news';

const MAX_ALERTS = 100;
const MAX_FIRESTORE_ALERTS = 50;

// ── LocalStorage keys ─────────────────────────────────────────────────────────

const LS_RULES  = (uid: string) => `ht-watch-rules-${uid}`;
const LS_ALERTS = (uid: string) => `ht-watch-alerts-${uid}`;

function lsGet<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : null; }
  catch { return null; }
}
function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ── Watch rules ───────────────────────────────────────────────────────────────

export function getLocalRules(uid: string): WatchRule[] {
  return lsGet<WatchRule[]>(LS_RULES(uid)) ?? [];
}

export async function loadWatchRules(uid: string): Promise<WatchRule[]> {
  if (!db) return getLocalRules(uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const map = snap.data()?.watchRules as Record<string, WatchRule>;
    const rules = map ? Object.values(map) : [];
    lsSet(LS_RULES(uid), rules);
    return rules;
  } catch {
    return getLocalRules(uid);
  }
}

export async function saveWatchRule(uid: string, rule: WatchRule): Promise<void> {
  const current = getLocalRules(uid);
  lsSet(LS_RULES(uid), [...current.filter(r => r.id !== rule.id), rule]);
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid), { watchRules: { [rule.id]: rule } }, { merge: true });
  } catch { /* noop */ }
}

export async function removeWatchRule(uid: string, ruleId: string): Promise<void> {
  lsSet(LS_RULES(uid), getLocalRules(uid).filter(r => r.id !== ruleId));
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { [`watchRules.${ruleId}`]: deleteField() });
  } catch { /* noop */ }
}

// ── Story alerts ──────────────────────────────────────────────────────────────

export function getLocalAlerts(uid: string): StoryAlert[] {
  return lsGet<StoryAlert[]>(LS_ALERTS(uid)) ?? [];
}

export async function loadStoryAlerts(uid: string): Promise<StoryAlert[]> {
  if (!db) return getLocalAlerts(uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const map = snap.data()?.storyAlerts as Record<string, StoryAlert>;
    const alerts = map ? Object.values(map).sort((a, b) => b.triggeredAt - a.triggeredAt) : [];
    lsSet(LS_ALERTS(uid), alerts);
    return alerts;
  } catch {
    return getLocalAlerts(uid);
  }
}

export async function saveAlert(uid: string, alert: StoryAlert): Promise<void> {
  const current = getLocalAlerts(uid);
  const updated = [alert, ...current.filter(a => a.id !== alert.id)].slice(0, MAX_ALERTS);
  lsSet(LS_ALERTS(uid), updated);
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid), { storyAlerts: { [alert.id]: alert } }, { merge: true });
    // Prune Firestore storyAlerts to the 50 most recent to prevent unbounded document growth
    const snap = await getDoc(doc(db, 'users', uid));
    const allAlerts = snap.data()?.storyAlerts as Record<string, StoryAlert> | undefined;
    if (allAlerts) {
      const entries = Object.entries(allAlerts).sort(([, a], [, b]) => b.triggeredAt - a.triggeredAt);
      if (entries.length > MAX_FIRESTORE_ALERTS) {
        const pruned = Object.fromEntries(entries.slice(0, MAX_FIRESTORE_ALERTS));
        await setDoc(doc(db, 'users', uid), { storyAlerts: pruned }, { merge: true });
      }
    }
  } catch { /* noop */ }
}

export async function markAlertRead(uid: string, alertId: string): Promise<void> {
  const updated = getLocalAlerts(uid).map(a => a.id === alertId ? { ...a, read: true } : a);
  lsSet(LS_ALERTS(uid), updated);
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { [`storyAlerts.${alertId}.read`]: true });
  } catch { /* noop */ }
}

export async function markAllAlertsRead(uid: string): Promise<void> {
  const updated = getLocalAlerts(uid).map(a => ({ ...a, read: true }));
  lsSet(LS_ALERTS(uid), updated);
  if (!db) return;
  try {
    const updates: Record<string, boolean> = {};
    for (const a of updated) updates[`storyAlerts.${a.id}.read`] = true;
    if (Object.keys(updates).length > 0) await updateDoc(doc(db, 'users', uid), updates);
  } catch { /* noop */ }
}

// ── Matching logic (pure — exported for testing) ──────────────────────────────

/**
 * Returns true if this cluster matches the given watch rule.
 * Keywords: ANY keyword must appear in headline or topics.
 * Regions: if non-empty, ANY region string must appear in an article's country or location.
 */
export function matchesRule(
  headline: string,
  topics: string[],
  articles: NewsArticle[],
  rule: WatchRule,
): boolean {
  if (!rule.active) return false;

  const haystack = [headline, ...topics].join(' ').toLowerCase();

  const keywordHit =
    rule.keywords.length === 0 ||
    rule.keywords.some(kw => kw.trim() && haystack.includes(kw.trim().toLowerCase()));

  const regionHit =
    rule.regions.length === 0 ||
    rule.regions.some(region => {
      const r = region.trim().toLowerCase();
      if (!r) return false;
      return articles.some(
        a =>
          a.country?.toLowerCase().includes(r) ||
          a.location?.toLowerCase().includes(r),
      );
    });

  return keywordHit && regionHit;
}

/** Hours since the most recent article publishedAt. Returns null if no valid dates. */
export function computeStaleHours(articles: NewsArticle[]): number | null {
  const times = articles
    .map(a => new Date(a.publishedAt).getTime())
    .filter(t => !isNaN(t));
  if (times.length === 0) return null;
  return (Date.now() - Math.max(...times)) / 3_600_000;
}
