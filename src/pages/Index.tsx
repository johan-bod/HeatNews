
import React from 'react';
import Hero from '../components/Hero';
import NewsDemo from '../components/NewsDemo';
import Features from '../components/Features';
import AuthSection from '../components/AuthSection';
import Footer from '../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Hero />
      <NewsDemo />
      <Features />
      <AuthSection />
      <Footer />
    </div>
  );
};

export default Index;
