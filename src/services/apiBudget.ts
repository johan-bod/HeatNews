import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Spec: 200 requests/day total, ~40 for shared pool
export const DAILY_LIMIT = 200;
export const SHARED_POOL_BUDGET = 40;
export const USER_DAILY_FETCHES = 2;
export const BUDGET_RESERVE = 20; // Reserve for emergency shared pool refresh

const STORAGE_KEY = 'heatstory_budget';
const DATE_KEY = 'heatstory_budget_date';

interface BudgetState {
  requestCount: number;
  userFetches: Record<string, number>; // uid → fetch count
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { requestCount: 0, userFetches: {} };
    return JSON.parse(raw);
  } catch {
    return { requestCount: 0, userFetches: {} };
  }
}

function saveState(state: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(DATE_KEY, getToday());
  } catch {
    console.warn('Failed to save budget state');
  }
}

/** Reset counters if the stored date is not today */
export function resetIfNewDay(): void {
  const storedDate = localStorage.getItem(DATE_KEY);
  if (storedDate !== getToday()) {
    saveState({ requestCount: 0, userFetches: {} });
  }
}

/** Current daily API request count */
export function getDailyUsage(): number {
  resetIfNewDay();
  return loadState().requestCount;
}

/** Add N to the daily request count */
export function incrementUsage(count: number = 1): void {
  resetIfNewDay();
  const state = loadState();
  state.requestCount += count;
  saveState(state);
}

/**
 * Check if we can make N more API requests.
 * Blocks when remaining budget falls below BUDGET_RESERVE
 * (reserved for emergency shared pool refresh).
 */
export function canMakeRequest(count: number = 1): boolean {
  resetIfNewDay();
  const state = loadState();
  return state.requestCount + count <= DAILY_LIMIT - BUDGET_RESERVE;
}

/** How many personalized fetches a user has done today */
export function getUserFetchCount(uid: string): number {
  resetIfNewDay();
  return loadState().userFetches[uid] || 0;
}

/** Record a personalized fetch for a user */
export function incrementUserFetch(uid: string): void {
  resetIfNewDay();
  const state = loadState();
  state.userFetches[uid] = (state.userFetches[uid] || 0) + 1;
  saveState(state);
}

/** Whether a user can do a personalized fetch */
export function canUserFetch(uid: string): boolean {
  resetIfNewDay();
  const count = getUserFetchCount(uid);
  return count < USER_DAILY_FETCHES && canMakeRequest(1);
}

/** Remaining personalized fetches for a user */
export function getUserRemainingFetches(uid: string): number {
  resetIfNewDay();
  const used = getUserFetchCount(uid);
  return Math.max(0, USER_DAILY_FETCHES - used);
}

/**
 * Sync user's fetch count to Firestore (fire-and-forget).
 * Stored at users/{uid}.usage for the current day.
 */
export async function syncUsageToFirestore(uid: string): Promise<void> {
  if (!db) return;
  try {
    const today = getToday();
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      usage: {
        fetchCount: getUserFetchCount(uid),
        date: today,
      },
    }, { merge: true });
  } catch (error) {
    console.warn('Failed to sync usage to Firestore:', error);
  }
}

/**
 * Load user's fetch count from Firestore on sign-in.
 * If Firestore has a count for today, use it (may be higher than local).
 */
export async function loadUsageFromFirestore(uid: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'users', uid);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const usage = snapshot.data().usage;
      if (usage && usage.date === getToday()) {
        const state = loadState();
        const localCount = state.userFetches[uid] || 0;
        // Take the higher count (user may have fetched on another device)
        state.userFetches[uid] = Math.max(localCount, usage.fetchCount || 0);
        saveState(state);
      }
    }
  } catch (error) {
    console.warn('Failed to load usage from Firestore:', error);
  }
}
