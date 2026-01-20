import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe2, Building2, Map as MapIcon, Flame, TrendingUp } from 'lucide-react';
import type { NewsArticle } from '@/types/news';

interface ScaleCardsProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  onCardClick?: (scale: string) => void;
}

export function ScaleCards({ articles, isLoading = false, onCardClick }: ScaleCardsProps) {
  // Group articles by scale
  const localArticles = articles.filter(a => a.scale === 'local');
  const regionalArticles = articles.filter(a => a.scale === 'regional');
  const nationalArticles = articles.filter(a => a.scale === 'national');
  const internationalArticles = articles.filter(a => a.scale === 'international');

  // Calculate average heat for each scale
  const calculateAvgHeat = (scaleArticles: NewsArticle[]) => {
    if (scaleArticles.length === 0) return 0;
    const total = scaleArticles.reduce((sum, a) => sum + (a.heatLevel || 0), 0);
    return Math.round(total / scaleArticles.length);
  };

  const scales = [
    {
      id: 'local',
      title: 'Hyperlocal',
      subtitle: 'France',
      icon: MapPin,
      color: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      articles: localArticles,
      description: 'News from French cities',
      emoji: '🇫🇷',
    },
    {
      id: 'regional',
      title: 'Regional',
      subtitle: 'Europe',
      icon: Building2,
      color: 'from-blue-500 to-indigo-600',
      borderColor: 'border-blue-500/30 hover:border-blue-500',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      articles: regionalArticles,
      description: 'Regional European coverage',
      emoji: '🇪🇺',
    },
    {
      id: 'national',
      title: 'National',
      subtitle: 'Asia',
      icon: MapIcon,
      color: 'from-purple-500 to-pink-600',
      borderColor: 'border-purple-500/30 hover:border-purple-500',
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      articles: nationalArticles,
      description: 'National news across Asia',
      emoji: '🌏',
    },
    {
      id: 'international',
      title: 'International',
      subtitle: 'Global',
      icon: Globe2,
      color: 'from-red-500 to-orange-600',
      borderColor: 'border-red-500/30 hover:border-red-500',
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      articles: internationalArticles,
      description: 'Worldwide breaking news',
      emoji: '🌍',
    },
  ];

  const handleCardClick = (scaleId: string) => {
    // Scroll to map section
    const mapSection = document.getElementById('news-map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Call optional callback
    if (onCardClick) {
      onCardClick(scaleId);
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
              News by
              <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Scale</span>
            </h2>
            <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
              Loading news from around the world...
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-32 bg-slate-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 relative bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            News by
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Scale</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            From your neighborhood to the globe. Explore {articles.length} articles mapped in real-time.
          </p>
        </div>

        {/* Scale Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {scales.map((scale) => {
            const Icon = scale.icon;
            const avgHeat = calculateAvgHeat(scale.articles);
            const totalCoverage = scale.articles.reduce((sum, a) => sum + (a.coverage || 1), 0);

            return (
              <Card
                key={scale.id}
                onClick={() => handleCardClick(scale.id)}
                className={`
                  cursor-pointer transition-all duration-300 transform hover:scale-105
                  border-2 ${scale.borderColor} hover:shadow-2xl
                  bg-white/80 backdrop-blur-sm
                  group
                `}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-3 rounded-xl ${scale.bgColor} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${scale.iconColor}`} />
                    </div>
                    <span className="text-3xl">{scale.emoji}</span>
                  </div>
                  <CardTitle className="text-lg font-montserrat font-bold text-slate-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:to-blue-600 group-hover:bg-clip-text transition-all">
                    {scale.title}
                  </CardTitle>
                  <p className="text-sm text-slate-500 font-lato">{scale.subtitle}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Article count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-lato">Articles:</span>
                    <Badge
                      variant="secondary"
                      className={`bg-gradient-to-r ${scale.color} text-white font-semibold`}
                    >
                      {scale.articles.length}
                    </Badge>
                  </div>

                  {/* Average heat */}
                  {avgHeat > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-lato flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        Avg Heat:
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {avgHeat}%
                      </span>
                    </div>
                  )}

                  {/* Total coverage */}
                  {totalCoverage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-lato flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Coverage:
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {totalCoverage} sources
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-slate-500 font-merriweather pt-2 border-t border-slate-200">
                    {scale.description}
                  </p>

                  {/* Click hint */}
                  <div className="pt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-slate-400 font-lato">
                      Click to view on map →
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full px-8 py-4 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{articles.length}</span>
              <span className="text-sm text-slate-600">Total Articles</span>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {articles.filter(a => a.coordinates).length}
              </span>
              <span className="text-sm text-slate-600">Geolocated</span>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <span className="text-sm text-slate-600">Live Heat Mapping</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
