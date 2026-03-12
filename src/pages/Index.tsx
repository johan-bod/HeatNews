import { useEffect, useState, useCallback, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import { ScaleCards } from '../components/ScaleCards';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import { NewsFilters, type NewsFiltersType } from '../components/NewsFilters';
import { NewsSearch, type SearchParams } from '../components/NewsSearch';
import { getCachedNews, refreshNewsCache, initializeBackgroundRefresh } from '@/services/cachedNews';
import { searchAndFilterNews } from '@/services/newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';
import { RefreshCw, AlertTriangle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const clusters = analyzeArticleHeat(processed, scaleValue);
  const clusterMap = new Map<string, typeof clusters[0]>();
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
  const [selectedScale, setSelectedScale] = useState<ScaleFilter>('all');

  const articles = useMemo(() => {
    if (selectedScale === 'all') return allArticles;
    return allArticles.filter(a => a.scale === selectedScale);
  }, [allArticles, selectedScale]);

  const loadNews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newsConfig = await getCachedNews();
      setAllArticles(combineArticles(newsConfig));
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

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const newsConfig = await refreshNewsCache();
      setAllArticles(combineArticles(newsConfig));
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

      setAllArticles(processFilteredArticles(filteredArticles, filters.scale));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to filter news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback(async (search: SearchParams) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentSearch(search);
      setSelectedScale(search.scale);

      const searchedArticles = await searchAndFilterNews({
        query: search.query,
        scale: search.scale,
        size: 10,
      });

      setAllArticles(processFilteredArticles(searchedArticles, search.scale));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to search news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null);
    setCurrentSearch(null);
    setSelectedScale('all');
    loadNews();
  }, [loadNews]);

  const handleScaleSelect = useCallback((scale: string) => {
    setSelectedScale(prev => prev === scale ? 'all' : scale as ScaleFilter);
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
      <Navbar />
      <Hero />

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

      {/* Search & Filters */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
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

      {/* Refresh button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-ivory-50/95 backdrop-blur-sm text-navy-700 hover:bg-white hover:text-amber-600 shadow-lg border border-amber-200/40 font-body text-sm"
          size="lg"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        {lastUpdated && !isLoading && (
          <div className="mt-1.5 font-body text-[10px] text-navy-700/35 bg-ivory-50/90 backdrop-blur-sm px-3 py-1 rounded-md border border-amber-200/20 text-center">
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <ScaleCards
        articles={allArticles}
        isLoading={isLoading}
        selectedScale={selectedScale}
        onScaleSelect={handleScaleSelect}
      />
      <NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} />
      <MapSection articles={articles} />
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
    </div>
  );
};

export default Index;
