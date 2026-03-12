import { Card, CardContent } from '@/components/ui/card';
import { NewsMap } from './NewsMap';
import type { NewsArticle } from '@/types/news';
import { MapPin } from 'lucide-react';

interface MapSectionProps {
  articles: NewsArticle[];
}

const MapSection = ({ articles }: MapSectionProps) => {
  const mappedCount = articles.filter(a => a.coordinates).length;

  return (
    <section id="news-map-section" className="py-16 px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-navy-800">
            Explore <span className="text-amber-600 italic">Globally</span>
          </h2>
          <p className="font-body text-sm text-navy-700/50 mt-2">
            Click markers to read stories. Color indicates heat level.
          </p>
        </div>

        <Card className="bg-ivory-50/80 border-amber-200/30 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-[550px]">
              <NewsMap articles={articles} />
            </div>
          </CardContent>
        </Card>

        {mappedCount > 0 && (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-ivory-50 border border-amber-200/30 rounded-full px-5 py-2">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-body text-xs text-navy-700/50">
                <span className="font-semibold text-amber-600">{mappedCount}</span> articles mapped from today's news
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MapSection;
