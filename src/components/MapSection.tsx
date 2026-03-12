import { lazy, Suspense, useState, useEffect } from 'react';
import type { NewsArticle } from '@/types/news';
import type { PreferenceLocation } from '@/types/preferences';
import { isWebGLAvailable } from '@/utils/globeUtils';
import { Flame } from 'lucide-react';

const GlobeView = lazy(() => import('./globe/GlobeView'));
const GlobeFallback = lazy(() => import('./globe/GlobeFallback'));

interface MapSectionProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number) => void) => void;
  preferenceLocations?: PreferenceLocation[];
}

const GlobeLoading = () => (
  <div className="w-full h-[600px] flex items-center justify-center bg-navy-900 rounded-lg">
    <div className="flex flex-col items-center gap-3">
      <Flame className="w-8 h-8 text-amber-500 animate-pulse-warm" />
      <p className="font-body text-sm text-ivory-200/40">Loading globe...</p>
    </div>
  </div>
);

export default function MapSection({ articles, onFlyToReady, preferenceLocations }: MapSectionProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (hasWebGL === null) {
    return <GlobeLoading />;
  }

  return (
    <section id="globe-section" className="w-full bg-navy-900 py-0">
      <Suspense fallback={<GlobeLoading />}>
        {hasWebGL ? (
          <GlobeView articles={articles} onFlyToReady={onFlyToReady} preferenceLocations={preferenceLocations} />
        ) : (
          <GlobeFallback articles={articles} />
        )}
      </Suspense>
    </section>
  );
}
