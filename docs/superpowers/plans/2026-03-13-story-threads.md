# Story Threads Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw arcs on the globe connecting cross-region coverage of the same story, with fly-to navigation and an optional synthesized discovery sound.

**Architecture:** Pure utility functions compute arc data from existing cluster + coordinate data. Globe.gl's native arc layer renders them. Callbacks stay within the GlobeView → GlobePopup component tree — no prop changes to Index.tsx or MapSection.tsx. Sound is synthesized via Web Audio API with a localStorage toggle.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Globe.gl, Web Audio API, Vitest

**Spec:** `docs/superpowers/specs/2026-03-13-story-threads-design.md`

---

## Chunk 1: Arc Builder Utility + Sound Manager

### Task 1: Create arcBuilder utility

**Files:**
- Create: `src/utils/arcBuilder.ts`
- Create: `tests/utils/arcBuilder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/arcBuilder.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildClusterArcs, countDistinctLocations, hexToRgbaArc } from '@/utils/arcBuilder';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

function makeArticle(id: string, lat?: number, lng?: number): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: `Source ${id}`, url: `https://source${id}.com` },
    coordinates: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    color: '#F59E0B',
  } as NewsArticle;
}

function makeCluster(articles: NewsArticle[]): StoryCluster {
  return {
    articles,
    terms: new Set<string>(),
    uniqueSources: new Set(articles.map(a => a.source.name)),
    sourceDomains: new Map(articles.map(a => [a.source.name, undefined])),
    heatLevel: 50,
    coverage: articles.length,
  };
}

describe('hexToRgbaArc', () => {
  it('converts hex to rgba with given alpha', () => {
    expect(hexToRgbaArc('#F59E0B', 0.6)).toBe('rgba(245, 158, 11, 0.6)');
  });

  it('handles lowercase hex', () => {
    expect(hexToRgbaArc('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('countDistinctLocations', () => {
  it('returns 0 for cluster with no coordinates', () => {
    const cluster = makeCluster([makeArticle('1'), makeArticle('2')]);
    expect(countDistinctLocations(cluster)).toBe(0);
  });

  it('counts unique locations (1-decimal rounding)', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),  // Paris
      makeArticle('2', 48.8601, 2.3499),  // Also Paris (rounds to same)
      makeArticle('3', 51.5074, -0.1278), // London
    ]);
    expect(countDistinctLocations(cluster)).toBe(2);
  });

  it('returns 1 when all articles are in same location', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),
      makeArticle('2', 48.8601, 2.3499),
    ]);
    expect(countDistinctLocations(cluster)).toBe(1);
  });

  it('skips articles without coordinates', () => {
    const cluster = makeCluster([
      makeArticle('1', 48.8566, 2.3522),
      makeArticle('2'),  // no coords
      makeArticle('3', 51.5074, -0.1278),
    ]);
    expect(countDistinctLocations(cluster)).toBe(2);
  });
});

describe('buildClusterArcs', () => {
  it('returns empty array when current article has no coordinates', () => {
    const current = makeArticle('1');
    const cluster = makeCluster([current, makeArticle('2', 51.5074, -0.1278)]);
    expect(buildClusterArcs(cluster, current)).toEqual([]);
  });

  it('returns empty array when no other locations exist', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    const cluster = makeCluster([current, makeArticle('2')]);
    expect(buildClusterArcs(cluster, current)).toEqual([]);
  });

  it('creates arcs from current article to distinct locations', () => {
    const current = makeArticle('1', 48.8566, 2.3522);  // Paris
    const cluster = makeCluster([
      current,
      makeArticle('2', 51.5074, -0.1278),  // London
      makeArticle('3', 40.4168, -3.7038),   // Madrid
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(2);
    expect(arcs[0].startLat).toBeCloseTo(48.8566);
    expect(arcs[0].startLng).toBeCloseTo(2.3522);
    expect(arcs[0].color).toContain('rgba');
  });

  it('deduplicates endpoints in same city', () => {
    const current = makeArticle('1', 48.8566, 2.3522);  // Paris
    const cluster = makeCluster([
      current,
      makeArticle('2', 51.5074, -0.1278),  // London
      makeArticle('3', 51.5200, -0.1100),  // Also London (rounds same at 1 decimal)
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(1);
  });

  it('excludes endpoints matching current article location', () => {
    const current = makeArticle('1', 48.8566, 2.3522);  // Paris
    const cluster = makeCluster([
      current,
      makeArticle('2', 48.8601, 2.3499),  // Also Paris
      makeArticle('3', 51.5074, -0.1278),  // London
    ]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].endLat).toBeCloseTo(51.5074);
  });

  it('uses article color with 0.6 alpha', () => {
    const current = makeArticle('1', 48.8566, 2.3522);
    current.color = '#EF4444';
    const cluster = makeCluster([current, makeArticle('2', 51.5074, -0.1278)]);
    const arcs = buildClusterArcs(cluster, current);
    expect(arcs[0].color).toBe('rgba(239, 68, 68, 0.6)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/arcBuilder.test.ts`
Expected: FAIL — module `@/utils/arcBuilder` not found

- [ ] **Step 3: Create arcBuilder.ts**

Create `src/utils/arcBuilder.ts`:

```typescript
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from './topicClustering';

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

/**
 * Convert hex color to rgba string.
 */
export function hexToRgbaArc(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Round coordinate to 1 decimal place for geographic deduplication (~11km).
 */
function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

function coordKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

/**
 * Count geographically distinct locations in a cluster.
 * Used to decide whether to show the "Covered across N regions" teaser.
 */
export function countDistinctLocations(cluster: StoryCluster): number {
  const seen = new Set<string>();
  for (const article of cluster.articles) {
    if (!article.coordinates) continue;
    seen.add(coordKey(article.coordinates.lat, article.coordinates.lng));
  }
  return seen.size;
}

/**
 * Build arc data connecting the current article to each geographically
 * distinct cluster article location.
 *
 * Returns empty array if current article has no coordinates or
 * no other distinct locations exist.
 */
export function buildClusterArcs(
  cluster: StoryCluster,
  currentArticle: NewsArticle
): ArcData[] {
  if (!currentArticle.coordinates) return [];

  const startLat = currentArticle.coordinates.lat;
  const startLng = currentArticle.coordinates.lng;
  const currentKey = coordKey(startLat, startLng);
  const color = hexToRgbaArc(currentArticle.color || '#94A3B8', 0.6);

  const seenKeys = new Set<string>([currentKey]);
  const arcs: ArcData[] = [];

  for (const article of cluster.articles) {
    if (article.id === currentArticle.id) continue;
    if (!article.coordinates) continue;

    const key = coordKey(article.coordinates.lat, article.coordinates.lng);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    arcs.push({
      startLat,
      startLng,
      endLat: article.coordinates.lat,
      endLng: article.coordinates.lng,
      color,
    });
  }

  return arcs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/arcBuilder.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/arcBuilder.ts tests/utils/arcBuilder.test.ts
git commit -m "feat: add arcBuilder utility for cluster arc computation"
```

---

### Task 2: Create soundManager utility

**Files:**
- Create: `src/utils/soundManager.ts`
- Create: `tests/utils/soundManager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/soundManager.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { isSoundEnabled, setSoundEnabled, SOUND_STORAGE_KEY } from '@/utils/soundManager';

describe('soundManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isSoundEnabled', () => {
    it('defaults to false', () => {
      expect(isSoundEnabled()).toBe(false);
    });

    it('returns true when localStorage is set to true', () => {
      localStorage.setItem(SOUND_STORAGE_KEY, 'true');
      expect(isSoundEnabled()).toBe(true);
    });

    it('returns false when localStorage is set to false', () => {
      localStorage.setItem(SOUND_STORAGE_KEY, 'false');
      expect(isSoundEnabled()).toBe(false);
    });
  });

  describe('setSoundEnabled', () => {
    it('persists true to localStorage', () => {
      setSoundEnabled(true);
      expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('true');
    });

    it('persists false to localStorage', () => {
      setSoundEnabled(true);
      setSoundEnabled(false);
      expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('false');
    });
  });
});
```

Note: We only test the localStorage toggle logic. The Web Audio API synthesis (`playDiscoverSound`) cannot be meaningfully tested in jsdom (no AudioContext). It will be verified manually.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/soundManager.test.ts`
Expected: FAIL — module `@/utils/soundManager` not found

- [ ] **Step 3: Create soundManager.ts**

Create `src/utils/soundManager.ts`:

```typescript
export const SOUND_STORAGE_KEY = 'heatstory_sound_enabled';

/**
 * Check if discovery sound is enabled (default: off).
 */
export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist sound toggle state.
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
}

let audioCtx: AudioContext | null = null;

/**
 * Play a short, low-frequency filtered sweep.
 * Editorial tone — subtle documentary atmosphere, not a game chime.
 * Only plays if sound is enabled.
 */
export function playDiscoverSound(): void {
  if (!isSoundEnabled()) return;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    const now = audioCtx.currentTime;
    const duration = 0.25; // 250ms

    // Oscillator: low sine sweep from 180Hz down to 120Hz
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + duration);

    // Lowpass filter to soften
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(1, now);

    // Gain envelope: quick attack, smooth decay
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);  // attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);  // decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Web Audio API unavailable
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/soundManager.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/soundManager.ts tests/utils/soundManager.test.ts
git commit -m "feat: add soundManager with synthesized discovery sound"
```

---

## Chunk 2: Globe Integration + Popup Enhancement

### Task 3: Initialize arc layer in GlobeView and wire callbacks

**Files:**
- Modify: `src/components/globe/GlobeView.tsx:180-307,441-505`

- [ ] **Step 1: Add imports to GlobeView**

In `src/components/globe/GlobeView.tsx`, add at the top with the other imports:

```typescript
import type { ArcData } from '@/utils/arcBuilder';
import { playDiscoverSound } from '@/utils/soundManager';
```

- [ ] **Step 2: Add arc layer initialization to the globe init effect**

In the globe init effect (starts at line 180), add the arc layer setup after the hex-bin block (after line 280, before the `// Track zoom changes` comment at line 282):

```typescript
    // Arc layer for story threads (starts empty)
    globe
      .arcsData([])
      .arcStartLat('startLat')
      .arcEndLat('endLat')
      .arcStartLng('startLng')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcStroke(1.5)
      .arcAltitude(0.15)
      .arcDashLength(3)
      .arcDashGap(2)
      .arcDashAnimateTime(2000)
      .arcsTransitionDuration(MARKER_TRANSITION_MS);
```

- [ ] **Step 3: Create onShowArcs and onFlyToArticle handlers**

Add these handler functions inside the `GlobeView` component, after the `handleRegionJump` callback (after line 439):

```typescript
const handleShowArcs = useCallback((arcs: ArcData[]) => {
  if (globeRef.current) {
    globeRef.current.arcsData(arcs);
  }
}, []);

const handleFlyToArticle = useCallback((lat: number, lng: number) => {
  if (globeRef.current) {
    globeRef.current.pointOfView({ lat, lng, altitude: 1.2 }, 1000);
    autoRotation.onUserInteraction();
    playDiscoverSound();
  }
}, [autoRotation]);
```

- [ ] **Step 4: Clear arcs on popup close**

Update the `onClose` callback passed to `GlobePopup`. Find the current GlobePopup render (around line 486-492):

```tsx
{/* old */}
<GlobePopup
  article={selectedArticle}
  position={popupPosition}
  onClose={() => setSelectedArticle(null)}
  clusters={clusters}
/>

{/* new */}
<GlobePopup
  article={selectedArticle}
  position={popupPosition}
  onClose={() => {
    setSelectedArticle(null);
    if (globeRef.current) globeRef.current.arcsData([]);
  }}
  clusters={clusters}
  onShowArcs={handleShowArcs}
  onFlyToArticle={handleFlyToArticle}
/>
```

Also clear arcs in the `onGlobeClick` handler (line 210-212), since clicking the globe closes the popup:

```typescript
// old (line 210-212)
.onGlobeClick(() => {
  setSelectedArticle(null);
})

// new
.onGlobeClick(() => {
  setSelectedArticle(null);
  if (globeRef.current) globeRef.current.arcsData([]);
})
```

Note: `globeRef.current` is not set yet inside the init effect when `onGlobeClick` runs, but it will be set by the time the user actually clicks. The `globe` local variable is available in the closure — alternatively use `globe.arcsData([])` directly:

```typescript
.onGlobeClick(() => {
  setSelectedArticle(null);
  globe.arcsData([]);
})
```

- [ ] **Step 5: Do NOT commit yet**

GlobeView now passes `onShowArcs` and `onFlyToArticle` props to GlobePopup, but GlobePopup doesn't accept them yet. TypeScript will error. Complete Task 4 first, then commit both files together.

---

### Task 4: Update GlobePopup with geographic teaser and fly-to icons

**Files:**
- Modify: `src/components/globe/GlobePopup.tsx:1-145`

- [ ] **Step 1: Update props interface and imports**

In `src/components/globe/GlobePopup.tsx`, add imports:

```typescript
import { buildClusterArcs, countDistinctLocations } from '@/utils/arcBuilder';
import type { ArcData } from '@/utils/arcBuilder';
import { MapPin } from 'lucide-react';
```

Update the `GlobePopupProps` interface:

```typescript
interface GlobePopupProps {
  article: NewsArticle;
  position: { x: number; y: number };
  onClose: () => void;
  clusters: StoryCluster[];
  onShowArcs?: (arcs: ArcData[]) => void;
  onFlyToArticle?: (lat: number, lng: number) => void;
}
```

Update the destructuring:

```typescript
export default function GlobePopup({ article, position, onClose, clusters, onShowArcs, onFlyToArticle }: GlobePopupProps) {
```

- [ ] **Step 2: Add geographic location computation**

After the existing `remainingCount` computation (line 20-22), add:

```typescript
const distinctLocations = cluster ? countDistinctLocations(cluster) : 0;
const showGeoTeaser = distinctLocations >= 2;
```

- [ ] **Step 3: Add helper to check if a cluster article has different coordinates**

Add a helper function inside the component (or before the return):

```typescript
function hasDifferentLocation(clusterArticle: NewsArticle): boolean {
  if (!article.coordinates || !clusterArticle.coordinates) return false;
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    round(article.coordinates.lat) !== round(clusterArticle.coordinates.lat) ||
    round(article.coordinates.lng) !== round(clusterArticle.coordinates.lng)
  );
}
```

- [ ] **Step 4: Add map-pin icon to cluster article list items**

In the cluster article list (lines 88-104), update each article's `<a>` element to include a map-pin button. Replace the existing map block:

```tsx
{/* old */}
{clusterArticles.map(({ article: clusterArticle, tierLabel, tierColor }) => (
  <a
    key={clusterArticle.id}
    href={clusterArticle.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between gap-2 group"
  >
    <span className="font-body text-[10px] text-ivory-200/60 truncate group-hover:text-ivory-50 transition-colors">
      <span className="text-ivory-200/80">{clusterArticle.source.name}</span>
      {' — '}
      <span className="italic">"{clusterArticle.title}"</span>
    </span>
    <span className={`font-body text-[9px] flex-shrink-0 ${tierColor}`}>
      {tierLabel}
    </span>
  </a>
))}

{/* new */}
{clusterArticles.map(({ article: clusterArticle, tierLabel, tierColor }) => (
  <div key={clusterArticle.id} className="flex items-center gap-1">
    <a
      href={clusterArticle.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 group flex-1 min-w-0"
    >
      <span className="font-body text-[10px] text-ivory-200/60 truncate group-hover:text-ivory-50 transition-colors">
        <span className="text-ivory-200/80">{clusterArticle.source.name}</span>
        {' — '}
        <span className="italic">"{clusterArticle.title}"</span>
      </span>
      <span className={`font-body text-[9px] flex-shrink-0 ${tierColor}`}>
        {tierLabel}
      </span>
    </a>
    {hasDifferentLocation(clusterArticle) && onFlyToArticle && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFlyToArticle(clusterArticle.coordinates!.lat, clusterArticle.coordinates!.lng);
        }}
        className="flex-shrink-0 p-0.5 text-ivory-200/30 hover:text-amber-400 transition-colors"
        title="Fly to location"
      >
        <MapPin className="w-3 h-3" />
      </button>
    )}
  </div>
))}
```

- [ ] **Step 5: Add geographic teaser line**

After the cluster article list section (after the `remainingCount` paragraph around line 110, inside the `{clusterArticles.length > 0 && (` block), add the geographic teaser:

```tsx
{/* Geographic teaser */}
{showGeoTeaser && onShowArcs && (
  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ivory-200/5">
    <span className="font-body text-[10px] text-ivory-200/40">
      Covered across {distinctLocations} regions
    </span>
    <button
      onClick={() => {
        if (cluster) {
          const arcs = buildClusterArcs(cluster, article);
          onShowArcs(arcs);
        }
      }}
      className="font-body text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
    >
      See on globe →
    </button>
  </div>
)}
```

This goes right before the closing `</div>` of the `{clusterArticles.length > 0 && (` block (before line 112's `</div>`).

- [ ] **Step 6: Verify build and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No type errors, all tests pass

- [ ] **Step 7: Commit Tasks 3 + 4 together**

Both files must be committed together since GlobeView passes props that GlobePopup now accepts:

```bash
git add src/components/globe/GlobeView.tsx src/components/globe/GlobePopup.tsx
git commit -m "feat: add story thread arcs, geographic teaser, and fly-to navigation"
```

---

### Task 5: Add sound toggle to GlobeView

**Files:**
- Modify: `src/components/globe/GlobeView.tsx:466-474`

- [ ] **Step 1: Add sound imports and state**

In `src/components/globe/GlobeView.tsx`, add to the imports:

```typescript
import { isSoundEnabled, setSoundEnabled } from '@/utils/soundManager';
import { Volume2, VolumeX } from 'lucide-react';
```

Note: `Flame` is not currently imported in GlobeView (it's in other components), but `Volume2` and `VolumeX` are from lucide-react which is already a project dependency.

Inside the component, add state for the sound toggle:

```typescript
const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
```

- [ ] **Step 2: Add sound toggle to zoom indicator**

Find the zoom level indicator div (lines 466-474). Add the sound toggle button inside the existing indicator `div`, after the stories count span. The toggle should be hidden on mobile:

```tsx
{/* old */}
<div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
  <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 font-body text-xs text-ivory-200/60">
    {altitudeKm > 8000 && 'International view'}
    {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
    {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
    {altitudeKm <= 800 && 'Local view'}
    <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
  </div>
</div>

{/* new */}
<div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
  <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 font-body text-xs text-ivory-200/60">
    {altitudeKm > 8000 && 'International view'}
    {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
    {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
    {altitudeKm <= 800 && 'Local view'}
    <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
    {!isMobile && (
      <button
        onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          setSoundEnabled(next);
        }}
        className="ml-2 text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
        title={soundOn ? 'Mute discovery sound' : 'Enable discovery sound'}
      >
        {soundOn ? <Volume2 className="w-3 h-3 inline" /> : <VolumeX className="w-3 h-3 inline" />}
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 3: Verify build and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No type errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/GlobeView.tsx
git commit -m "feat: add sound toggle to globe zoom indicator"
```

---

### Task 6: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new `arcBuilder.test.ts` and `soundManager.test.ts`

- [ ] **Step 2: Run dev server and visually verify**

Run: `npm run dev`

Verify:
1. Click a globe marker for a multi-source story
2. If cluster articles span different locations, "Covered across N regions" teaser appears below "Other coverage:"
3. Click "See on globe →" — arcs draw from the clicked article to other locations
4. Map-pin icons appear next to cluster articles with different coordinates
5. Click a map-pin icon — globe rotates to that location, arcs stay visible
6. Close popup — arcs clear
7. Sound toggle appears in zoom indicator (desktop only)
8. Enable sound, click a map-pin — low sweep sound plays
9. Disable sound — no sound on fly-to

- [ ] **Step 3: Final commit if any fixes needed**

If any visual or functional fixes are needed:
```bash
git add -A
git commit -m "fix: polish story threads UI and arc behavior"
```
