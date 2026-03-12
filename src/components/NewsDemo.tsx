import { MapPin, Globe, ExternalLink, Calendar, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/types/news';

interface NewsDemoProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  selectedScale?: string;
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

const NewsDemo = ({ articles, isLoading = false, selectedScale = 'all' }: NewsDemoProps) => {
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

        {isLoading && (
          <div className="text-center py-16">
            <Flame className="w-8 h-8 text-amber-400 mx-auto animate-pulse-warm" />
            <p className="mt-4 font-body text-sm text-navy-700/50">Loading today's news...</p>
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {articles.length === 0 ? (
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
              articles.slice(0, 10).map((article, index) => (
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

        {!isLoading && articles.length > 0 && (
          <div className="mt-8 text-center">
            <p className="font-body text-xs text-navy-700/35">
              Showing {Math.min(10, articles.length)} of {articles.length} articles
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsDemo;
