
import React from 'react';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import Features from '../components/Features';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';
import MapSection from '../components/MapSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200 via-slate-300 to-slate-400">
      <Hero />
      <NewsDemo />
      <MapSection />
      <Features />
      <AuthSection />
      <Footer />
    </div>
  );
};

export default Index;
