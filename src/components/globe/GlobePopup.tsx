import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import { ExternalLink, Flame } from 'lucide-react';

interface GlobePopupProps {
  article: NewsArticle;
  position: { x: number; y: number };
  onClose: () => void;
  clusters: StoryCluster[];
}

export default function GlobePopup({ article, position, onClose, clusters: _clusters }: GlobePopupProps) {
  const heatLevel = article.heatLevel || 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Popup */}
      <div
        className="fixed z-50 w-80 bg-navy-900/95 backdrop-blur-md border border-amber-500/20 rounded-lg shadow-2xl shadow-black/50 p-4"
        style={{
          left: Math.min(position.x, window.innerWidth - 340),
          top: Math.min(position.y, window.innerHeight - 300),
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
          {article.coverage && article.coverage > 1 && (
            <span className="font-body text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              {article.coverage} sources
            </span>
          )}
        </div>

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
      </div>
    </>
  );
}
