import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe2, Building2, Map as MapIcon, Flame, TrendingUp } from 'lucide-react';
import type { NewsArticle } from '@/types/news';

interface ScaleCardsProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  selectedScale?: string;
  onScaleSelect?: (scale: string) => void;
}

const SCALES = [
  {
    id: 'local',
    title: 'Hyperlocal',
    subtitle: 'France',
    icon: MapPin,
    accent: 'amber-600',
    bgAccent: 'bg-amber-50',
    borderAccent: 'border-amber-300/40 hover:border-amber-400',
    selectedBorder: 'border-amber-500 ring-2 ring-amber-400/20',
    iconColor: 'text-amber-600',
    badgeColor: 'bg-amber-600',
    description: 'French cities & communes',
  },
  {
    id: 'regional',
    title: 'Regional',
    subtitle: 'French Regions',
    icon: Building2,
    accent: 'sky-600',
    bgAccent: 'bg-sky-50',
    borderAccent: 'border-sky-300/40 hover:border-sky-400',
    selectedBorder: 'border-sky-500 ring-2 ring-sky-400/20',
    iconColor: 'text-sky-600',
    badgeColor: 'bg-sky-600',
    description: 'Bretagne, Provence, Normandie',
  },
  {
    id: 'national',
    title: 'National',
    subtitle: 'Europe',
    icon: MapIcon,
    accent: 'violet-600',
    bgAccent: 'bg-violet-50',
    borderAccent: 'border-violet-300/40 hover:border-violet-400',
    selectedBorder: 'border-violet-500 ring-2 ring-violet-400/20',
    iconColor: 'text-violet-600',
    badgeColor: 'bg-violet-600',
    description: 'European country coverage',
  },
  {
    id: 'international',
    title: 'International',
    subtitle: 'Global',
    icon: Globe2,
    accent: 'rose-600',
    bgAccent: 'bg-rose-50',
    borderAccent: 'border-rose-300/40 hover:border-rose-400',
    selectedBorder: 'border-rose-500 ring-2 ring-rose-400/20',
    iconColor: 'text-rose-600',
    badgeColor: 'bg-rose-600',
    description: 'Worldwide breaking news',
  },
] as const;

function calculateAvgHeat(scaleArticles: NewsArticle[]) {
  if (scaleArticles.length === 0) return 0;
  const total = scaleArticles.reduce((sum, a) => sum + (a.heatLevel || 0), 0);
  return Math.round(total / scaleArticles.length);
}

export function ScaleCards({ articles, isLoading = false, selectedScale = 'all', onScaleSelect }: ScaleCardsProps) {
  const articlesByScale: Record<string, NewsArticle[]> = {
    local: articles.filter(a => a.scale === 'local'),
    regional: articles.filter(a => a.scale === 'regional'),
    national: articles.filter(a => a.scale === 'national'),
    international: articles.filter(a => a.scale === 'international'),
  };

  if (isLoading) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="font-display text-3xl font-bold text-navy-800">
              News by Scale
            </h2>
            <p className="font-body text-navy-700/50 mt-2">Loading coverage data...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <Card className="h-full border-amber-200/20">
                  <CardContent className="p-5">
                    <div className="h-8 bg-amber-100/50 rounded mb-3" />
                    <div className="h-4 bg-amber-100/30 rounded mb-2" />
                    <div className="h-4 bg-amber-100/30 rounded w-2/3" />
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
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-navy-800">
            News by <span className="text-amber-600 italic">Scale</span>
          </h2>
          <p className="font-body text-sm text-navy-700/50 mt-2">
            Click a card to filter. Click again to show all.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCALES.map((scale, index) => {
            const Icon = scale.icon;
            const scaleArticles = articlesByScale[scale.id] || [];
            const avgHeat = calculateAvgHeat(scaleArticles);
            const totalCoverage = scaleArticles.reduce((sum, a) => sum + (a.coverage || 1), 0);
            const isSelected = selectedScale === scale.id;

            return (
              <Card
                key={scale.id}
                onClick={() => onScaleSelect?.(scale.id)}
                className={`
                  cursor-pointer transition-all duration-300 group
                  border bg-ivory-50/80 hover:bg-white
                  heat-glow animate-fade-up
                  ${isSelected ? scale.selectedBorder + ' bg-white shadow-md' : scale.borderAccent}
                `}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg ${scale.bgAccent}`}>
                      <Icon className={`w-4 h-4 ${scale.iconColor}`} />
                    </div>
                    {isSelected && (
                      <Badge className="bg-amber-600 text-white text-[10px] font-body">Active</Badge>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-bold text-navy-800 mb-0.5">
                    {scale.title}
                  </h3>
                  <p className="font-body text-xs text-navy-700/40 mb-4">{scale.subtitle}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-navy-700/50">Articles</span>
                      <span className="font-body text-sm font-semibold text-navy-800">
                        {scaleArticles.length}
                      </span>
                    </div>

                    {avgHeat > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-navy-700/50 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          Heat
                        </span>
                        <span className="font-body text-sm font-semibold text-amber-600">{avgHeat}%</span>
                      </div>
                    )}

                    {totalCoverage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-navy-700/50 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Sources
                        </span>
                        <span className="font-body text-sm font-semibold text-navy-700">{totalCoverage}</span>
                      </div>
                    )}
                  </div>

                  <p className="font-body text-[11px] text-navy-700/35 mt-4 pt-3 border-t border-amber-200/20">
                    {scale.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-6 bg-ivory-50 border border-amber-200/30 rounded-full px-7 py-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-amber-600">{articles.length}</span>
              <span className="font-body text-xs text-navy-700/50">Articles</span>
            </div>
            <div className="w-px h-6 bg-amber-200/30" />
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-amber-600">
                {articles.filter(a => a.coordinates).length}
              </span>
              <span className="font-body text-xs text-navy-700/50">Mapped</span>
            </div>
            <div className="w-px h-6 bg-amber-200/30" />
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-body text-xs text-navy-700/50">Live</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
