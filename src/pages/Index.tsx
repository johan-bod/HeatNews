
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import Features from '../components/Features';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import { fetchTodayNews } from '@/services/newsdata-api';
import { geocodeArticles } from '@/utils/geocoding';

const Index = () => {
  // Fetch today's news from NewsData.io API
  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ['todayNews'],
    queryFn: async () => {
      const rawArticles = await fetchTodayNews({
        size: 10, // Free tier max per request
        language: 'en',
        // Fetch from multiple countries for diverse coverage
        country: ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'es', 'it', 'jp'],
      });
      // Geocode articles to add location and coordinates
      return geocodeArticles(rawArticles);
    },
    staleTime: 4 * 60 * 60 * 1000, // 4 hours (data considered fresh for 4 hours)
    refetchInterval: 4 * 60 * 60 * 1000, // Auto-refresh every 4 hours
    refetchOnWindowFocus: true, // Also refresh when user returns to tab
    retry: 3, // Retry failed requests 3 times
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200 via-slate-300 to-slate-400">
      <Hero />
      <NewsDemo articles={articles} isLoading={isLoading} />
      <MapSection articles={articles} />
      <Features />
      <AuthSection />
      <Footer />

      {/* Error toast - simple error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <p className="font-lato text-sm">
            <strong>Failed to load news.</strong>
            <br />
            Please check your NewsData.io API key in .env file.
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;
