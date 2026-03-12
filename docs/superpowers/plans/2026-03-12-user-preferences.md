# User Preferences & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user preferences (topics + locations) with Firestore persistence, an onboarding flow for new users, globe auto-focus on preferred regions, and a preferences gear icon in the navbar.

**Architecture:** Firestore stores user preferences as `users/{uid}/preferences`. A `usePreferences` hook handles read/write with localStorage as read cache and Firestore as source of truth. The onboarding modal appears once after first sign-in. The globe auto-focuses on the user's primary preference location on load.

**Tech Stack:** Firebase Auth (already set up), Cloud Firestore, React 19, TypeScript, Vitest, existing data foundation (taxonomy, geocoding locations, media outlets)

**Spec:** `docs/superpowers/specs/2026-03-12-heatstory-personalization-design.md`

**Depends on:** Sub-projects 1-3 (Data Foundation + Topic Indexation + 3D Globe) — all completed

---

## File Structure

```
src/
├── lib/
│   └── firebase.ts                    # Modified: add Firestore initialization
├── types/
│   └── preferences.ts                 # User preference types
├── services/
│   └── userPreferences.ts             # Firestore CRUD + localStorage cache
├── hooks/
│   └── usePreferences.ts              # React hook for preference state
├── components/
│   ├── onboarding/
│   │   ├── OnboardingModal.tsx        # Full-screen onboarding flow
│   │   ├── TopicPicker.tsx            # Topic selection grid
│   │   └── LocationPicker.tsx         # Location search + selection
│   ├── PreferencesButton.tsx          # Navbar gear icon (opens preferences)
│   ├── Navbar.tsx                     # Modified: add PreferencesButton
│   ├── globe/
│   │   └── GlobeView.tsx              # Modified: auto-focus on preference locations
│   │   └── RegionJumpPills.tsx        # Floating pills for multi-region jump
│   └── MapSection.tsx                 # Modified: pass preference locations
├── pages/
│   └── Index.tsx                      # Modified: integrate preferences + onboarding
tests/
├── services/
│   └── userPreferences.test.ts        # Preference service tests
├── hooks/
│   └── usePreferences.test.ts         # Hook tests (mocked Firestore)
```

---

## Chunk 1: Foundation — Types, Firestore Init, Preference Service

### Task 1: Add Firestore to firebase.ts

**Files:**
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Read current firebase.ts**

Read `src/lib/firebase.ts` to understand the current structure.

- [ ] **Step 2: Add Firestore initialization**

Add Firestore import to the top of `src/lib/firebase.ts`, alongside the existing imports:

```typescript
import { getFirestore, type Firestore } from 'firebase/firestore';
```

Add `db` declaration alongside the existing `app`, `auth`, `googleProvider` declarations (BEFORE the `if (isConfigured)` block — same pattern as the others):

```typescript
let db: Firestore | null = null;
```

Inside the `if (isConfigured)` try block, add after `googleProvider.setCustomParameters(...)`:

```typescript
    db = getFirestore(app!);
```

Note: `app!` is needed because TypeScript sees `app` as `FirebaseApp | null` — the non-null assertion is safe here since `app` was just assigned on the line above.

Update the export:

```typescript
export { auth, googleProvider, db, isConfigured };
```

- [ ] **Step 3: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds (firebase package already includes firestore)

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat: add Firestore initialization to firebase config"
```

---

### Task 2: User preference types

**Files:**
- Create: `src/types/preferences.ts`

- [ ] **Step 1: Create preference types**

Create `src/types/preferences.ts`:
```typescript
import type { Topic } from '@/data/keywords/taxonomy';

export interface PreferenceLocation {
  name: string;       // Display name: "Paris", "Tokyo", "Brazil"
  key: string;        // Geocoding key: "paris", "tokyo", "brazil"
  lat: number;
  lng: number;
  type: 'city' | 'country' | 'region';
}

export interface UserPreferences {
  topics: Topic[];                    // Selected topics (max 10)
  locations: PreferenceLocation[];    // Selected locations (max 5)
  onboardingComplete: boolean;
  updatedAt: number;                  // Timestamp
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  topics: [],
  locations: [],
  onboardingComplete: false,
  updatedAt: Date.now(),
};

```

- [ ] **Step 2: Commit**

```bash
git add src/types/preferences.ts
git commit -m "feat: add user preference types"
```

---

### Task 3: User preferences service (Firestore + localStorage)

**Files:**
- Create: `src/services/userPreferences.ts`
- Create: `tests/services/userPreferences.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/services/userPreferences.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedPreferences,
  setCachedPreferences,
  clearCachedPreferences,
  PREFERENCES_CACHE_KEY,
} from '@/services/userPreferences';
import type { UserPreferences } from '@/types/preferences';

// Only test the localStorage caching layer — Firestore is tested via integration
describe('userPreferences localStorage cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockPrefs: UserPreferences = {
    topics: ['politics', 'technology'],
    locations: [
      { name: 'Paris', key: 'paris', lat: 48.86, lng: 2.35, type: 'city' },
    ],
    onboardingComplete: true,
    updatedAt: Date.now(),
  };

  it('returns null when no cached preferences', () => {
    expect(getCachedPreferences('test-uid')).toBeNull();
  });

  it('stores and retrieves preferences', () => {
    setCachedPreferences('test-uid', mockPrefs);
    const cached = getCachedPreferences('test-uid');
    expect(cached).toEqual(mockPrefs);
  });

  it('returns null for different uid', () => {
    setCachedPreferences('test-uid', mockPrefs);
    expect(getCachedPreferences('other-uid')).toBeNull();
  });

  it('clears cached preferences', () => {
    setCachedPreferences('test-uid', mockPrefs);
    clearCachedPreferences('test-uid');
    expect(getCachedPreferences('test-uid')).toBeNull();
  });

  it('handles corrupted localStorage data', () => {
    localStorage.setItem(`${PREFERENCES_CACHE_KEY}_test-uid`, 'not-json');
    expect(getCachedPreferences('test-uid')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/services/userPreferences.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/services/userPreferences.ts`:
```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/userPreferences.test.ts
```
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/userPreferences.ts tests/services/userPreferences.test.ts
git commit -m "feat: add user preferences service with Firestore + localStorage"
```

---

### Task 4: usePreferences hook

**Files:**
- Create: `src/hooks/usePreferences.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePreferences.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadPreferences,
  savePreferences,
} from '@/services/userPreferences';
import type { UserPreferences } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import type { Topic } from '@/data/keywords/taxonomy';
import type { PreferenceLocation } from '@/types/preferences';

interface UsePreferencesReturn {
  preferences: UserPreferences;
  isLoading: boolean;
  /** Update topics (max 10) */
  setTopics: (topics: Topic[]) => Promise<void>;
  /** Update locations (max 5) */
  setLocations: (locations: PreferenceLocation[]) => Promise<void>;
  /** Mark onboarding complete */
  completeOnboarding: () => Promise<void>;
  /** Full update */
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  /** Whether onboarding should show */
  needsOnboarding: boolean;
}

export function usePreferences(): UsePreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(!!user);

  // Load preferences when user signs in
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadPreferences(user.uid)
      .then((prefs) => setPreferences(prefs))
      .finally(() => setIsLoading(false));
  }, [user]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user) return;
      const updated = { ...preferences, ...updates, updatedAt: Date.now() };
      setPreferences(updated);
      await savePreferences(user.uid, updated);
    },
    [user, preferences],
  );

  const setTopics = useCallback(
    async (topics: Topic[]) => {
      await updatePreferences({ topics: topics.slice(0, 10) });
    },
    [updatePreferences],
  );

  const setLocations = useCallback(
    async (locations: PreferenceLocation[]) => {
      await updatePreferences({ locations: locations.slice(0, 5) });
    },
    [updatePreferences],
  );

  const completeOnboarding = useCallback(async () => {
    await updatePreferences({ onboardingComplete: true });
  }, [updatePreferences]);

  const needsOnboarding = !!user && !preferences.onboardingComplete && !isLoading;

  return {
    preferences,
    isLoading,
    setTopics,
    setLocations,
    completeOnboarding,
    updatePreferences,
    needsOnboarding,
  };
}
```

- [ ] **Step 2: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePreferences.ts
git commit -m "feat: add usePreferences hook with Firestore sync"
```

---

## Chunk 2: Onboarding UI

### Task 5: TopicPicker component

**Files:**
- Create: `src/components/onboarding/TopicPicker.tsx`

- [ ] **Step 1: Create topic picker**

Create `src/components/onboarding/TopicPicker.tsx`:
```typescript
import { TOPICS, type Topic } from '@/data/keywords/taxonomy';

const TOPIC_ICONS: Partial<Record<Topic, string>> = {
  politics: '🏛',
  economy: '📈',
  technology: '💻',
  climate: '🌍',
  sports: '⚽',
  health: '🏥',
  education: '📚',
  culture: '🎭',
  crime: '🔒',
  energy: '⚡',
  transport: '🚄',
  housing: '🏠',
  agriculture: '🌾',
  defense: '🛡',
  immigration: '🌐',
  science: '🔬',
  entertainment: '🎬',
  finance: '💰',
  labor: '👷',
  environment: '🌱',
  diplomacy: '🤝',
  religion: '⛪',
  social: '👥',
  media: '📰',
  legal: '⚖️',
};

interface TopicPickerProps {
  selected: Topic[];
  onChange: (topics: Topic[]) => void;
  max?: number;
}

export default function TopicPicker({ selected, onChange, max = 10 }: TopicPickerProps) {
  const toggle = (topic: Topic) => {
    if (selected.includes(topic)) {
      onChange(selected.filter(t => t !== topic));
    } else if (selected.length < max) {
      onChange([...selected, topic]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-ivory-200/60">
          Pick topics you care about
        </p>
        <span className="font-body text-xs text-ivory-200/40">
          {selected.length}/{max}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {TOPICS.map(topic => {
          const isSelected = selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => toggle(topic)}
              className={`
                flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-center
                transition-all duration-200
                ${isSelected
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-ivory-200/10 bg-navy-900/50 text-ivory-200/50 hover:border-ivory-200/30 hover:text-ivory-200/70'
                }
                ${!isSelected && selected.length >= max ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={!isSelected && selected.length >= max}
            >
              <span className="text-lg">{TOPIC_ICONS[topic] || '📄'}</span>
              <span className="font-body text-[11px] capitalize leading-tight">{topic}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/TopicPicker.tsx
git commit -m "feat: add topic picker grid component"
```

---

### Task 6: LocationPicker component

**Files:**
- Create: `src/components/onboarding/LocationPicker.tsx`

- [ ] **Step 1: Create location picker**

Create `src/components/onboarding/LocationPicker.tsx`:
```typescript
import { useState, useMemo } from 'react';
import { MapPin, X, Search } from 'lucide-react';
import { LOCATIONS } from '@/data/geocoding-locations';
import type { PreferenceLocation } from '@/types/preferences';

interface LocationPickerProps {
  selected: PreferenceLocation[];
  onChange: (locations: PreferenceLocation[]) => void;
  max?: number;
}

/**
 * Build searchable location list from LOCATIONS database.
 * Groups by type based on naming conventions.
 */
function buildLocationList(): PreferenceLocation[] {
  return Object.entries(LOCATIONS).map(([key, coords]) => {
    // Determine type from key patterns
    let type: 'city' | 'country' | 'region' = 'city';
    // Keys that are country names (2-word or known countries)
    const countryKeys = ['united states', 'united kingdom', 'south korea', 'south africa',
      'new zealand', 'saudi arabia', 'costa rica', 'sri lanka', 'north korea',
      'france', 'germany', 'spain', 'italy', 'japan', 'china', 'india', 'brazil',
      'australia', 'canada', 'mexico', 'russia', 'turkey', 'egypt', 'nigeria',
      'argentina', 'colombia', 'indonesia', 'thailand', 'vietnam', 'poland',
      'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway',
      'denmark', 'finland', 'portugal', 'greece', 'ireland', 'czech republic'];
    const regionKeys = ['bretagne', 'normandie', 'provence', 'occitanie', 'auvergne',
      'aquitaine', 'alsace', 'lorraine', 'picardie', 'champagne',
      'île-de-france', 'bavière', 'catalonia', 'andalusia', 'lombardy',
      'tuscany', 'scotland', 'wales', 'northern ireland'];

    if (countryKeys.includes(key)) type = 'country';
    else if (regionKeys.some(r => key.includes(r))) type = 'region';

    const name = key
      .split(/[-\s]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return { name, key, lat: coords.lat, lng: coords.lng, type };
  });
}

const ALL_LOCATIONS = buildLocationList();

export default function LocationPicker({ selected, onChange, max = 5 }: LocationPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_LOCATIONS.slice(0, 30); // Show first 30 by default
    const q = search.toLowerCase();
    return ALL_LOCATIONS.filter(loc =>
      loc.name.toLowerCase().includes(q) || loc.key.includes(q)
    ).slice(0, 30);
  }, [search]);

  const add = (loc: PreferenceLocation) => {
    if (selected.length >= max) return;
    if (selected.some(s => s.key === loc.key)) return;
    onChange([...selected, loc]);
  };

  const remove = (key: string) => {
    onChange(selected.filter(s => s.key !== key));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-ivory-200/60">
          Choose locations to follow
        </p>
        <span className="font-body text-xs text-ivory-200/40">
          {selected.length}/{max}
        </span>
      </div>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map(loc => (
            <span
              key={loc.key}
              className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full px-3 py-1 font-body text-xs"
            >
              <MapPin className="w-3 h-3" />
              {loc.name}
              <button
                onClick={() => remove(loc.key)}
                className="hover:text-amber-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-200/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cities, countries, regions..."
          className="w-full bg-navy-900/60 border border-ivory-200/15 rounded-lg pl-10 pr-4 py-2.5 font-body text-sm text-ivory-50 placeholder-ivory-200/30 focus:outline-none focus:border-amber-500/40"
        />
      </div>

      {/* Location list */}
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-ivory-200/10 bg-navy-900/40 p-2">
        {filtered.map(loc => {
          const isSelected = selected.some(s => s.key === loc.key);
          return (
            <button
              key={loc.key}
              onClick={() => isSelected ? remove(loc.key) : add(loc)}
              disabled={!isSelected && selected.length >= max}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors
                ${isSelected
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-ivory-200/60 hover:bg-ivory-200/5 hover:text-ivory-200/80'
                }
                ${!isSelected && selected.length >= max ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-body text-sm flex-1">{loc.name}</span>
              <span className="font-body text-[10px] text-ivory-200/30 capitalize">{loc.type}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="font-body text-xs text-ivory-200/30 text-center py-4">
            No locations found
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/LocationPicker.tsx
git commit -m "feat: add location picker with search"
```

---

### Task 7: OnboardingModal component

**Files:**
- Create: `src/components/onboarding/OnboardingModal.tsx`

- [ ] **Step 1: Create onboarding modal**

Create `src/components/onboarding/OnboardingModal.tsx`:
```typescript
import { useState } from 'react';
import { Flame, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import TopicPicker from './TopicPicker';
import LocationPicker from './LocationPicker';
import type { Topic } from '@/data/keywords/taxonomy';
import type { PreferenceLocation } from '@/types/preferences';

interface OnboardingModalProps {
  onComplete: (topics: Topic[], locations: PreferenceLocation[]) => void;
  onSkip: () => void;
  /** Pre-populate with existing preferences when re-opening via gear icon */
  initialTopics?: Topic[];
  initialLocations?: PreferenceLocation[];
}

type Step = 'welcome' | 'topics' | 'locations';

export default function OnboardingModal({
  onComplete,
  onSkip,
  initialTopics = [],
  initialLocations = [],
}: OnboardingModalProps) {
  // If pre-populated, skip welcome and go straight to topics
  const hasExisting = initialTopics.length > 0 || initialLocations.length > 0;
  const [step, setStep] = useState<Step>(hasExisting ? 'topics' : 'welcome');
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [locations, setLocations] = useState<PreferenceLocation[]>(initialLocations);

  const handleFinish = () => {
    onComplete(topics, locations);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-navy-800 border border-ivory-200/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {(['welcome', 'topics', 'locations'] as Step[]).map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? 'bg-amber-500' : 'bg-ivory-200/20'
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Welcome */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Flame className="w-12 h-12 text-amber-500" />
                  <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
                </div>
              </div>
              <h2 className="font-display text-2xl font-bold text-ivory-50 mb-3">
                Welcome to HeatStory
              </h2>
              <p className="font-body text-sm text-ivory-200/60 mb-8 max-w-sm mx-auto">
                Tell us what you care about and we'll focus the globe on stories that matter to you.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep('topics')}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-navy-900 font-body font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
                >
                  Personalize my feed <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onSkip}
                  className="font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Topics */}
          {step === 'topics' && (
            <div>
              <h2 className="font-display text-xl font-bold text-ivory-50 mb-1">
                Your Topics
              </h2>
              <p className="font-body text-xs text-ivory-200/40 mb-6">
                We'll highlight stories in these categories
              </p>
              <TopicPicker selected={topics} onChange={setTopics} />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex items-center gap-1 font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <button
                  onClick={() => setStep('locations')}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-navy-900 font-body font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Locations */}
          {step === 'locations' && (
            <div>
              <h2 className="font-display text-xl font-bold text-ivory-50 mb-1">
                Your Locations
              </h2>
              <p className="font-body text-xs text-ivory-200/40 mb-6">
                The globe will auto-focus on your first location
              </p>
              <LocationPicker selected={locations} onChange={setLocations} />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep('topics')}
                  className="flex items-center gap-1 font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={topics.length === 0 && locations.length === 0}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-ivory-200/10 disabled:text-ivory-200/30 text-navy-900 font-body font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" /> Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingModal.tsx
git commit -m "feat: add onboarding modal with 3-step flow"
```

---

## Chunk 3: Globe Integration + Page Wiring

### Task 8: RegionJumpPills — multi-region quick navigation

**Files:**
- Create: `src/components/globe/RegionJumpPills.tsx`

- [ ] **Step 1: Create region jump pills**

Create `src/components/globe/RegionJumpPills.tsx`:
```typescript
import { MapPin } from 'lucide-react';
import type { PreferenceLocation } from '@/types/preferences';

interface RegionJumpPillsProps {
  locations: PreferenceLocation[];
  activeIndex: number;
  onJump: (location: PreferenceLocation, index: number) => void;
}

/**
 * Floating pills for jumping between preference regions.
 * Spec: "Quick-jump buttons appear for other preference regions"
 */
export default function RegionJumpPills({ locations, activeIndex, onJump }: RegionJumpPillsProps) {
  if (locations.length <= 1) return null;

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
      {locations.map((loc, i) => (
        <button
          key={loc.key}
          onClick={() => onJump(loc, i)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-xs
            backdrop-blur-sm border transition-all duration-200
            ${i === activeIndex
              ? 'bg-amber-500/25 border-amber-500/50 text-amber-300'
              : 'bg-navy-900/70 border-ivory-200/15 text-ivory-200/60 hover:border-amber-500/30 hover:text-ivory-200/80'
            }
          `}
        >
          <MapPin className="w-3 h-3" />
          {loc.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/globe/RegionJumpPills.tsx
git commit -m "feat: add region jump pills for multi-location navigation"
```

---

### Task 9: Update GlobeView — auto-focus + region pills

**Files:**
- Modify: `src/components/globe/GlobeView.tsx`
- Modify: `src/components/MapSection.tsx`

- [ ] **Step 1: Read current files**

Read `src/components/globe/GlobeView.tsx` and `src/components/MapSection.tsx`.

- [ ] **Step 2: Add preference props and auto-focus to GlobeView**

In `src/components/globe/GlobeView.tsx`:

Add `useCallback` to the React imports (line 1 of GlobeView.tsx):
```typescript
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
```

Add imports:
```typescript
import type { PreferenceLocation } from '@/types/preferences';
import RegionJumpPills from './RegionJumpPills';
```

Update the props interface:
```typescript
interface GlobeViewProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number) => void) => void;
  preferenceLocations?: PreferenceLocation[];
}
```

Update function signature:
```typescript
export default function GlobeView({ articles, onFlyToReady, preferenceLocations = [] }: GlobeViewProps) {
```

Add state for active region (after existing state declarations):
```typescript
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
```

Add a `useEffect` for auto-focus on mount (after the flyTo effect). We serialize the primary location's lat/lng as the dependency to avoid re-firing on every render when the array reference changes:
```typescript
  // Auto-focus on primary preference location on mount
  const primaryLocKey = preferenceLocations.length > 0
    ? `${preferenceLocations[0].lat},${preferenceLocations[0].lng}`
    : '';

  useEffect(() => {
    if (!globeRef.current || !primaryLocKey) return;
    const primary = preferenceLocations[0];
    // Delay to let globe initialize
    const timer = setTimeout(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: primary.lat, lng: primary.lng, altitude: 1.2 },
          1500
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [primaryLocKey]); // eslint-disable-line react-hooks/exhaustive-deps
```

Add region jump handler (before the return statement):
```typescript
  const handleRegionJump = useCallback((loc: PreferenceLocation, index: number) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 1.2 }, 1000);
      setActiveRegionIndex(index);
      onUserInteraction();
    }
  }, [onUserInteraction]);
```

Add `RegionJumpPills` to the JSX return (after the zoom level indicator div):
```tsx
      {/* Region jump pills (signed-in users with multiple locations) */}
      {preferenceLocations.length > 1 && (
        <RegionJumpPills
          locations={preferenceLocations}
          activeIndex={activeRegionIndex}
          onJump={handleRegionJump}
        />
      )}
```

- [ ] **Step 3: Update MapSection to forward preferenceLocations**

In `src/components/MapSection.tsx`, update the interface and forward the prop:

```typescript
interface MapSectionProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number) => void) => void;
  preferenceLocations?: PreferenceLocation[];
}
```

Add import:
```typescript
import type { PreferenceLocation } from '@/types/preferences';
```

Update the destructuring and GlobeView render:
```typescript
export default function MapSection({ articles, onFlyToReady, preferenceLocations }: MapSectionProps) {
```

Pass to GlobeView:
```tsx
<GlobeView articles={articles} onFlyToReady={onFlyToReady} preferenceLocations={preferenceLocations} />
```

- [ ] **Step 4: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/globe/GlobeView.tsx src/components/MapSection.tsx
git commit -m "feat: globe auto-focus on preference locations with region jump"
```

---

### Task 10: PreferencesButton for navbar

**Files:**
- Create: `src/components/PreferencesButton.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Create PreferencesButton**

Create `src/components/PreferencesButton.tsx`:
```typescript
import { Settings } from 'lucide-react';

interface PreferencesButtonProps {
  onClick: () => void;
}

export function PreferencesButton({ onClick }: PreferencesButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg text-navy-700/50 hover:text-amber-600 hover:bg-amber-50 transition-colors"
      title="Preferences"
    >
      <Settings className="w-4 h-4" />
    </button>
  );
}
```

Visibility is controlled by the parent (`Navbar`) — it only renders when `onOpenPreferences` is set, which Index.tsx only passes when the user is signed in.
```

- [ ] **Step 2: Update Navbar**

Read `src/components/Navbar.tsx`, then add the PreferencesButton.

Add import:
```typescript
import { PreferencesButton } from './PreferencesButton';
```

Update the props to accept an `onOpenPreferences` callback:
```typescript
interface NavbarProps {
  onOpenPreferences?: () => void;
}

export default function Navbar({ onOpenPreferences }: NavbarProps) {
```

Inside the existing `<div className="flex items-center gap-4">` (which already wraps `<LoginButton />`), add PreferencesButton before LoginButton:
```tsx
{onOpenPreferences && <PreferencesButton onClick={onOpenPreferences} />}
<LoginButton />
```

Do NOT add a new wrapping `<div>` — the existing one is already there.

- [ ] **Step 3: Commit**

```bash
git add src/components/PreferencesButton.tsx src/components/Navbar.tsx
git commit -m "feat: add preferences gear button to navbar"
```

---

### Task 11: Wire everything into Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx`

This is the integration task. Index.tsx needs to:
1. Use `usePreferences` hook
2. Show `OnboardingModal` when `needsOnboarding` is true
3. Pass `preferenceLocations` to MapSection
4. Pass `onOpenPreferences` to Navbar
5. Show onboarding on Navbar gear click (re-open preferences)

- [ ] **Step 1: Read current Index.tsx**

Read `src/pages/Index.tsx`.

- [ ] **Step 2: Add imports and hook**

Merge `lazy` and `Suspense` into the existing React import on line 1:
```typescript
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
```

Add new imports after the existing ones:
```typescript
import { usePreferences } from '@/hooks/usePreferences';
import type { Topic } from '@/data/keywords/taxonomy';
import type { PreferenceLocation } from '@/types/preferences';
```

Add lazy import for OnboardingModal (after the other imports, before the component):
```typescript
const OnboardingModal = lazy(() => import('@/components/onboarding/OnboardingModal'));
```

Inside the `Index` component, after existing state declarations, add:
```typescript
  const { preferences, needsOnboarding, setTopics, setLocations, completeOnboarding, updatePreferences } = usePreferences();
  const [showPreferences, setShowPreferences] = useState(false);
```

- [ ] **Step 3: Add onboarding handlers**

Add after the existing handlers:
```typescript
  const handleOnboardingComplete = useCallback(async (topics: Topic[], locations: PreferenceLocation[]) => {
    await updatePreferences({
      topics,
      locations,
      onboardingComplete: true,
    });
    setShowPreferences(false);
  }, [updatePreferences]);

  const handleOnboardingSkip = useCallback(async () => {
    await completeOnboarding();
    setShowPreferences(false);
  }, [completeOnboarding]);

  const handleOpenPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);
```

- [ ] **Step 4: Update JSX**

Pass `onOpenPreferences` to Navbar (only when signed in). Add `useAuth` import if not present, or use the `preferences` state:
```tsx
<Navbar onOpenPreferences={preferences.onboardingComplete ? handleOpenPreferences : undefined} />
```

This ensures the gear icon only appears after the user has completed onboarding (and is therefore signed in).

Pass `preferenceLocations` to MapSection:
```tsx
<MapSection
  articles={allArticles}
  onFlyToReady={(fn) => setGlobeFlyTo(() => fn)}
  preferenceLocations={preferences.locations}
/>
```

Add onboarding/preferences modal at the end of the JSX (before the closing `</div>`):
```tsx
      {/* Onboarding / Preferences modal */}
      <Suspense fallback={null}>
        {(needsOnboarding || showPreferences) && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            initialTopics={preferences.topics}
            initialLocations={preferences.locations}
          />
        )}
      </Suspense>
```

- [ ] **Step 5: Verify build and tests**

```bash
npx vite build 2>&1 | tail -10
npx vitest run
```
Expected: Build succeeds, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: integrate preferences + onboarding into Index page"
```

---

### Task 12: Final integration verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 2: Run build**

```bash
npx vite build 2>&1 | tail -10
```
Expected: Build succeeds

- [ ] **Step 3: Start dev server and manual verification**

```bash
npx vite dev
```

Verify in the browser:
1. Anonymous user sees the globe with shared pool data (no onboarding)
2. Sign in with Google works
3. After first sign-in, onboarding modal appears with 3 steps
4. Topic picker: can select up to 10 topics, grid layout with icons
5. Location picker: search works, can select up to 5 locations
6. "Done" saves preferences and closes modal
7. "Skip for now" closes modal, marks onboarding complete (won't show again), but doesn't save topics/locations
8. After onboarding, globe auto-focuses on primary location (1.5s animation)
9. If 2+ locations selected, region jump pills appear in top-right
10. Clicking a pill flies globe to that location
11. Navbar shows gear icon when signed in
12. Clicking gear re-opens preferences modal
13. Preferences persist across page refresh (localStorage cache)
14. Sign out → sign in again → no onboarding (already complete)
15. If Firebase is not configured, app works without preferences (graceful degradation)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: preferences integration polish"
```

---

## Summary

After completing all 12 tasks, user preferences are fully integrated:

- **Firestore + localStorage** — preferences sync across devices, localStorage as fast cache
- **usePreferences hook** — clean API for reading/writing preferences from any component
- **3-step onboarding** — welcome → topics (25 choices, max 10) → locations (566 searchable, max 5)
- **Globe auto-focus** — flies to primary preference location on load
- **Region jump pills** — quick-navigate between multiple preference locations
- **Navbar gear icon** — re-open preferences any time
- **Graceful degradation** — works without Firebase (localStorage-only), works without preferences (shared pool)

**Next plan to write:** Sub-project 5 — API Budget Management + Soft Gate (fetch limiting, shared pool strategy, waitlist UI)
