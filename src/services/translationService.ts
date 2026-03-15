/**
 * DeepL translation service with localStorage cache and monthly budget tracking.
 *
 * NOTE: The API key is exposed client-side. Acceptable for a beta/personal tool;
 * move behind a serverless proxy before public launch.
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

// ── DeepL endpoint detection ──────────────────────────────────────────────────

function getApiEndpoint(apiKey: string): string {
  // Free-tier keys end with ':fx'
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
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

export function getCachedTranslation(articleId: string): TranslationResult | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + articleId);
    return stored ? (JSON.parse(stored) as TranslationResult) : null;
  } catch {
    return null;
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
  apiKey: string,
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
    const res = await fetch(getApiEndpoint(apiKey), {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        source_lang: lang.toUpperCase(),
        target_lang: 'EN',
      }),
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
      localStorage.setItem(CACHE_PREFIX + articleId, JSON.stringify(result));
    } catch {
      // localStorage full — still return result for this session
    }
    recordBudget(charCount);

    return result;
  } catch {
    return null;
  }
}
