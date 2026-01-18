
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import Features from '../components/Features';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';
import { fetchTodayNews } from '@/services/guardian-api';
import { geocodeArticles } from '@/utils/geocoding';

const Index = () => {
  // Fetch today's news from The Guardian API
  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ['todayNews'],
    queryFn: async () => {
      const rawArticles = await fetchTodayNews({ pageSize: 30 });
      // Geocode articles to add location and coordinates
      return geocodeArticles(rawArticles);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
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
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          <p className="font-lato">Failed to load news. Please check your API key.</p>
        </div>
      )}
    </div>
  );
};

export default Index;
