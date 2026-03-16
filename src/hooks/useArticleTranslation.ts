import { useState, useEffect } from 'react';
import { getCachedTranslation, translateArticle } from '@/services/translationService';
import { useTranslationPreference } from '@/hooks/useTranslationPreference';
import type { NewsArticle } from '@/types/news';

export interface ArticleTranslation {
  /** Title to display (translated or original depending on global preference) */
  displayTitle: string;
  /** Description to display (translated or original depending on global preference) */
  displayDescription: string | undefined;
  /** Detected or known source language, e.g. 'fr'. Undefined for English articles. */
  detectedLang: string | undefined;
  /** Translation is being fetched from DeepL */
  isTranslating: boolean;
  /** A translation was successfully loaded (from cache or API) */
  hasTranslation: boolean;
  /** Currently showing the original (non-English) text */
  showOriginal: boolean;
  /** Toggle the global translation preference */
  toggle: () => void;
}

/**
 * Translates a single article to English on mount (lazy, cached per article ID).
 * Respects the global translation preference (auto-detected from navigator.language
 * on first visit, persisted in localStorage).
 * No-ops when article is already in English (server returns 503 if DeepL is not configured).
 */
export function useArticleTranslation(article: NewsArticle): ArticleTranslation {
  const lang = (article.language ?? 'en').toLowerCase().slice(0, 2);
  const needsTranslation = lang !== 'en';

  const { showTranslations, toggle } = useTranslationPreference();

  const [trans, setTrans] = useState(() =>
    needsTranslation ? getCachedTranslation(article.id) : null,
  );
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!needsTranslation || trans) return;

    // Only fetch from DeepL if the user wants translations
    if (!showTranslations) return;

    setIsTranslating(true);
    translateArticle(article.id, article.title, article.description, lang)
      .then(result => { if (result) setTrans(result); })
      .finally(() => setIsTranslating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, showTranslations]);

  const hasTranslation = !!trans;
  const useTranslated = hasTranslation && showTranslations;

  return {
    displayTitle: useTranslated ? trans!.titleEn : article.title,
    displayDescription: useTranslated
      ? (trans!.descriptionEn || article.description)
      : article.description,
    detectedLang: trans?.detectedLang ?? (lang !== 'en' ? lang : undefined),
    isTranslating,
    hasTranslation,
    showOriginal: !showTranslations,
    toggle,
  };
}
