import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import { buildClusterArcs, countDistinctLocations } from '@/utils/arcBuilder';
import type { ArcData } from '@/utils/arcBuilder';
import { AlertTriangle, ExternalLink, Flame, MapPin } from 'lucide-react';
import { resolveCredibilityByDomain, extractDomain } from '@/utils/credibilityService';
import { getTierLabel, getTierColor, buildSourceBreakdown, getClusterArticles } from './credibilityHelpers';
import { useNavigate } from 'react-router-dom';
import { analyzeCoverageGap } from '@/utils/coverageGap';
import { analyzeGeographicGap } from '@/utils/geographicGap';

interface GlobePopupProps {
  article: NewsArticle;
  position: { x: number; y: number };
  onClose: () => void;
  clusters: StoryCluster[];
  onShowArcs?: (arcs: ArcData[]) => void;
  onFlyToArticle?: (lat: number, lng: number) => void;
}

export default function GlobePopup({ article, position, onClose, clusters, onShowArcs, onFlyToArticle }: GlobePopupProps) {
  const heatLevel = article.heatLevel || 0;
  const { tier } = resolveCredibilityByDomain(extractDomain(article.source.url));
  const cluster = clusters.find(c => c.articles.some(a => a.id === article.id));
  const breakdown = cluster ? buildSourceBreakdown(cluster.sourceDomains) : null;
  const clusterArticles = cluster ? getClusterArticles(cluster.articles, article.id) : [];
  const remainingCount = cluster
    ? cluster.articles.filter(a => a.id !== article.id).length - clusterArticles.length
    : 0;
  const distinctLocations = cluster ? countDistinctLocations(cluster) : 0;
  const showGeoTeaser = distinctLocations >= 2;
  const navigate = useNavigate();
  const showInvestigate = cluster && cluster.articles.length >= 2;
  const coverageGap = cluster ? analyzeCoverageGap(cluster) : null;
  const geoGap = cluster ? analyzeGeographicGap(cluster) : null;

  function hasDifferentLocation(clusterArticle: NewsArticle): boolean {
    if (!article.coordinates || !clusterArticle.coordinates) return false;
    const round = (n: number) => Math.round(n * 10) / 10;
    return (
      round(article.coordinates.lat) !== round(clusterArticle.coordinates.lat) ||
      round(article.coordinates.lng) !== round(clusterArticle.coordinates.lng)
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Popup */}
      <div
        className="fixed z-50 w-80 bg-navy-900/95 backdrop-blur-md border border-amber-500/20 rounded-lg shadow-2xl shadow-black/50 p-4 max-h-[70vh] overflow-y-auto"
        style={{
          left: Math.min(position.x, window.innerWidth - 340),
          top: Math.min(position.y, window.innerHeight - 450),
        }}
      >
        {/* Header with heat indicator */}
        <div className="flex items-start gap-2 mb-2">
          <Flame
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: article.color || '#94A3B8' }}
          />
          <h3 className="font-display text-sm font-semibold text-ivory-50 leading-tight line-clamp-3">
            {article.title}
          </h3>
        </div>

        {/* Source + reach badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-body text-xs text-ivory-200/60">
            {article.source.name}
          </span>
          <span className="font-body text-[10px] text-ivory-200/30">·</span>
          <span className={`font-body text-[10px] ${getTierColor(tier)}`}>
            {getTierLabel(tier)}
          </span>
          {breakdown && breakdown.total > 1 && (
            <span className="font-body text-[10px] text-ivory-200/40">
              Covered by {breakdown.total} sources: {breakdown.summary}
            </span>
          )}
        </div>

        {/* Coverage gap indicator */}
        {coverageGap?.hasGap && (
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
            <span className="font-body text-[10px] text-amber-400/70">
              {coverageGap.gapLabel}
            </span>
          </div>
        )}

        {/* Geographic gap indicator */}
        {geoGap?.hasGeoGap && geoGap.countryGapLabel && (
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
            <span className="font-body text-[10px] text-amber-400/70">
              {geoGap.countryGapLabel}
            </span>
          </div>
        )}

        {/* Topic tags */}
        {article.primaryTopic && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="font-body text-[10px] bg-amber-600/30 text-amber-300 px-1.5 py-0.5 rounded">
              {article.primaryTopic}
            </span>
            {article.secondaryTopics?.slice(0, 2).map(topic => (
              <span
                key={topic}
                className="font-body text-[10px] bg-ivory-200/10 text-ivory-200/50 px-1.5 py-0.5 rounded"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Cluster article list */}
        {clusterArticles.length > 0 && (
          <div className="mb-3">
            <p className="font-body text-[10px] text-ivory-200/40 mb-1.5">Other coverage:</p>
            <div className="space-y-1">
              {clusterArticles.map(({ article: clusterArticle, tierLabel, tierColor }) => (
                <div key={clusterArticle.id} className="flex items-center gap-1">
                  <a
                    href={clusterArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 group flex-1 min-w-0"
                  >
                    <span className="font-body text-[10px] text-ivory-200/60 truncate group-hover:text-ivory-50 transition-colors">
                      <span className="text-ivory-200/80">{clusterArticle.source.name}</span>
                      {' — '}
                      <span className="italic">"{clusterArticle.title}"</span>
                    </span>
                    <span className={`font-body text-[9px] flex-shrink-0 ${tierColor}`}>
                      {tierLabel}
                    </span>
                  </a>
                  {hasDifferentLocation(clusterArticle) && onFlyToArticle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyToArticle(clusterArticle.coordinates!.lat, clusterArticle.coordinates!.lng);
                      }}
                      className="flex-shrink-0 p-0.5 text-ivory-200/30 hover:text-amber-400 transition-colors"
                      title="Fly to location"
                    >
                      <MapPin className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <p className="font-body text-[9px] text-ivory-200/30">
                  and {remainingCount} more source{remainingCount > 1 ? 's' : ''}
                </p>
              )}
              {/* Geographic teaser */}
              {showGeoTeaser && onShowArcs && (
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ivory-200/5">
                  <span className="font-body text-[10px] text-ivory-200/40">
                    Covered across {distinctLocations} regions
                  </span>
                  <button
                    onClick={() => {
                      if (cluster) {
                        const arcs = buildClusterArcs(cluster, article);
                        onShowArcs(arcs);
                      }
                    }}
                    className="font-body text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    See on globe →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Heat bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-[10px] text-ivory-200/40">Coverage heat</span>
            <span className="font-body text-[10px] text-ivory-200/60">{heatLevel}%</span>
          </div>
          <div className="h-1 bg-ivory-200/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${heatLevel}%`,
                backgroundColor: article.color || '#94A3B8',
              }}
            />
          </div>
        </div>

        {/* Link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-body text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Read article <ExternalLink className="w-3 h-3" />
        </a>
        {showInvestigate && (
          <button
            onClick={() => {
              navigate(`/investigate?article=${article.id}`, {
                state: { cluster, article },
              });
            }}
            className="mt-2 flex items-center gap-1.5 font-body text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Investigate this story →
          </button>
        )}
      </div>
    </>
  );
}
