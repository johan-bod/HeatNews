import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NewsFilters, type NewsFiltersType } from '../components/NewsFilters';
import { NewsSearch, type SearchParams } from '../components/NewsSearch';
import { getCachedNews, refreshNewsCache, initializeBackgroundRefresh, fetchPersonalizedNews, getCachedPersonalizedNews } from '@/services/cachedNews';
import { getUserRemainingFetches, USER_DAILY_FETCHES, loadUsageFromFirestore } from '@/services/apiBudget';
import RefreshIndicator from '@/components/RefreshIndicator';
import SoftGate from '@/components/SoftGate';
import GlobeLegend from '@/components/GlobeLegend';
import PersonalizeCTA from '@/components/PersonalizeCTA';
import { useAuth } from '@/contexts/AuthContext';
import { searchAndFilterNews } from '@/services/newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import type { StoryCluster } from '@/utils/topicClustering';
import { indexArticleTopics } from '@/utils/topicIndexer';
import type { NewsArticle } from '@/types/news';
import { RefreshCw, AlertTriangle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/hooks/usePreferences';
import type { Topic } from '@/data/keywords/taxonomy';
import type { PreferenceLocation } from '@/types/preferences';

const OnboardingModal = lazy(() => import('@/components/onboarding/OnboardingModal'));

type ArticleScale = 'local' | 'regional' | 'national' | 'international';
type ScaleFilter = 'all' | ArticleScale;

const API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY;

function processFilteredArticles(
  articles: NewsArticle[],
  scale: ScaleFilter
): NewsArticle[] {
  let processed = geocodeArticles(articles);
  const scaleValue: ArticleScale = scale === 'all' ? 'international' : scale;

  if (scale !== 'all') {
    processed = processed.map(a => ({ ...a, scale: scaleValue }));
  }

  // Run topic indexer
  processed = processed.map(a => {
    const topics = indexArticleTopics(a, a.language || 'en');
    return {
      ...a,
      primaryTopic: topics.primary || undefined,
      secondaryTopics: topics.secondary.length > 0 ? topics.secondary : undefined,
    };
  });

  const clusters = analyzeArticleHeat(processed, scaleValue);
  const clusterMap = new Map<string, StoryCluster>();
  clusters.forEach(cluster => {
    cluster.articles.forEach(a => clusterMap.set(a.id, cluster));
  });

  return processed.map(article => {
    const cluster = clusterMap.get(article.id);
    return {
      ...article,
      color: cluster ? getArticleColor(article, clusters) : '#94A3B8',
      heatLevel: cluster?.heatLevel || 0,
      coverage: cluster?.coverage || 1,
    };
  });
}

function combineArticles(config: Awaited<ReturnType<typeof getCachedNews>>): NewsArticle[] {
  return [
    ...config.localNews,
    ...config.regionalNews,
    ...config.nationalNews,
    ...config.international,
  ];
}

const Index = () => {
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentFilters, setCurrentFilters] = useState<NewsFiltersType | null>(null);
  const [currentSearch, setCurrentSearch] = useState<SearchParams | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedScale, setSelectedScale] = useState<ScaleFilter>('national');
  const [globeFlyTo, setGlobeFlyTo] = useState<((lat: number, lng: number, alt?: number) => void) | null>(null);
  const [globeFlyToResults, setGlobeFlyToResults] = useState<((articles: NewsArticle[]) => void) | null>(null);
  const baseArticlesRef = useRef<NewsArticle[]>([]);
  const [searchResultIds, setSearchResultIds] = useState<Set<string> | null>(null);
  const { preferences, needsOnboarding, setTopics, setLocations, completeOnboarding, updatePreferences } = usePreferences();
  const [showPreferences, setShowPreferences] = useState(false);
  const { user } = useAuth();
  const [personalizedArticles, setPersonalizedArticles] = useState<NewsArticle[]>([]);
  const [remainingFetches, setRemainingFetches] = useState(USER_DAILY_FETCHES);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  const articles = useMemo(() => {
    // Merge shared pool + personalized, deduplicate by id
    const merged = [...allArticles, ...personalizedArticles];
    const seen = new Set<string>();
    const deduped = merged.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    if (selectedScale === 'all') return deduped;
    return deduped.filter(a => a.scale === selectedScale);
  }, [allArticles, personalizedArticles, selectedScale]);

  const clusters = useMemo(() => {
    if (allArticles.length === 0) return [];
    return analyzeArticleHeat(allArticles, 'international');
  }, [allArticles]);

  const loadNews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newsConfig = await getCachedNews();
      const combined = combineArticles(newsConfig);
      baseArticlesRef.current = combined;
      setAllArticles(combined);
      setLastUpdated(new Date(newsConfig.lastUpdated));
    } catch (err) {
      console.error('Failed to load news:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanup = initializeBackgroundRefresh();
    const handleCacheRefresh = () => loadNews();
    window.addEventListener('cacheRefreshed', handleCacheRefresh);
    return () => {
      cleanup();
      window.removeEventListener('cacheRefreshed', handleCacheRefresh);
    };
  }, [loadNews]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Load personalized cache + sync usage on sign-in
  useEffect(() => {
    if (!user) {
      setPersonalizedArticles([]);
      setRemainingFetches(USER_DAILY_FETCHES);
      return;
    }
    setPersonalizedArticles(getCachedPersonalizedNews());
    setRemainingFetches(getUserRemainingFetches(user.uid));
    loadUsageFromFirestore(user.uid).then(() => {
      setRemainingFetches(getUserRemainingFetches(user.uid));
    });
  }, [user]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const newsConfig = await refreshNewsCache();
      const combined = combineArticles(newsConfig);
      baseArticlesRef.current = combined;
      setAllArticles(combined);
      setLastUpdated(new Date(newsConfig.lastUpdated));
    } catch (err) {
      console.error('Failed to refresh news:', err);
      setError(err as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleFilterChange = useCallback(async (filters: NewsFiltersType) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentFilters(filters);
      setSelectedScale(filters.scale);

      const filteredArticles = await searchAndFilterNews({
        countries: filters.countries,
        languages: filters.languages,
        categories: filters.categories,
        scale: filters.scale,
        prioritydomain: filters.prioritydomain,
        size: 10,
      });

      const processed = processFilteredArticles(filteredArticles, filters.scale);

      if (processed.length === 0) {
        setError(new Error('No articles found for these filters'));
        setSearchResultIds(null);
        return;
      }

      const resultIds = new Set(processed.map(a => a.id));
      setSearchResultIds(resultIds);

      // Merge new results into base articles
      const merged = [...baseArticlesRef.current];
      for (const article of processed) {
        if (!merged.find(a => a.id === article.id)) {
          merged.push(article);
        }
      }
      setAllArticles(merged);
      setLastUpdated(new Date());

      if (globeFlyToResults) globeFlyToResults(processed);
    } catch (err) {
      console.error('Failed to filter news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, [globeFlyToResults]);

  const handleSearch = useCallback(async (search: SearchParams) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentSearch(search);

      const searchedArticles = await searchAndFilterNews({
        query: search.query,
        size: 10,
      });

      const processed = processFilteredArticles(searchedArticles, selectedScale);

      if (processed.length === 0) {
        setError(new Error(`No articles found for "${search.query}"`));
        setSearchResultIds(null);
        return;
      }

      const resultIds = new Set(processed.map(a => a.id));
      setSearchResultIds(resultIds);

      // Merge new results into base articles
      const merged = [...baseArticlesRef.current];
      for (const article of processed) {
        if (!merged.find(a => a.id === article.id)) {
          merged.push(article);
        }
      }
      setAllArticles(merged);
      setLastUpdated(new Date());

      if (globeFlyToResults) globeFlyToResults(processed);
    } catch (err) {
      console.error('Failed to search news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, [globeFlyToResults, selectedScale]);

  const handleArticleLocate = useCallback((lat: number, lng: number) => {
    // Scroll to globe first, then fly
    const globeEl = document.getElementById('globe-section');
    if (globeEl) {
      globeEl.scrollIntoView({ behavior: 'smooth' });
    }
    // Small delay to let scroll finish before flying
    setTimeout(() => {
      if (globeFlyTo) globeFlyTo(lat, lng);
    }, 400);
  }, [globeFlyTo]);

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null);
    setCurrentSearch(null);
    setSelectedScale('national');
    setSearchResultIds(null);
    setAllArticles(baseArticlesRef.current);
    if (globeFlyTo) globeFlyTo(46.5, 2.5, 0.8);
  }, [globeFlyTo]);

  const handlePersonalizedRefresh = useCallback(async () => {
    if (!user) return;
    if (remainingFetches <= 0) {
      setShowSoftGate(true);
      return;
    }
    try {
      setIsPersonalizing(true);
      const newArticles = await fetchPersonalizedNews(user.uid, preferences);
      setPersonalizedArticles(newArticles);
      setRemainingFetches(getUserRemainingFetches(user.uid));
    } catch (error) {
      if ((error as Error).message.includes('limit reached')) {
        setShowSoftGate(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsPersonalizing(false);
    }
  }, [user, remainingFetches, preferences]);

  const handleOnboardingComplete = useCallback(async (topics: Topic[], locations: PreferenceLocation[]) => {
    await updatePreferences({
      topics,
      locations,
      onboardingComplete: true,
    });
    setShowPreferences(false);
  }, [updatePreferences]);

  const handleOnboardingSkip = useCallback(async () => {
    await completeOnboarding();
    setShowPreferences(false);
  }, [completeOnboarding]);

  const handleOpenPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  // Full-page loading screen on initial load
  if (isLoading && allArticles.length === 0) {
    return (
      <div className="min-h-screen bg-background noise-bg relative flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Flame className="w-10 h-10 text-amber-500 animate-pulse-warm" />
            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
          </div>
          <p className="font-body text-sm text-navy-700/40">Fetching today's stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg relative">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-amber-500 focus:text-navy-900 focus:px-4 focus:py-2 focus:rounded-lg font-body text-sm">Skip to content</a>
      <Navbar onOpenPreferences={preferences.onboardingComplete ? handleOpenPreferences : undefined} />
      <Hero />

      <main id="main-content">
      {/* API key warning */}
      {!API_KEY && (
        <div className="max-w-5xl mx-auto px-6 pt-8">
          <div className="bg-amber-50 border border-amber-300/50 rounded-lg p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-semibold text-amber-800 text-sm mb-1">API Key Required</h3>
              <p className="font-body text-xs text-amber-700/80">
                Add your NewsData.io API key to <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">.env</code> as{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">VITE_NEWSDATA_API_KEY=your_key</code> and restart.
                Free key at{' '}
                <a href="https://newsdata.io/register" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  newsdata.io
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters — dark band above globe */}
      <div className="w-full bg-navy-900 border-b border-ivory-200/5">
        <div className="max-w-4xl mx-auto px-6 py-4 space-y-3">
          <NewsSearch
            onSearch={handleSearch}
            onClear={handleClearFilters}
            isSearching={isSearching}
            currentSearch={currentSearch || undefined}
          />
          <NewsFilters
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
            currentFilters={currentFilters || undefined}
          />
        </div>
      </div>

      {/* Globe — full width, dark background */}
      <ErrorBoundary>
        <MapSection
          articles={allArticles}
          clusters={clusters}
          onFlyToReady={(fn, fnResults) => {
            setGlobeFlyTo(() => fn);
            if (fnResults) setGlobeFlyToResults(() => fnResults);
          }}
          preferenceLocations={preferences.locations}
          searchResultIds={searchResultIds}
          selectedScale={selectedScale}
        />
      </ErrorBoundary>
      <GlobeLegend />

      {/* Refresh controls — inline below globe legend */}
      <div className="w-full bg-navy-900 border-b border-ivory-200/5">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-center gap-4 flex-wrap">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="bg-transparent text-ivory-200/60 hover:text-amber-400 border-ivory-200/10 hover:border-amber-500/30 font-body text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <RefreshIndicator
            remaining={remainingFetches}
            total={USER_DAILY_FETCHES}
            onRefresh={handlePersonalizedRefresh}
            isRefreshing={isPersonalizing}
            isSignedIn={!!user}
          />
          {lastUpdated && !isLoading && (
            <span className="font-body text-[10px] text-ivory-200/25">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Personalize CTA — shown to anonymous or non-onboarded users */}
      <PersonalizeCTA
        hasCompletedOnboarding={preferences.onboardingComplete}
        onOpenPreferences={handleOpenPreferences}
      />

      <NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} clusters={clusters} />
      <HowItWorks />

      {/* Soft gate */}
      {showSoftGate && (
        <SoftGate onDismiss={() => setShowSoftGate(false)} />
      )}

      </main>
      <Footer />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-5 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <p className="font-body text-sm">
            <strong>Failed to load news.</strong>
            <br />
            <span className="text-red-100 text-xs">{error.message}</span>
            <br />
            <button onClick={handleRefresh} className="underline mt-1.5 text-xs hover:text-red-100">
              Try again
            </button>
          </p>
        </div>
      )}

      {/* Onboarding / Preferences modal */}
      <Suspense fallback={null}>
        {(needsOnboarding || showPreferences) && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            initialTopics={preferences.topics}
            initialLocations={preferences.locations}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Index;
