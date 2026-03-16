import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bell, Bookmark, Clock, Filter, MapPin, Newspaper, Rss, TrendingDown, TrendingUp } from 'lucide-react';
import { analyzeArticleHeat, heatLevelToColor } from '@/utils/topicClustering';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import { analyzeGeographicGap } from '@/utils/geographicGap';
import { assessStoryPotential, computeTimeline, computeLangBreakdown } from '@/utils/storyBrief';
import { matchesRule, computeStaleHours } from '@/services/watchRules';
import { getCacheData } from '@/utils/cache';
import { getCachedTranslation } from '@/services/translationService';
import { useTranslationPreference } from '@/hooks/useTranslationPreference';
import { useSavedStories, reconstructCluster } from '@/hooks/useSavedStories';
import { useWatchRules } from '@/hooks/useWatchRules';
import useSubscription from '@/hooks/useSubscription';
import { useHeatSnapshot } from '@/hooks/useHeatSnapshot';
import SaveButton from '@/components/investigate/SaveButton';
import AlertsPanel from '@/components/investigate/AlertsPanel';
import SourceFeedsPanel from '@/components/investigate/SourceFeedsPanel';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import type { SavedStory } from '@/types/savedStory';
import type { StoryAlert } from '@/types/watchRule';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortMode = 'heat' | 'timeline' | 'potential';
type DashView = 'all' | 'saved' | 'alerts' | 'feeds';

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
  staleHours: number | null;
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
  const subscription = useSubscription();
  const { showTranslations } = useTranslationPreference();
  const { saved, remove: removeSaved, markViewed } = useSavedStories();
  const { rules, alerts, unreadCount, addAlert } = useWatchRules(subscription.isPaid);
  const [view, setView] = useState<DashView>('all');
  const [sortBy, setSortBy] = useState<SortMode>('heat');
  const [gapOnly, setGapOnly] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshCount(c => c + 1);
    window.addEventListener('cacheRefreshed', handler);
    return () => window.removeEventListener('cacheRefreshed', handler);
  }, []);

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
        staleHours: computeStaleHours(cluster.articles),
      };
    });
  }, [refreshCount, showTranslations]);

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

  // Map leadArticleId → { currentHeat, cluster, lead } for saved story delta detection
  const liveMap = useMemo(() => {
    const map = new Map<string, { heat: number; cluster: StoryCluster; lead: NewsArticle }>();
    for (const e of enriched) map.set(e.lead.id, { heat: e.cluster.heatLevel, cluster: e.cluster, lead: e.lead });
    return map;
  }, [enriched]);

  // Heat snapshot (trending delta vs last session)
  const snapshotEntries = useMemo(
    () => enriched.map(e => ({ id: e.lead.id, heat: e.cluster.heatLevel })),
    [enriched],
  );
  const { getHeatDelta } = useHeatSnapshot(snapshotEntries);

  // Alert matching: fire once per mount when enriched + rules are ready
  const alertMatchedRef = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (enriched.length === 0 || rules.length === 0) return;
    const existingDedupeKeys = new Set(alerts.map(a => a.dedupeKey));
    for (const e of enriched) {
      for (const rule of rules) {
        if (!rule.active) continue;
        const dedupeKey = `${e.lead.id}::${rule.id}`;
        if (existingDedupeKeys.has(dedupeKey) || alertMatchedRef.has(dedupeKey)) continue;
        if (matchesRule(e.lead.title, e.topics, e.cluster.articles, rule)) {
          alertMatchedRef.add(dedupeKey);
          const alert: StoryAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dedupeKey,
            ruleId: rule.id,
            ruleLabel: rule.label,
            triggeredAt: Date.now(),
            headline: e.lead.title,
            leadArticleId: e.lead.id,
            heatLevel: e.cluster.heatLevel,
            read: false,
          };
          addAlert(alert);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, rules]);

  // Summary stats
  const stats = useMemo(() => ({
    total: enriched.length,
    urgent: enriched.filter(e => e.potential.level === 'urgent').length,
    withGaps: enriched.filter(e => e.coverageGap.hasGap || e.hasGeoGap).length,
    stale: enriched.filter(e => (e.staleHours ?? 0) > 4).length,
    totalArticles: enriched.reduce((s, e) => s + e.cluster.articles.length, 0),
  }), [enriched]);

  function openStory(e: EnrichedCluster) {
    navigate(`/app/investigate?article=${e.lead.id}`, {
      state: { cluster: e.cluster, article: e.lead },
    });
  }

  function openSavedStory(story: SavedStory) {
    const live = liveMap.get(story.leadArticleId);
    if (live) {
      markViewed(story.id);
      navigate(`/app/investigate?article=${story.leadArticleId}`, {
        state: { cluster: live.cluster, article: live.lead },
      });
    } else {
      // Reconstruct from stored articles
      const { cluster, article } = reconstructCluster(story);
      markViewed(story.id);
      navigate(`/app/investigate?article=${story.leadArticleId}`, {
        state: { cluster, article },
      });
    }
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
        {stats.stale > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ivory-200/5 border border-ivory-200/12">
            <Clock className="w-3 h-3 text-ivory-200/30" />
            <span className="text-[10px] text-ivory-200/40 font-semibold uppercase tracking-wide">
              {stats.stale} stale
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-ivory-200/5 rounded-lg p-1 overflow-x-auto scrollbar-hide w-full sm:w-auto">
          <button
            onClick={() => setView('all')}
            className={`px-2 py-1 text-xs rounded-md transition-colors sm:px-3 ${view === 'all' ? 'bg-amber-500 text-black font-semibold' : 'text-ivory-200/50 hover:text-ivory-200/80'}`}
          >
            All
          </button>
          <button
            onClick={() => setView('saved')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors sm:px-3 ${view === 'saved' ? 'bg-amber-500 text-black font-semibold' : 'text-ivory-200/50 hover:text-ivory-200/80'}`}
          >
            <Bookmark className="w-3 h-3" />
            Saved{saved.length > 0 && ` (${saved.length})`}
          </button>
          <button
            onClick={() => setView('alerts')}
            className={`relative flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors sm:px-3 ${view === 'alerts' ? 'bg-amber-500 text-black font-semibold' : 'text-ivory-200/50 hover:text-ivory-200/80'}`}
          >
            <Bell className="w-3 h-3" />
            Alerts
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-amber-400 text-black text-[9px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('feeds')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors sm:px-3 ${view === 'feeds' ? 'bg-amber-500 text-black font-semibold' : 'text-ivory-200/50 hover:text-ivory-200/80'}`}
          >
            <Rss className="w-3 h-3" />
            Feeds
          </button>
        </div>

        {view === 'all' && (
          <>
            {/* Sort */}
            <div className="flex items-center gap-1 bg-ivory-200/5 rounded-lg p-1 overflow-x-auto scrollbar-hide">
              {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSortBy(mode)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    sortBy === mode
                      ? 'bg-ivory-200/15 text-ivory-100 font-semibold'
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
          </>
        )}
      </div>

      {/* ── All stories view ─────────────────────────────────────────────── */}
      {view === 'all' && <div className="space-y-3">
        {displayed.map(({ cluster, lead, potential, timeline, coverageGap, hasGeoGap, topSources, topics, langCount, staleHours }) => {
          const heatColor = heatLevelToColor(cluster.heatLevel);
          const distinctRegions = new Set(
            cluster.articles.filter(a => a.coordinates).map(a => a.country ?? a.location ?? ''),
          ).size;
          const hasAnyGap = coverageGap.hasGap || hasGeoGap;
          const title = displayTitle(lead, showTranslations);
          const heatDelta = getHeatDelta(lead.id, cluster.heatLevel);
          const isStale = (staleHours ?? 0) > 4;

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
                  <span className="flex items-center gap-1 text-[10px] text-ivory-200/35 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {timeline.status} ·{' '}
                    {timeline.durationHours < 24
                      ? `${Math.round(timeline.durationHours)}h`
                      : `${Math.round(timeline.durationHours / 24)}d`}
                  </span>
                )}

                {/* Trending delta */}
                {heatDelta !== null && Math.abs(heatDelta) >= 5 && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0 ${heatDelta > 0 ? 'text-emerald-400' : 'text-rose-400/70'}`}>
                    {heatDelta > 0
                      ? <TrendingUp className="w-3 h-3" />
                      : <TrendingDown className="w-3 h-3" />}
                    {heatDelta > 0 ? '+' : ''}{heatDelta}
                  </span>
                )}

                {/* Stale indicator */}
                {isStale && (
                  <span className="flex items-center gap-0.5 text-[10px] text-ivory-200/25 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {staleHours! < 24
                      ? `${Math.round(staleHours!)}h`
                      : `${Math.round(staleHours! / 24)}d`}
                  </span>
                )}

                {/* Save button */}
                <span className="ml-auto" onClick={e => e.stopPropagation()}>
                  <SaveButton
                    cluster={cluster} lead={lead} potential={potential}
                    timeline={timeline} coverageGap={coverageGap} size="sm"
                  />
                </span>
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

                {/* Primary source indicator */}
                {cluster.articles.some(a => a.sourceType === 'primary_source') && (
                  <span className="flex items-center gap-0.5 text-[10px] text-cyan-400/50 flex-shrink-0" title="Contains primary source posts">
                    <Rss className="w-2.5 h-2.5" />
                  </span>
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

        {displayed.length === 0 && gapOnly && (
          <p className="text-center text-sm text-ivory-200/40 py-12">
            No stories with coverage gaps found.
          </p>
        )}
      </div>}

      {/* ── Saved stories view ───────────────────────────────────────────── */}
      {view === 'saved' && (
        <div className="space-y-3">
          {saved.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-8 h-8 text-ivory-200/15 mx-auto mb-3" />
              <p className="text-sm text-ivory-200/40">No saved stories yet.</p>
              <p className="text-xs text-ivory-200/25 mt-1">
                Bookmark stories from the All tab or the Investigate page.
              </p>
            </div>
          ) : (
            [...saved]
              .sort((a, b) => b.savedAt - a.savedAt)
              .map(story => {
                const live = liveMap.get(story.leadArticleId);
                const delta = live ? live.heat - story.heatAtSave : null;
                const heatColor = heatLevelToColor(story.heatAtSave);
                const title = (showTranslations && story.articles[0])
                  ? (getCachedTranslation(story.leadArticleId)?.titleEn ?? story.headline)
                  : story.headline;

                const POTENTIAL_STYLES_SAVED = {
                  urgent:      'text-red-400 border-red-400/30 bg-red-400/8',
                  investigate: 'text-amber-400 border-amber-400/30 bg-amber-400/8',
                  monitor:     'text-ivory-200/35 border-ivory-200/15 bg-transparent',
                };
                const POTENTIAL_EMOJI = { urgent: '🔴', investigate: '🟡', monitor: '⚪' };

                return (
                  <div
                    key={story.id}
                    className="p-4 rounded-xl border border-ivory-200/8 bg-ivory-200/[0.02] hover:bg-ivory-200/[0.05] hover:border-ivory-200/15 transition-all cursor-pointer group"
                    onClick={() => openSavedStory(story)}
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-ivory-200/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${story.heatAtSave}%`, backgroundColor: heatColor }} />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: heatColor }}>
                          {story.heatAtSave}
                        </span>
                      </div>

                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${POTENTIAL_STYLES_SAVED[story.potential]}`}>
                        {POTENTIAL_EMOJI[story.potential]} {story.potential.charAt(0).toUpperCase() + story.potential.slice(1)}
                      </span>

                      {/* Heat delta */}
                      {delta !== null && Math.abs(delta) >= 5 && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0 ${delta > 0 ? 'text-orange-400' : 'text-sky-400'}`}>
                          {delta > 0
                            ? <><TrendingUp className="w-3 h-3" />+{delta}</>
                            : <><TrendingDown className="w-3 h-3" />{delta}</>}
                        </span>
                      )}
                      {!live && (
                        <span className="text-[10px] text-ivory-200/25 flex-shrink-0">archived</span>
                      )}

                      {/* Remove */}
                      <button
                        onClick={e => { e.stopPropagation(); removeSaved(story.id); }}
                        className="ml-auto text-ivory-200/20 hover:text-ivory-200/50 transition-colors flex-shrink-0"
                        title="Remove from watchlist"
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </button>
                    </div>

                    {/* Headline */}
                    <p className="text-sm font-semibold text-ivory-100 leading-snug line-clamp-2 mb-2 group-hover:text-white transition-colors">
                      {title}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] text-ivory-200/40">
                        {story.topSources.slice(0, 3).join(' · ')}
                        {story.sourceCount > story.topSources.length ? ` +${story.sourceCount - story.topSources.length}` : ''}
                      </span>
                      {story.coverageGapLabel && (
                        <span className="text-[10px] text-amber-500/50">⚠ {story.coverageGapLabel}</span>
                      )}
                      <span className="ml-auto text-[10px] text-ivory-200/25">
                        Saved {new Date(story.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400/0 group-hover:text-amber-400/60 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ── Alerts view ──────────────────────────────────────────────────── */}
      {view === 'alerts' && <AlertsPanel isPaid={subscription.isPaid} />}

      {/* ── Source feeds view ────────────────────────────────────────────── */}
      {view === 'feeds' && <SourceFeedsPanel isPaid={subscription.isPaid} />}
    </div>
  );
}
