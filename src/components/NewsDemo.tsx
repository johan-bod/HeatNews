import { useState, useMemo } from 'react';
import { MapPin, Globe, ExternalLink, Calendar, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/types/news';

interface NewsDemoProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  selectedScale?: string;
  onArticleLocate?: (lat: number, lng: number) => void;
}

const SCALE_LABELS: Record<string, string> = {
  all: 'All Scales',
  local: 'Local (France)',
  regional: 'Regional (France)',
  national: 'National (Europe)',
  international: 'International',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}

function getHeatColor(level: number): string {
  if (level <= 20) return 'text-slate-400';
  if (level <= 50) return 'text-amber-500';
  if (level <= 75) return 'text-orange-500';
  return 'text-red-500';
}

const NewsDemo = ({ articles, isLoading = false, selectedScale = 'all', onArticleLocate }: NewsDemoProps) => {
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeTopics, setActiveTopics] = useState<string[]>([]);

  const sortedArticles = useMemo(() => {
    let filtered = [...articles];

    // Apply topic filter (OR logic — show articles matching ANY active topic)
    if (activeTopics.length > 0) {
      filtered = filtered.filter(a =>
        a.primaryTopic && activeTopics.includes(a.primaryTopic)
      );
    }

    // Sort by heat score (highest first)
    return filtered.sort((a, b) => (b.heatLevel || 0) - (a.heatLevel || 0));
  }, [articles, activeTopics]);

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    articles.forEach(a => {
      if (a.primaryTopic) topics.add(a.primaryTopic);
    });
    return [...topics].sort();
  }, [articles]);

  const toggleTopic = (topic: string) => {
    setActiveTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
    setVisibleCount(20); // Reset pagination when filter changes
  };

  const clearTopics = () => {
    setActiveTopics([]);
    setVisibleCount(20);
  };

  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-navy-800">
            Today's <span className="text-amber-600 italic">Feed</span>
          </h2>
          <p className="font-body text-sm text-navy-700/50 mt-2">
            {selectedScale === 'all'
              ? 'Live articles from around the world. Click to read.'
              : `Showing ${SCALE_LABELS[selectedScale] || selectedScale} news.`
            }
          </p>
        </div>

        {selectedScale !== 'all' && (
          <div className="mb-6">
            <Badge className="bg-amber-600 text-white font-body text-xs px-3 py-1">
              {SCALE_LABELS[selectedScale]}
            </Badge>
          </div>
        )}

        {/* Inline topic filter */}
        {!isLoading && availableTopics.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={clearTopics}
              className={`px-3 py-1 rounded-full font-body text-xs border transition-colors ${
                activeTopics.length === 0
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-ivory-50 text-navy-700/50 border-amber-200/30 hover:border-amber-300/50'
              }`}
            >
              All
            </button>
            {availableTopics.map(topic => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1 rounded-full font-body text-xs border capitalize transition-colors ${
                  activeTopics.includes(topic)
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-ivory-50 text-navy-700/50 border-amber-200/30 hover:border-amber-300/50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-16">
            <Flame className="w-8 h-8 text-amber-400 mx-auto animate-pulse-warm" />
            <p className="mt-4 font-body text-sm text-navy-700/50">Loading today's news...</p>
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {sortedArticles.length === 0 ? (
              <Card className="bg-ivory-50 border-amber-200/30">
                <CardContent className="p-12 text-center">
                  <Globe className="w-12 h-12 text-amber-300/50 mx-auto mb-4" />
                  <p className="font-body text-sm text-navy-700/50">
                    {selectedScale !== 'all'
                      ? `No articles for ${SCALE_LABELS[selectedScale]}. Try a different scale.`
                      : 'No articles found. Check your API key and refresh.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              sortedArticles.slice(0, visibleCount).map((article, index) => (
                <Card
                  key={article.id}
                  className="bg-ivory-50/80 border-amber-200/20 hover:border-amber-300/50 transition-all duration-300 hover:bg-white cursor-pointer group heat-glow animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Heat indicator bar */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <Flame className={`w-4 h-4 ${getHeatColor(article.heatLevel || 0)}`} />
                        {article.heatLevel ? (
                          <span className={`font-body text-[10px] font-semibold ${getHeatColor(article.heatLevel)}`}>
                            {article.heatLevel}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-semibold text-navy-800 mb-1.5 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                          {article.title}
                        </h3>

                        {article.description && (
                          <p className="font-body text-sm text-navy-700/50 mb-3 line-clamp-2 leading-relaxed">
                            {article.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 font-body text-xs text-navy-700/40">
                          {article.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {article.location}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTimeAgo(article.publishedAt)}
                          </span>

                          {article.scale && (
                            <Badge variant="outline" className="text-[10px] capitalize border-amber-200/40 text-navy-700/50 font-body">
                              {article.scale}
                            </Badge>
                          )}

                          {article.category && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 font-body">
                              {article.category}
                            </Badge>
                          )}

                          {onArticleLocate && article.coordinates && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onArticleLocate(article.coordinates!.lat, article.coordinates!.lng); }}
                              className="flex items-center gap-1 font-body text-xs text-amber-500/60 hover:text-amber-400 transition-colors"
                            >
                              <MapPin className="w-3 h-3" /> Locate on globe
                            </button>
                          )}
                        </div>
                      </div>

                      <ExternalLink className="w-4 h-4 text-navy-700/20 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {!isLoading && sortedArticles.length > 0 && (
          <div className="mt-8 text-center space-y-3">
            <p className="font-body text-xs text-navy-700/35">
              Showing {Math.min(visibleCount, sortedArticles.length)} of {sortedArticles.length} articles
            </p>
            {visibleCount < sortedArticles.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="font-body text-sm text-amber-600 hover:text-amber-500 transition-colors border border-amber-200/40 px-6 py-2 rounded-lg hover:bg-amber-50"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsDemo;
