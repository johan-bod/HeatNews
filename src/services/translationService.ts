/**
 * DeepL translation service with localStorage cache and monthly budget tracking.
 * API key is server-side only — requests are proxied through /api/translate.
 */

const CACHE_PREFIX = 'ht-trans-v1-';
const BUDGET_KEY = 'ht-trans-budget';

/** Conservative soft cap — leaves 50k buffer below DeepL free tier (500k/month) */
const MONTHLY_CHAR_LIMIT = 450_000;

export interface TranslationResult {
  titleEn: string;
  descriptionEn: string;
  detectedLang: string; // lowercase, e.g. 'fr'
}

interface BudgetState {
  month: string; // 'YYYY-MM'
  chars: number;
}

// ── Budget tracking ───────────────────────────────────────────────────────────

function getBudget(): BudgetState {
  try {
    const stored = localStorage.getItem(BUDGET_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as BudgetState;
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (parsed.month === currentMonth) return parsed;
    }
  } catch {
    // localStorage unavailable
  }
  return { month: new Date().toISOString().slice(0, 7), chars: 0 };
}

function recordBudget(chars: number): void {
  try {
    const budget = getBudget();
    budget.chars += chars;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  } catch {
    // ignore
  }
}

export function isBudgetExceeded(): boolean {
  return getBudget().chars >= MONTHLY_CHAR_LIMIT;
}

export function getMonthlyUsage(): { chars: number; limit: number; pct: number } {
  const { chars } = getBudget();
  return { chars, limit: MONTHLY_CHAR_LIMIT, pct: Math.round((chars / MONTHLY_CHAR_LIMIT) * 100) };
}

// ── Translation cache ─────────────────────────────────────────────────────────

const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedTranslation extends TranslationResult {
  cachedAt: number; // Date.now()
}

export function getCachedTranslation(articleId: string): TranslationResult | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + articleId);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CachedTranslation;
    // Treat entries without cachedAt (legacy) or older than 30 days as cache misses
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > MAX_CACHE_AGE_MS) {
      localStorage.removeItem(CACHE_PREFIX + articleId);
      return null;
    }
    // Strip cachedAt before returning so the public API is TranslationResult
    const { cachedAt: _cachedAt, ...result } = parsed;
    return result;
  } catch {
    return null;
  }
}

/** Remove all ht-trans-v1-* entries older than 30 days. */
function pruneTranslationCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Partial<CachedTranslation>;
            if (!parsed.cachedAt || Date.now() - parsed.cachedAt > MAX_CACHE_AGE_MS) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key); // unparseable — remove it
          }
        }
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage unavailable
  }
}

// ── Main translation function ─────────────────────────────────────────────────

/**
 * Translate an article's title and description to English via DeepL.
 * Returns null when: source is already English, budget exceeded, API error, or no key.
 * Result is cached in localStorage by articleId.
 */
export async function translateArticle(
  articleId: string,
  title: string,
  description: string | undefined,
  sourceLang: string,
): Promise<TranslationResult | null> {
  // Already English — no-op
  const lang = sourceLang.toLowerCase().slice(0, 2);
  if (lang === 'en') return null;

  // Check cache first
  const cached = getCachedTranslation(articleId);
  if (cached) return cached;

  // Budget gate
  if (isBudgetExceeded()) return null;

  // Build batch: always title, description only if present
  const texts = description ? [title, description] : [title];
  const charCount = texts.reduce((sum, t) => sum + t.length, 0);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts, sourceLang: lang.toUpperCase() }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      translations: { detected_source_language: string; text: string }[];
    };
    const t = data.translations;

    const result: TranslationResult = {
      titleEn: t[0]?.text ?? title,
      descriptionEn: t[1]?.text ?? description ?? '',
      detectedLang: (t[0]?.detected_source_language ?? lang).toLowerCase(),
    };

    try {
      const entry: CachedTranslation = { ...result, cachedAt: Date.now() };
      localStorage.setItem(CACHE_PREFIX + articleId, JSON.stringify(entry));
      // Prune stale cache entries only when the cache grows large
      let cacheKeyCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) cacheKeyCount++;
      }
      if (cacheKeyCount > 200) pruneTranslationCache();
    } catch {
      // localStorage full — still return result for this session
    }
    recordBudget(charCount);

    return result;
  } catch {
    return null;
  }
}
