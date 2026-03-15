import { lazy, Suspense, useState, useEffect } from 'react';
import type { NewsArticle } from '@/types/news';
import type { PreferenceLocation } from '@/types/preferences';
import type { StoryCluster } from '@/utils/topicClustering';
import type { SearchParams } from './NewsSearch';
import { isWebGLAvailable } from '@/utils/globeUtils';
import { Flame } from 'lucide-react';

const GlobeView = lazy(() => import('./globe/GlobeView'));
const GlobeFallback = lazy(() => import('./globe/GlobeFallback'));

interface MapSectionProps {
  articles: NewsArticle[];
  clusters: StoryCluster[];
  onFlyToReady?: (flyTo: (lat: number, lng: number, alt?: number) => void, flyToResults?: (articles: NewsArticle[]) => void) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
  selectedScale?: string;
  onSearch?: (params: SearchParams) => void;
  onSearchClear?: () => void;
  isSearching?: boolean;
  currentSearch?: SearchParams;
}

const GlobeLoading = () => {
  const isMobile = window.innerWidth < 768;
  return (
    <div className={`w-full ${isMobile ? 'h-[400px]' : 'h-[600px]'} flex items-center justify-center bg-navy-900 rounded-lg`}>
      <div className="flex flex-col items-center gap-3">
        <Flame className="w-8 h-8 text-amber-500 animate-pulse-warm" />
        <p className="font-body text-sm text-ivory-200/40">Loading globe...</p>
      </div>
    </div>
  );
};

export default function MapSection({ articles, clusters, onFlyToReady, preferenceLocations, searchResultIds, selectedScale, onSearch, onSearchClear, isSearching, currentSearch }: MapSectionProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (hasWebGL === null) {
    return <GlobeLoading />;
  }

  return (
    <section className="w-full bg-navy-900 py-0">
      <Suspense fallback={<GlobeLoading />}>
        {hasWebGL ? (
          <GlobeView
            articles={articles}
            clusters={clusters}
            onFlyToReady={onFlyToReady}
            preferenceLocations={preferenceLocations}
            searchResultIds={searchResultIds}
            selectedScale={selectedScale}
            onSearch={onSearch}
            onSearchClear={onSearchClear}
            isSearching={isSearching}
            currentSearch={currentSearch}
          />
        ) : (
          <GlobeFallback articles={articles} />
        )}
      </Suspense>
    </section>
  );
}
