
import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import Features from '../components/Features';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import { getCachedNews, refreshNewsCache, initializeBackgroundRefresh } from '@/services/cachedNews';
import type { NewsArticle } from '@/types/news';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize background refresh on mount (only once)
  useEffect(() => {
    initializeBackgroundRefresh();

    // Listen for background refresh completion
    const handleCacheRefresh = () => {
      console.log('🔔 Cache was refreshed in background, reloading data...');
      loadNews();
    };

    window.addEventListener('cacheRefreshed', handleCacheRefresh);

    return () => {
      window.removeEventListener('cacheRefreshed', handleCacheRefresh);
    };
  }, []);

  // Load cached news on mount (no API call unless cache is empty/expired)
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // This will use cache if available, only fetch if cache is expired
      // Also triggers background refresh if cache is older than 4 hours
      const newsConfig = await getCachedNews();

      // Combine Argentina + Asia + International news
      const allArticles = [
        ...newsConfig.argentinaLocal,
        ...newsConfig.asiaNational,
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
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Force refresh the cache
      const newsConfig = await refreshNewsCache();

      // Combine Argentina + Asia + International news
      const allArticles = [
        ...newsConfig.argentinaLocal,
        ...newsConfig.asiaNational,
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200 via-slate-300 to-slate-400">
      <Hero />

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
      <MapSection articles={articles} />
      <Features />
      <AuthSection />
      <Footer />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <p className="font-lato text-sm">
            <strong>Failed to load news.</strong>
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
