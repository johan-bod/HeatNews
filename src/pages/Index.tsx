
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import { ScaleCards } from '../components/ScaleCards';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import { NewsFilters, type NewsFiltersType } from '../components/NewsFilters';
import { NewsSearch, type SearchParams } from '../components/NewsSearch';
import { AdBanner } from '../components/AdBanner';
import { getCachedNews, refreshNewsCache, initializeBackgroundRefresh } from '@/services/cachedNews';
import { searchAndFilterNews } from '@/services/newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';
import { analyzeArticleHeat, getArticleColor } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Type for article scale (without 'all')
type ArticleScale = 'local' | 'regional' | 'national' | 'international';

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentFilters, setCurrentFilters] = useState<NewsFiltersType | null>(null);
  const [currentSearch, setCurrentSearch] = useState<SearchParams | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Shared function to process articles with geocoding and heat mapping
  const processArticles = useCallback((
    articles: NewsArticle[],
    scale: 'all' | 'local' | 'regional' | 'national' | 'international'
  ): NewsArticle[] => {
    // Geocode articles
    let processed = geocodeArticles(articles);

    // Apply scale if specified
    const scaleValue = scale === 'all' ? 'international' : scale;
    if (scale !== 'all') {
      processed = processed.map(a => ({ ...a, scale: scaleValue as ArticleScale }));
    }

    // Analyze heat and create clusters
    const clusters = analyzeArticleHeat(processed, scaleValue as ArticleScale);

    // Build lookup map for O(1) performance instead of O(n) find operations
    const articleClusterMap = new Map<string, typeof clusters[0]>();
    clusters.forEach(cluster => {
      cluster.articles.forEach(a => {
        articleClusterMap.set(a.id, cluster);
      });
    });

    // Map articles with heat data
    return processed.map(article => {
      const cluster = articleClusterMap.get(article.id);
      return {
        ...article,
        color: cluster ? getArticleColor(article, clusters) : '#6B7280',
        heatLevel: cluster?.heatLevel || 0,
        coverage: cluster?.coverage || 1,
      };
    });
  }, []);

  // Load cached news (memoized to prevent unnecessary re-creations)
  const loadNews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // This will use cache if available, only fetch if cache is expired
      const newsConfig = await getCachedNews();

      // Combine all 4 scales: Local → Regional → National → International
      const allArticles = [
        ...newsConfig.localNews,
        ...newsConfig.regionalNews,
        ...newsConfig.nationalNews,
        ...newsConfig.international,
      ];

      setArticles(allArticles);
      setLastUpdated(new Date(newsConfig.lastUpdated));
    } catch (err) {
      console.error('Failed to load news:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize background refresh on mount (only once)
  useEffect(() => {
    const cleanup = initializeBackgroundRefresh();

    // Listen for background refresh completion
    const handleCacheRefresh = () => {
      console.log('🔔 Cache was refreshed in background, reloading data...');
      loadNews();
    };

    window.addEventListener('cacheRefreshed', handleCacheRefresh);

    return () => {
      cleanup(); // Clean up interval
      window.removeEventListener('cacheRefreshed', handleCacheRefresh);
    };
  }, [loadNews]);

  // Load cached news on mount
  useEffect(() => {
    loadNews().catch(err => {
      console.error('Failed to load initial news:', err);
      setError(err as Error);
      setIsLoading(false);
    });
  }, [loadNews]);

  // Manual refresh handler (memoized)
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Force refresh the cache
      const newsConfig = await refreshNewsCache();

      // Combine all 4 scales: Local → Regional → National → International
      const allArticles = [
        ...newsConfig.localNews,
        ...newsConfig.regionalNews,
        ...newsConfig.nationalNews,
        ...newsConfig.international,
      ];

      setArticles(allArticles);
      setLastUpdated(new Date(newsConfig.lastUpdated));
    } catch (err) {
      console.error('Failed to refresh news:', err);
      setError(err as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle filter changes (memoized with shared processing)
  const handleFilterChange = useCallback(async (filters: NewsFiltersType) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentFilters(filters);

      // Fetch filtered news
      const filteredArticles = await searchAndFilterNews({
        countries: filters.countries,
        languages: filters.languages,
        categories: filters.categories,
        scale: filters.scale,
        prioritydomain: filters.prioritydomain,
        size: 10,
      });

      // Process with geocoding and heat mapping
      const processed = processArticles(filteredArticles, filters.scale);

      setArticles(processed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to filter news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, [processArticles]);

  // Handle search (memoized with shared processing)
  const handleSearch = useCallback(async (search: SearchParams) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentSearch(search);

      // Fetch searched news
      const searchedArticles = await searchAndFilterNews({
        query: search.query,
        scale: search.scale,
        size: 10,
      });

      // Process with geocoding and heat mapping
      const processed = processArticles(searchedArticles, search.scale);

      setArticles(processed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to search news:', err);
      setError(err as Error);
    } finally {
      setIsSearching(false);
    }
  }, [processArticles]);

  // Clear filters and search (memoized)
  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null);
    setCurrentSearch(null);
    loadNews(); // Reload cached news
  }, [loadNews]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200 via-slate-300 to-slate-400">
      <Navbar />
      <Hero />

      {/* Show loading indicator on initial load */}
      {isLoading && articles.length === 0 && !error && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl text-center max-w-md">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Loading News</h3>
            <p className="text-slate-600 text-sm">Fetching latest articles from around the world...</p>
            <p className="text-slate-400 text-xs mt-2">This may take a few seconds on first load</p>
          </div>
        </div>
      )}

      {/* Filters and Search Section */}
      <div className="container mx-auto px-4 py-8 space-y-6">
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

        {/* Non-intrusive ad placement - horizontal banner */}
        <AdBanner
          adSlot={import.meta.env.VITE_ADSENSE_SLOT_HORIZONTAL || '1234567890'}
          format="horizontal"
          responsive={true}
          className="my-8"
        />
      </div>

      {/* Refresh button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-blue-600 shadow-lg border border-slate-300"
          size="lg"
        >
          <RefreshCw
            className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing ? 'Refreshing...' : 'Refresh News'}
        </Button>

        {lastUpdated && !isLoading && (
          <div className="mt-2 text-xs text-slate-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md border border-slate-200">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <NewsDemo articles={articles} isLoading={isLoading} />
      <ScaleCards articles={articles} isLoading={isLoading} />
      <MapSection articles={articles} />
      <AuthSection />
      <Footer />

      {/* Error display */}
      {error && articles.length === 0 && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl text-center max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Unable to Load News</h3>
            <p className="text-slate-600 text-sm mb-4">{error.message}</p>
            <div className="space-y-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Retrying...' : 'Try Again'}
              </Button>
              <p className="text-xs text-slate-400">
                Make sure you have an internet connection and the API key is valid
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error toast (when there are already articles loaded) */}
      {error && articles.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <p className="font-lato text-sm">
            <strong>Failed to refresh news.</strong>
            <br />
            {error.message}
            <br />
            <button
              onClick={handleRefresh}
              className="underline mt-2 hover:text-red-100"
            >
              Try again
            </button>
          </p>
        </div>
      )}

      {/* Cache info */}
      {!isLoading && articles.length > 0 && (
        <div className="fixed top-4 right-4 z-40 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-lato">
          ✓ Using cached data (no API calls)
          <div className="text-[10px] mt-1 opacity-80">
            Auto-refreshes every 4 hours in background
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
