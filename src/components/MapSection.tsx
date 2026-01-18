
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NewsMap } from './NewsMap';
import type { NewsArticle } from '@/types/news';

interface MapSectionProps {
  articles: NewsArticle[];
}

const MapSection = ({ articles }: MapSectionProps) => {
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Explore News
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Globally</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Visualize news stories on an interactive world map. Click markers to read the stories.
          </p>
        </div>

        {/* Map Container with Real Map */}
        <div className="max-w-5xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-lg">
            <CardContent className="p-0">
              <div className="relative h-[600px] rounded-lg overflow-hidden">
                <NewsMap articles={articles} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto border border-blue-200/50">
            <p className="font-lato text-sm text-slate-700">
              <span className="font-semibold text-lg text-blue-600">{articles.filter(a => a.coordinates).length}</span> articles mapped from today's news
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
