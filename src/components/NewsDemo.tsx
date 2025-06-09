
import React, { useState } from 'react';
import { MapPin, Globe, Users, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const NewsDemo = () => {
  const [selectedScope, setSelectedScope] = useState('local');

  const newsItems = {
    local: [
      {
        title: "New Coffee Shop Opens on Main Street",
        location: "Downtown, Your City",
        time: "2 hours ago",
        category: "Local Business"
      },
      {
        title: "City Council Approves New Bike Lane",
        location: "City Hall, Your City",
        time: "4 hours ago",
        category: "Local Politics"
      }
    ],
    regional: [
      {
        title: "Tech Company Announces Major Expansion",
        location: "Metro Area",
        time: "6 hours ago",
        category: "Business"
      },
      {
        title: "Regional Weather Alert Issued",
        location: "State Weather Service",
        time: "8 hours ago",
        category: "Weather"
      }
    ],
    global: [
      {
        title: "Climate Summit Reaches Historic Agreement",
        location: "Geneva, Switzerland",
        time: "12 hours ago",
        category: "Environment"
      },
      {
        title: "Space Mission Discovers New Exoplanet",
        location: "NASA, USA",
        time: "1 day ago",
        category: "Science"
      }
    ]
  };

  const scopes = [
    { id: 'local', label: 'Hyper-Local', icon: MapPin, color: 'text-red-400' },
    { id: 'regional', label: 'Regional', icon: Building, color: 'text-slate-400' },
    { id: 'global', label: 'Global', icon: Globe, color: 'text-red-300' }
  ];

  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See News Through 
            <span className="bg-gradient-to-r from-red-400 to-slate-400 bg-clip-text text-transparent"> Location</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Filter and discover news from your neighborhood to the world. Experience how location transforms your news feed.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-full p-2 border border-slate-700/50">
            {scopes.map((scope) => {
              const Icon = scope.icon;
              return (
                <Button
                  key={scope.id}
                  variant={selectedScope === scope.id ? "default" : "ghost"}
                  className={`mx-1 rounded-full px-6 py-3 transition-all duration-300 ${
                    selectedScope === scope.id 
                      ? 'bg-gradient-to-r from-red-600 to-slate-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  onClick={() => setSelectedScope(scope.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {scope.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* News Feed Demo */}
        <div className="grid gap-4 max-w-3xl mx-auto">
          {newsItems[selectedScope as keyof typeof newsItems].map((item, index) => (
            <Card 
              key={index} 
              className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:border-red-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2 hover:text-red-400 transition-colors cursor-pointer">
                      {item.title}
                    </h3>
                    <div className="flex items-center text-sm text-slate-400 space-x-4">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.location}
                      </span>
                      <span>{item.time}</span>
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive Map Placeholder */}
        <div className="mt-16 text-center">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 max-w-4xl mx-auto">
            <div className="relative">
              <Globe className="w-24 h-24 text-red-400 mx-auto mb-6 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-2 border-red-400/30 rounded-full animate-ping"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Interactive Map Coming Soon</h3>
            <p className="text-slate-300">
              Visualize news stories on an interactive world map. Click anywhere to discover local stories.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsDemo;
