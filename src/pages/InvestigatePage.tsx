// src/pages/InvestigatePage.tsx
import { useMemo, lazy, Suspense } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
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
      return { cluster: state.cluster, article: state.article, loading: false };
    }

    // Refresh fallback: re-derive from localStorage cache
    // Uses getCacheData which handles the 'news_cache_' prefix and expiry checks
    const articleId = searchParams.get('article');
    if (!articleId) return { cluster: null, article: null, loading: false };

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
        if (found) return { cluster, article: found, loading: false };
      }
    } catch {
      // Cache read failed
    }

    return { cluster: null, article: null, loading: false };
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
  const { cluster, article } = useInvestigateData();

  if (!cluster || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-ivory-100 text-lg mb-4">This story is no longer available.</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to map
          </button>
        </div>
      </div>
    );
  }

  const heatColor = heatLevelToColor(cluster.heatLevel);
  const distinctLocations = countDistinctLocations(cluster);
  const allItems = getAllClusterArticles(cluster.articles);
  const tierGroups = groupByTier(allItems);
  const articlesWithCoords = cluster.articles.filter(a => a.coordinates);
  const coverageGap = useMemo(() => analyzeCoverageGap(cluster), [cluster]);
  const geoGap = useMemo(() => analyzeGeographicGap(cluster), [cluster]);
  const perspective = useMemo(() => analyzeEditorialPerspective(cluster.articles), [cluster]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors mb-6 block"
        >
          ← Back to map
        </button>

        {/* Story Header */}
        <h1 className="text-2xl font-bold text-ivory-100 mb-3">
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-ivory-200/60 mb-8">
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{
              backgroundColor: hexToRgbaArc(heatColor, 0.2),
              color: heatColor,
            }}
          >
            {cluster.heatLevel}
          </span>
          <span className="text-ivory-200/30">·</span>
          <span>{cluster.articles.length} sources</span>
          {distinctLocations >= 2 && (
            <>
              <span className="text-ivory-200/30">·</span>
              <span>across {distinctLocations} regions</span>
            </>
          )}
        </div>

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
                          {clusterArticle.title}
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

        {/* Coverage Analysis */}
        {(coverageGap.hasGap || geoGap.hasGeoGap) && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
              Coverage Analysis
            </h2>
            {coverageGap.hasGap && (
              <div className="flex items-center gap-2 text-sm text-amber-400/80">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{coverageGap.gapLabel}</span>
              </div>
            )}
            {coverageGap.imbalanceNote && (
              <p className="text-sm text-ivory-200/40 mt-2">
                {coverageGap.imbalanceNote}
              </p>
            )}
            {/* Geographic gap */}
            {geoGap.hasGeoGap && (
              <div className="mt-3">
                {geoGap.countryGapLabel && (
                  <div className="flex items-center gap-2 text-sm text-amber-400/80">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{geoGap.countryGapLabel}</span>
                  </div>
                )}
                {geoGap.regionalBreakdown.map((rg) => (
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

        {/* Perspective Comparison */}
        {perspective.hasInsights && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-ivory-200/60 mb-3">
              Perspective Comparison
            </h2>
            {perspective.uniqueAngles.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Unique angles</p>
                <ul className="space-y-1">
                  {perspective.uniqueAngles.map((insight, i) => (
                    <li key={i} className="text-sm text-ivory-200/60">
                      {insight.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {perspective.emphasisDifferences.length > 0 && (
              <div>
                <p className="text-xs text-ivory-200/30 uppercase tracking-wide mb-2">Emphasis differences</p>
                <ul className="space-y-1">
                  {perspective.emphasisDifferences.map((insight, i) => (
                    <li key={i} className="text-sm text-ivory-200/60">
                      {insight.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
