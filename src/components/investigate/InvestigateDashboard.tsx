import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, Filter, MapPin, Newspaper } from 'lucide-react';
import { analyzeArticleHeat, heatLevelToColor } from '@/utils/topicClustering';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import { analyzeGeographicGap } from '@/utils/geographicGap';
import { assessStoryPotential, computeTimeline, computeLangBreakdown } from '@/utils/storyBrief';
import { getCacheData } from '@/utils/cache';
import { getCachedTranslation } from '@/services/translationService';
import { useTranslationPreference } from '@/hooks/useTranslationPreference';
import { hexToRgbaArc } from '@/utils/arcBuilder';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortMode = 'heat' | 'timeline' | 'potential';

interface EnrichedCluster {
  cluster: StoryCluster;
  lead: NewsArticle;
  potential: ReturnType<typeof assessStoryPotential>;
  timeline: ReturnType<typeof computeTimeline>;
  coverageGap: ReturnType<typeof analyzeCoverageGap>;
  hasGeoGap: boolean;
  topSources: string[];
  topics: string[];
  langCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTopTopics(articles: NewsArticle[], max = 5): string[] {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    if (a.primaryTopic) counts[a.primaryTopic] = (counts[a.primaryTopic] ?? 0) + 1;
    for (const t of a.secondaryTopics ?? []) counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}

function displayTitle(article: NewsArticle, showTranslations: boolean): string {
  if (showTranslations) {
    const cached = getCachedTranslation(article.id);
    if (cached?.titleEn) return cached.titleEn;
  }
  return article.title;
}

const POTENTIAL_STYLES = {
  urgent:      'text-red-400 border-red-400/30 bg-red-400/8',
  investigate: 'text-amber-400 border-amber-400/30 bg-amber-400/8',
  monitor:     'text-ivory-200/35 border-ivory-200/15 bg-transparent',
};

const SORT_LABELS: Record<SortMode, string> = {
  heat:      'Heat',
  timeline:  'Latest',
  potential: 'Priority',
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function InvestigateDashboard() {
  const navigate = useNavigate();
  const { showTranslations } = useTranslationPreference();
  const [sortBy, setSortBy] = useState<SortMode>('heat');
  const [gapOnly, setGapOnly] = useState(false);

  // Load + cluster all cached articles
  const enriched = useMemo<EnrichedCluster[]>(() => {
    const all = [
      ...(getCacheData<NewsArticle[]>('local_news') ?? []),
      ...(getCacheData<NewsArticle[]>('regional_news') ?? []),
      ...(getCacheData<NewsArticle[]>('national_news') ?? []),
      ...(getCacheData<NewsArticle[]>('international_news') ?? []),
    ];
    if (all.length === 0) return [];

    const clusters = analyzeArticleHeat(all, 'international');

    return clusters.map(cluster => {
      const coverageGap = analyzeCoverageGap(cluster);
      const geoGap = analyzeGeographicGap(cluster);
      const potential = assessStoryPotential(cluster, coverageGap, geoGap);
      const timeline = computeTimeline(cluster.articles);
      const langs = computeLangBreakdown(cluster.articles);
      const topSources = [...new Set(cluster.articles.map(a => a.source.name))].slice(0, 4);
      const topics = getTopTopics(cluster.articles);
      // Lead = highest-heat article (first by heat, else most recent)
      const lead = [...cluster.articles].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )[0];

      return {
        cluster,
        lead,
        potential,
        timeline,
        coverageGap,
        hasGeoGap: geoGap.hasGeoGap,
        topSources,
        topics,
        langCount: Object.keys(langs).length,
      };
    });
  }, []);

  // Sort + filter
  const displayed = useMemo(() => {
    let list = gapOnly
      ? enriched.filter(e => e.coverageGap.hasGap || e.hasGeoGap)
      : [...enriched];

    switch (sortBy) {
      case 'heat':
        list.sort((a, b) => b.cluster.heatLevel - a.cluster.heatLevel);
        break;
      case 'timeline':
        list.sort((a, b) =>
          (b.timeline?.latest.getTime() ?? 0) - (a.timeline?.latest.getTime() ?? 0),
        );
        break;
      case 'potential': {
        const order = { urgent: 0, investigate: 1, monitor: 2 };
        list.sort((a, b) => order[a.potential.level] - order[b.potential.level]);
        break;
      }
    }
    return list;
  }, [enriched, sortBy, gapOnly]);

  // Summary stats
  const stats = useMemo(() => ({
    total: enriched.length,
    urgent: enriched.filter(e => e.potential.level === 'urgent').length,
    withGaps: enriched.filter(e => e.coverageGap.hasGap || e.hasGeoGap).length,
    totalArticles: enriched.reduce((s, e) => s + e.cluster.articles.length, 0),
  }), [enriched]);

  function openStory(e: EnrichedCluster) {
    navigate(`/app/investigate?article=${e.lead.id}`, {
      state: { cluster: e.cluster, article: e.lead },
    });
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (enriched.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <Newspaper className="w-10 h-10 text-ivory-200/20 mb-4" />
        <p className="text-ivory-100 font-semibold mb-2">No stories loaded yet</p>
        <p className="text-sm text-ivory-200/40 mb-6">
          Load stories on the map first, then return here for the full overview.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          ← Back to map
        </button>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ivory-100">Story Overview</h1>
          <p className="text-xs text-ivory-200/40 mt-1">
            {stats.totalArticles} articles · {stats.total} active stories
          </p>
        </div>
        <button
          onClick={() => navigate('/app')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
        >
          ← Map
        </button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-6">
        {stats.urgent > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-400/8 border border-red-400/20">
            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">
              🔴 {stats.urgent} Urgent
            </span>
          </div>
        )}
        {stats.withGaps > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400/8 border border-amber-400/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">
              {stats.withGaps} with coverage gaps
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Sort */}
        <div className="flex items-center gap-1 bg-ivory-200/5 rounded-lg p-1">
          {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                sortBy === mode
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-ivory-200/50 hover:text-ivory-200/80'
              }`}
            >
              {SORT_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* Gap filter */}
        <button
          onClick={() => setGapOnly(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            gapOnly
              ? 'text-amber-400 border-amber-400/40 bg-amber-400/8'
              : 'text-ivory-200/40 border-ivory-200/15 hover:border-ivory-200/30'
          }`}
        >
          <Filter className="w-3 h-3" />
          Gaps only
        </button>
      </div>

      {/* Cluster cards */}
      <div className="space-y-3">
        {displayed.map(({ cluster, lead, potential, timeline, coverageGap, hasGeoGap, topSources, topics, langCount }) => {
          const heatColor = heatLevelToColor(cluster.heatLevel);
          const distinctRegions = new Set(
            cluster.articles.filter(a => a.coordinates).map(a => a.country ?? a.location ?? ''),
          ).size;
          const hasAnyGap = coverageGap.hasGap || hasGeoGap;
          const title = displayTitle(lead, showTranslations);

          return (
            <button
              key={cluster.articles[0]?.id}
              onClick={() => openStory({ cluster, lead, potential, timeline, coverageGap, hasGeoGap, topSources, topics, langCount })}
              className="w-full text-left p-4 rounded-xl border border-ivory-200/8 bg-ivory-200/[0.02] hover:bg-ivory-200/[0.05] hover:border-ivory-200/15 transition-all group"
            >
              {/* Top row: heat bar + badges + timeline */}
              <div className="flex items-center gap-2 mb-2.5">
                {/* Heat bar */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-16 h-1.5 bg-ivory-200/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cluster.heatLevel}%`, backgroundColor: heatColor }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: heatColor }}
                  >
                    {cluster.heatLevel}
                  </span>
                </div>

                {/* Potential badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${POTENTIAL_STYLES[potential.level]}`}>
                  {potential.emoji} {potential.label}
                </span>

                {/* Gap indicator */}
                {hasAnyGap && (
                  <AlertTriangle className="w-3 h-3 text-amber-500/60 flex-shrink-0" />
                )}

                {/* Timeline */}
                {timeline && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-ivory-200/35 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {timeline.status} ·{' '}
                    {timeline.durationHours < 24
                      ? `${Math.round(timeline.durationHours)}h`
                      : `${Math.round(timeline.durationHours / 24)}d`}
                  </span>
                )}
              </div>

              {/* Headline */}
              <p className="text-sm font-semibold text-ivory-100 leading-snug line-clamp-2 mb-2 group-hover:text-white transition-colors">
                {title}
              </p>

              {/* Sources + meta */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] text-ivory-200/40">
                  {topSources.slice(0, 3).join(' · ')}
                  {cluster.articles.length > topSources.length
                    ? ` +${cluster.articles.length - topSources.length}`
                    : ''}
                </span>
              </div>

              {/* Bottom row: stats + topics + arrow */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-ivory-200/30">
                  <Newspaper className="w-2.5 h-2.5" />
                  {cluster.articles.length}
                </span>
                {distinctRegions >= 2 && (
                  <span className="flex items-center gap-1 text-[10px] text-ivory-200/30">
                    <MapPin className="w-2.5 h-2.5" />
                    {distinctRegions}
                  </span>
                )}
                {langCount > 1 && (
                  <span className="text-[10px] text-ivory-200/25">{langCount} langs</span>
                )}

                {/* Gap notes */}
                {coverageGap.gapLabel && (
                  <span className="text-[10px] text-amber-500/50">⚠ {coverageGap.gapLabel}</span>
                )}

                {/* Topics */}
                {topics.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    {topics.slice(0, 3).map(t => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-ivory-200/5 border border-ivory-200/8 text-ivory-200/40"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <ArrowRight className="w-3.5 h-3.5 text-amber-400/0 group-hover:text-amber-400/60 transition-colors ml-1 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {displayed.length === 0 && gapOnly && (
        <p className="text-center text-sm text-ivory-200/40 py-12">
          No stories with coverage gaps found.
        </p>
      )}
    </div>
  );
}
