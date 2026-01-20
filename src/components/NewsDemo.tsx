import React, { useState } from 'react';
import { MapPin, Globe, Building, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/types/news';

interface NewsDemoProps {
  articles: NewsArticle[];
  isLoading?: boolean;
}

const NewsDemo = ({ articles, isLoading = false }: NewsDemoProps) => {
  const [selectedScope, setSelectedScope] = useState<'all' | 'uk' | 'world'>('all');

  // Filter articles by scope
  const filteredArticles = articles.filter(article => {
    if (selectedScope === 'all') return true;

    const location = article.location?.toLowerCase() || '';
    const category = article.category?.toLowerCase() || '';

    if (selectedScope === 'uk') {
      return (
        location.includes('uk') ||
        location.includes('london') ||
        location.includes('manchester') ||
        location.includes('edinburgh') ||
        location.includes('glasgow') ||
        category.includes('uk')
      );
    }

    if (selectedScope === 'world') {
      return !location.includes('uk') && !location.includes('london');
    }

    return true;
  });

  const scopes = [
    { id: 'all', label: 'All News', icon: Globe, color: 'text-blue-400' },
    { id: 'uk', label: 'UK News', icon: MapPin, color: 'text-red-400' },
    { id: 'world', label: 'World News', icon: Building, color: 'text-purple-400' }
  ];

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Today's News from
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> The Guardian</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Live news articles from around the world. Click any article to read the full story.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-2 border border-slate-300/50 shadow-sm">
            {scopes.map((scope) => {
              const Icon = scope.icon;
              return (
                <Button
                  key={scope.id}
                  variant={selectedScope === scope.id ? "default" : "ghost"}
                  className={`font-lato mx-1 rounded-full px-6 py-3 transition-all duration-300 ${
                    selectedScope === scope.id
                      ? 'bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-lg'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                  onClick={() => setSelectedScope(scope.id as any)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {scope.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="mt-4 font-lato text-slate-600">Loading today's news...</p>
          </div>
        )}

        {/* News Feed */}
        {!isLoading && (
          <div className="grid gap-4 max-w-3xl mx-auto">
            {filteredArticles.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-300/50">
                <CardContent className="p-12 text-center">
                  <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="font-lato text-slate-500">No articles found for this filter</p>
                </CardContent>
              </Card>
            ) : (
              filteredArticles.slice(0, 10).map((article) => (
                <Card
                  key={article.id}
                  className="bg-white/70 backdrop-blur-sm border-slate-300/50 hover:border-red-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10 cursor-pointer group"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-montserrat text-lg font-semibold text-slate-800 mb-2 group-hover:text-red-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>

                        {article.description && (
                          <p className="font-merriweather text-sm text-slate-600 mb-3 line-clamp-2">
                            {article.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 font-lato text-sm text-slate-500">
                          {article.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                              {article.location}
                            </span>
                          )}

                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                            {formatTimeAgo(article.publishedAt)}
                          </span>

                          {article.category && (
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Article Count */}
        {!isLoading && filteredArticles.length > 0 && (
          <div className="mt-8 text-center">
            <p className="font-lato text-sm text-slate-500">
              Showing {Math.min(10, filteredArticles.length)} of {filteredArticles.length} articles
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsDemo;
