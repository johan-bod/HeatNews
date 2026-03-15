import { useState, useCallback } from 'react';

const PREF_KEY = 'ht-trans-pref';

/**
 * Detect a sensible default from the browser language.
 * French speakers → prefer originals (false).
 * Everyone else   → prefer English translations (true).
 */
function detectDefault(): boolean {
  try {
    const lang = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
    return !lang.startsWith('fr');
  } catch {
    return true;
  }
}

/**
 * Global, persisted translation preference.
 * Returns whether to show English translations (true) or originals (false).
 *
 * First visit: auto-detected from navigator.language.
 * Subsequent visits: restored from localStorage.
 * Changing the preference persists immediately.
 */
export function useTranslationPreference(): {
  showTranslations: boolean;
  toggle: () => void;
  setShowTranslations: (v: boolean) => void;
} {
  const [showTranslations, _set] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY);
      if (stored !== null) return stored === 'en';
    } catch {
      // localStorage unavailable
    }
    const defaultVal = detectDefault();
    // Persist the detected default so it doesn't re-detect on next load
    try { localStorage.setItem(PREF_KEY, defaultVal ? 'en' : 'original'); } catch { /* noop */ }
    return defaultVal;
  });

  const setShowTranslations = useCallback((v: boolean) => {
    _set(v);
    try { localStorage.setItem(PREF_KEY, v ? 'en' : 'original'); } catch { /* noop */ }
  }, []);

  const toggle = useCallback(() => {
    setShowTranslations(!showTranslations);
  }, [showTranslations, setShowTranslations]);

  return { showTranslations, toggle, setShowTranslations };
}
