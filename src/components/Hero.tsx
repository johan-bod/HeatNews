
import React from 'react';
import { Globe, MapPin, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        {/* Logo/Brand area */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <Globe className="w-16 h-16 text-blue-400 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl"></div>
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent leading-tight">
          News, Mapped.
          <br />
          <span className="text-4xl md:text-6xl text-blue-400">Everywhere.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          Experience news like never before. From your neighborhood to the globe, 
          discover stories that matter to you, exactly where they happen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
          >
            <Zap className="w-5 h-5 mr-2" />
            Try Demo
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-blue-400/50 text-blue-400 hover:bg-blue-400/10 px-8 py-4 text-lg rounded-full backdrop-blur-sm transition-all duration-300"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Learn More
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">Global</div>
            <div className="text-slate-400">Coverage</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">Real-time</div>
            <div className="text-slate-400">Updates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">Hyper-local</div>
            <div className="text-slate-400">Focus</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
