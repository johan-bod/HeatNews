import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserPreferences } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';

export const PREFERENCES_CACHE_KEY = 'heatstory_prefs';

// ── localStorage cache layer ──

export function getCachedPreferences(uid: string): UserPreferences | null {
  try {
    const raw = localStorage.getItem(`${PREFERENCES_CACHE_KEY}_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return null;
  }
}

export function setCachedPreferences(uid: string, prefs: UserPreferences): void {
  try {
    localStorage.setItem(`${PREFERENCES_CACHE_KEY}_${uid}`, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to cache preferences:', error);
  }
}

export function clearCachedPreferences(uid: string): void {
  localStorage.removeItem(`${PREFERENCES_CACHE_KEY}_${uid}`);
}

// ── Firestore layer ──

/**
 * Load preferences: try localStorage cache first for speed,
 * then fetch from Firestore (source of truth) and update cache.
 */
export async function loadPreferences(uid: string): Promise<UserPreferences> {
  const cached = getCachedPreferences(uid);

  if (db) {
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists() && snapshot.data().preferences) {
        const firestorePrefs = snapshot.data().preferences as UserPreferences;
        setCachedPreferences(uid, firestorePrefs);
        return firestorePrefs;
      }
    } catch (error) {
      console.warn('Firestore sync failed, using cache:', error);
    }
  }

  return cached || DEFAULT_PREFERENCES;
}

/**
 * Save preferences to both Firestore and localStorage.
 */
export async function savePreferences(
  uid: string,
  prefs: UserPreferences,
): Promise<void> {
  const updated = { ...prefs, updatedAt: Date.now() };

  // Always cache locally
  setCachedPreferences(uid, updated);

  // Persist to Firestore if available
  if (db) {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        preferences: updated,
      }, { merge: true });
    } catch (error) {
      console.warn('Firestore save failed, preferences cached locally:', error);
    }
  }
}
