/**
 * Persists per-cluster heat scores from the previous dashboard session.
 * Provides getHeatDelta() to show trending arrows on cards.
 *
 * The snapshot is saved once per mount (after clusters are computed),
 * so the delta shown is "vs the last time you opened this dashboard".
 */

import { useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LS_KEY = (uid: string) => `ht-heat-snap-${uid}`;

function loadSnapshot(uid: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch { return {}; }
}

function saveSnapshot(uid: string, snap: Record<string, number>): void {
  try { localStorage.setItem(LS_KEY(uid), JSON.stringify(snap)); } catch { /* noop */ }
}

export function useHeatSnapshot(entries: ReadonlyArray<{ id: string; heat: number }>) {
  const { user } = useAuth();
  const uid = user?.uid ?? 'anon';

  // Load previous snapshot once on mount (before clusters are committed back)
  const prevSnapshot = useRef<Record<string, number>>(loadSnapshot(uid));
  const committed = useRef(false);

  // Commit current state after first real render (not on every update).
  // committed is reset per uid so that each new user session gets a fresh snapshot.
  useEffect(() => {
    committed.current = false;
  }, [uid]);

  useEffect(() => {
    if (entries.length === 0 || committed.current) return;
    committed.current = true;
    const next: Record<string, number> = {};
    for (const { id, heat } of entries) next[id] = heat;
    saveSnapshot(uid, next);
  }, [uid, entries]);

  function getHeatDelta(id: string, currentHeat: number): number | null {
    const prev = prevSnapshot.current[id];
    if (prev === undefined) return null;
    return currentHeat - prev;
  }

  return { getHeatDelta };
}
