// src/pages/InvestigatePage.tsx
import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Languages, Lock, MapPin, Rss } from 'lucide-react';
import useSubscription from '@/hooks/useSubscription';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import { analyzeArticleHeat, heatLevelToColor } from '@/utils/topicClustering';
import { hexToRgbaArc, countDistinctLocations } from '@/utils/arcBuilder';
import { getAllClusterArticles, getTierLabel, getTierColor } from '@/components/globe/credibilityHelpers';
import type { ClusterArticleItem } from '@/components/globe/credibilityHelpers';
import type { CredibilityTier } from '@/data/media-types';
import { formatTimeAgo } from '@/utils/formatTime';
import { getCacheData } from '@/utils/cache';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import { analyzeGeographicGap } from '@/utils/geographicGap';
import { getCountryName } from '@/utils/countryNames';
import { analyzeEditorialPerspective } from '@/utils/editorialPerspective';
import { useArticleTranslation } from '@/hooks/useArticleTranslation';
import { useTranslationPreference } from '@/hooks/useTranslationPreference';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getCachedTranslation, translateArticle, type TranslationResult } from '@/services/translationService';
import {
  assessStoryPotential,
  computeTimeline,
  computeLangBreakdown,
} from '@/utils/storyBrief';
import ExportBriefButton from '@/components/investigate/ExportBriefButton';
import SaveButton from '@/components/investigate/SaveButton';
import InvestigateDashboard from '@/components/investigate/InvestigateDashboard';
const ClusterMiniMap = lazy(() => import('@/components/investigate/ClusterMiniMap'));
interface InvestigateState {
  cluster: StoryCluster;
  article: NewsArticle;
}

function useInvestigateData() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as InvestigateState | null;

  return useMemo(() => {
    // Fast path: route state available
    if (state?.cluster && state?.article) {
      return { cluster: state.cluster, article: state.article, loading: false, hasArticleParam: true };
    }

    // Refresh fallback: re-derive from localStorage cache
    // Uses getCacheData which handles the 'news_cache_' prefix and expiry checks
    const articleId = searchParams.get('article');
    if (!articleId) return { cluster: null, article: null, loading: false, hasArticleParam: false };

    try {
      const localNews = getCacheData<NewsArticle[]>('local_news') || [];
      const regionalNews = getCacheData<NewsArticle[]>('regional_news') || [];
      const nationalNews = getCacheData<NewsArticle[]>('national_news') || [];
      const international = getCacheData<NewsArticle[]>('international_news') || [];
      const allArticles = [...localNews, ...regionalNews, ...nationalNews, ...international];

      if (allArticles.length === 0) return { cluster: null, article: null, loading: false };

      const clusters = analyzeArticleHeat(allArticles, 'international');
      for (const cluster of clusters) {
        const found = cluster.articles.find(a => a.id === articleId);
        if (found) return { cluster, article: found, loading: false, hasArticleParam: true };
      }
    } catch {
      // Cache read failed
    }

    return { cluster: null, article: null, loading: false, hasArticleParam: true };
  }, [state, searchParams]);
}

export function groupByTier(items: ClusterArticleItem[]): { tier: CredibilityTier; items: ClusterArticleItem[] }[] {
  const groups: { tier: CredibilityTier; items: ClusterArticleItem[] }[] = [];
  let currentTier: CredibilityTier | null = null;

  for (const item of items) {
    if (item.tier !== currentTier) {
      groups.push({ tier: item.tier, items: [item] });
      currentTier = item.tier;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  return groups;
}

export default function InvestigatePage() {
  const navigate = useNavigate();
  const { isPaid } = useSubscription();
  const { cluster, article, hasArticleParam } = useInvestigateData();
  const pageTitle = cluster && article
    ? `${article.title.slice(0, 60)}${article.title.length > 60 ? '…' : ''} — HeatStory`
    : 'Investigate — HeatStory';
  useDocumentTitle(pageTitle);
  const coverageGap = useMemo(() => cluster ? analyzeCoverageGap(cluster) : null, [cluster]);
  const geoGap = useMemo(() => cluster ? analyzeGeographicGap(cluster) : null, [cluster]);
  const perspective = useMemo(() => cluster ? analyzeEditorialPerspective(cluster.articles) : null, [cluster]);

  // ── Translation ────────────────────────────────────────────────────────────
  const mainTranslation = useArticleTranslation(article ?? { id: '', title: '', url: '', publishedAt: '', source: { name: '' }, language: 'en' });

  const { showTranslations, toggle: toggleTranslations } = useTranslationPreference();
  const [clusterTrans, setClusterTrans] = useState<Map<string, TranslationResult>>(() => {
    if (!cluster) return new Map();
    const map = new Map<string, TranslationResult>();
    for (const a of cluster.articles) {
      const cached = getCachedTranslation(a.id);
      if (cached) map.set(a.id, cached);
    }
    return map;
  });

  useEffect(() => {
    if (!showTranslations || !cluster) return;
    const toTranslate = cluster.articles.filter(a => {
      const lang = (a.language ?? 'en').toLowerCase().slice(0, 2);
      return lang !== 'en' && !clusterTrans.has(a.id);
    });
    if (toTranslate.length === 0) return;

    Promise.all(
      toTranslate.map(a =>
        translateArticle(a.id, a.title, a.description, a.language ?? 'fr')
          .then(result => (result ? { id: a.id, result } : null))
      ),
    ).then(results => {
      const next = new Map(clusterTrans);
      for (const item of results) {
        if (item) next.set(item.id, item.result);
      }
      setClusterTrans(next);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslations, cluster]);

  const hasAnyNonEnglish = cluster
    ? cluster.articles.some(a => (a.language ?? 'en').toLowerCase().slice(0, 2) !== 'en')
    : false;

  function getClusterTitle(a: NewsArticle): string {
    if (!showTranslations) return a.title;
    return clusterTrans.get(a.id)?.titleEn ?? a.title;
  }

  if (!cluster || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {hasArticleParam ? (
            // Specific article was requested but couldn't be found
            <>
              <p className="text-ivory-100 text-lg mb-4">This story is no longer available.</p>
              <button
                onClick={() => navigate('/app/investigate')}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                ← View all stories
              </button>
            </>
          ) : (
            // No article param — show the dashboard
            <InvestigateDashboard />
          )}
        </div>
      </div>
    );
  }

  const heatColor = heatLevelToColor(cluster.heatLevel);
  const distinctLocations = countDistinctLocations(cluster);
  const allItems = getAllClusterArticles(cluster.articles);
  const tierGroups = groupByTier(allItems);
  const articlesWithCoords = cluster.articles.filter(a => a.coordinates);

  // ── Brief enrichment ────────────────────────────────────────────────────────
  const potential = assessStoryPotential(cluster, coverageGap, geoGap);
  const timeline = computeTimeline(cluster.articles);
  const langBreakdown = computeLangBreakdown(cluster.articles);
  const topLangs = Object.entries(langBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const LANG_NAMES: Record<string, string> = {
    fr: 'FR', en: 'EN', de: 'DE', es: 'ES', it: 'IT', ar: 'AR', pt: 'PT', nl: 'NL',
  };
  const POTENTIAL_COLORS: Record<string, string> = {
    urgent: 'text-red-400 border-red-400/40 bg-red-400/10',
    investigate: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
    monitor: 'text-ivory-200/40 border-ivory-200/20 bg-ivory-200/5',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation + Export */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/investigate')}
              className="text-sm text-ivory-200/40 hover:text-amber-400 transition-colors"
            >
              ← All stories
            </button>
            <button
              onClick={() => navigate('/app')}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Map
            </button>
          </div>
          <div className="flex items-center gap-3">
            <SaveButton
              cluster={cluster} lead={article} potential={potential}
              timeline={timeline} coverageGap={coverageGap} isPaid={isPaid}
            />
            {isPaid
              ? <ExportBriefButton input={{ article, cluster, coverageGap, geoGap, perspective }} />
              : (
                <Link
                  to="/pricing"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ivory-200/30 border border-ivory-200/10 rounded-md hover:border-amber-500/30 hover:text-amber-400/60 transition-colors"
                  title="Upgrade to Pro to export investigation briefs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Export Brief
                </Link>
              )
            }
          </div>
        </div>

        {/* Story Header */}
        <h1 className="text-2xl font-bold text-ivory-100 mb-3">
          {mainTranslation.displayTitle}
        </h1>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-2 text-sm text-ivory-200/60 mb-2">
          {/* Heat */}
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: hexToRgbaArc(heatColor, 0.2), color: heatColor }}
          >
            {cluster.heatLevel}
          </span>

          {/* Story potential */}
          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${POTENTIAL_COLORS[potential.level]}`}>
            {potential.emoji} {potential.label}
          </span>

          <span className="text-ivory-200/30">·</span>
          <span>{cluster.articles.length} sources</span>

          {distinctLocations >= 2 && (
            <>
              <span className="text-ivory-200/30">·</span>
              <span>across {distinctLocations} regions</span>
            </>
          )}

          {/* Timeline */}
          {timeline && (
            <>
              <span className="text-ivory-200/30">·</span>
              <span className="text-xs text-ivory-200/50">
                {timeline.status} ·{' '}
                {timeline.durationHours < 24
                  ? `${Math.round(timeline.durationHours)}h`
                  : `${Math.round(timeline.durationHours / 24)}d`}
              </span>
            </>
          )}

          {/* Translation toggle */}
          {hasAnyNonEnglish && (
            <>
              <span className="text-ivory-200/30">·</span>
              <button
                onClick={toggleTranslations}
                className="flex items-center gap-1 text-xs text-ivory-200/40 hover:text-amber-400 transition-colors"
                title={showTranslations ? 'Show original languages' : 'Show English translations'}
              >
                <Languages className="w-3 h-3" />
                {showTranslations ? 'Translated · show originals' : 'Originals · show EN'}
              </button>
            </>
          )}
        </div>

        {/* Language breakdown */}
        {topLangs.length > 1 && (
          <div className="flex items-center gap-2 mb-8">
            {topLangs.map(([lang, count]) => (
              <span
                key={lang}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ivory-200/5 text-ivory-200/40 border border-ivory-200/10"
              >
                {LANG_NAMES[lang] ?? lang.toUpperCase()} {count}
              </span>
            ))}
          </div>
        )}
        {topLangs.length <= 1 && <div className="mb-4" />}

        {/* Story summary — lead article description */}
        {article.description && (
          <p className="text-sm text-ivory-200/60 leading-relaxed mb-8 pl-3 border-l-2 border-amber-500/30">
            {article.description}
          </p>
        )}

        {/* Source List by Tier */}
        <div className="space-y-6 mb-10">
          {tierGroups.map(({ tier, items }) => (
            <div key={tier} className="border border-ivory-200/10 rounded-lg p-4">
              {/* Tier header */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ivory-200/40 mb-3">
                <span className={getTierColor(tier)}>●</span>
                <span>{getTierLabel(tier)}</span>
              </div>
              {/* Article rows */}
              <div className="divide-y divide-ivory-200/5">
                {items.map(({ article: clusterArticle }) => (
                  <div key={clusterArticle.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-ivory-100">
                          {clusterArticle.source.name}
                        </span>
                        <a
                          href={clusterArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-ivory-200/80 hover:text-ivory-100 transition-colors truncate"
                        >
                          {getClusterTitle(clusterArticle)}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-ivory-200/40">
                            {formatTimeAgo(clusterArticle.publishedAt)}
                          </span>
                          {clusterArticle.location && clusterArticle.country && (
                            <span className="flex items-center gap-1 text-xs text-ivory-200/40">
                              <MapPin className="w-3 h-3" />
                              {clusterArticle.location}, {getCountryName(clusterArticle.country)}
                            </span>
                          )}
                          {clusterArticle.location && !clusterArticle.country && (
                            <span className="flex items-center gap-1 text-xs text-ivory-200/40">
                              <MapPin className="w-3 h-3" />
                              {clusterArticle.location}
                            </span>
                          )}
                          {!clusterArticle.location && clusterArticle.country && (
                            <span className="flex items-center gap-1 text-xs text-ivory-200/40">
                              <MapPin className="w-3 h-3" />
                              {getCountryName(clusterArticle.country)}
                            </span>
                          )}
                          {!clusterArticle.location && !clusterArticle.country && clusterArticle.coordinates && (
                            <MapPin className="w-3 h-3 text-ivory-200/30" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Primary Sources */}
        {(() => {
          const primarySources = cluster.articles.filter(a => a.sourceType === 'primary_source');
          if (primarySources.length === 0) return null;
          return (
            <div className="border border-cyan-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-400/60 mb-3">
                <Rss className="w-3 h-3" />
                <span>Primary Sources</span>
                <span className="normal-case text-cyan-400/40">({primarySources.length})</span>
              </div>
              <div className="divide-y divide-ivory-200/5">
                {primarySources.map(a => (
                  <div key={a.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-cyan-300/80">
                          {a.source.name}
                        </span>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-ivory-200/70 hover:text-ivory-100 transition-colors"
                        >
                          {getClusterTitle(a)}
                        </a>
                        <span className="text-xs text-ivory-200/40">
                          {formatTimeAgo(a.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Coverage Analysis */}
        {(coverageGap?.hasGap || geoGap?.hasGeoGap) && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
              Coverage Analysis
            </h2>
            {coverageGap?.hasGap && (
              <div className="flex items-center gap-2 text-sm text-amber-400/80">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{coverageGap!.gapLabel}</span>
              </div>
            )}
            {coverageGap?.imbalanceNote && (
              <p className="text-sm text-ivory-200/40 mt-2">
                {coverageGap!.imbalanceNote}
              </p>
            )}
            {/* Geographic gap */}
            {geoGap?.hasGeoGap && (
              <div className="mt-3">
                {geoGap?.countryGapLabel && (
                  <div className="flex items-center gap-2 text-sm text-amber-400/80">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{geoGap!.countryGapLabel}</span>
                  </div>
                )}
                {geoGap!.regionalBreakdown.map((rg) => (
                  <div key={rg.country} className="mt-2">
                    {rg.coveredRegions.length > 0 && (
                      <p className="text-sm text-ivory-200/40">
                        Covered in {rg.coveredRegions.join(', ')}
                      </p>
                    )}
                    {rg.missingRegions.length > 0 && (
                      <p className="text-sm text-amber-400/60">
                        Not covered in {rg.missingRegions.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Perspective Comparison — Pro feature */}
        {perspective?.hasInsights && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
              Perspective Comparison
            </h2>
            {isPaid ? (
              <>
                {perspective!.uniqueAngles.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Unique angles</p>
                    <ul className="space-y-1">
                      {perspective!.uniqueAngles.map((insight, i) => (
                        <li key={i} className="text-sm text-ivory-200/60">{insight.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {perspective!.emphasisDifferences.length > 0 && (
                  <div>
                    <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Emphasis differences</p>
                    <ul className="space-y-1">
                      {perspective!.emphasisDifferences.map((insight, i) => (
                        <li key={i} className="text-sm text-ivory-200/60">{insight.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-6 text-center">
                <Lock className="w-4 h-4 text-amber-500/50 mx-auto mb-2" />
                <p className="text-xs text-ivory-200/50 mb-3">Perspective analysis is a Pro feature.</p>
                <Link to="/pricing" className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors">
                  Upgrade to Pro →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Key Themes */}
        {(() => {
          const crossThemes = perspective?.emphasisDifferences.map(d => d.entity) ?? [];
          const topics = cluster.articles
            .flatMap(a => [a.primaryTopic, ...(a.secondaryTopics ?? [])])
            .filter((t): t is string => !!t);
          const topicCounts = topics.reduce<Record<string, number>>((acc, t) => {
            acc[t] = (acc[t] ?? 0) + 1; return acc;
          }, {});
          const topTopics = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([t]) => t);
          const all = [...new Set([...crossThemes, ...topTopics])].slice(0, 12);
          if (all.length === 0) return null;
          return (
            <div className="mb-10">
              <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">Key Themes & Entities</h2>
              <div className="flex flex-wrap gap-2">
                {all.map(t => (
                  <span
                    key={t}
                    className="text-xs px-2 py-1 rounded-full bg-ivory-200/5 border border-ivory-200/10 text-ivory-200/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Geographic Spread */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
            Geographic Spread
          </h2>
          {articlesWithCoords.length > 0 ? (
            <>
              <p className="text-sm text-ivory-200/40 mb-2">
                This story is covered from {distinctLocations} distinct location{distinctLocations !== 1 ? 's' : ''}
              </p>
              <Suspense fallback={<div style={{ height: 280 }} />}>
                <ClusterMiniMap articles={articlesWithCoords} heatColor={heatColor} />
              </Suspense>
              <ul className="space-y-1 mt-4">
                {articlesWithCoords.map(a => (
                  <li key={a.id} className="text-sm text-ivory-200/60">
                    {a.source.name} — {a.location && a.country
                      ? `${a.location}, ${getCountryName(a.country)}`
                      : a.location
                      ? a.location
                      : a.country
                      ? getCountryName(a.country)
                      : `${a.coordinates!.lat.toFixed(1)}, ${a.coordinates!.lng.toFixed(1)}`
                    }
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ivory-200/40">
              No geographic data available for this cluster
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
