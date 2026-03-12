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
