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
    { id: 'regional', label: 'Regional', icon: Building, color: 'text-blue-400' },
    { id: 'global', label: 'Global', icon: Globe, color: 'text-red-300' }
  ];

  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            See News Through 
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Location</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Filter and discover news from your neighborhood to the world. Experience how location transforms your news feed.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-full p-2 border border-slate-300/50 shadow-sm">
            {scopes.map((scope) => {
              const Icon = scope.icon;
              return (
                <Button
                  key={scope.id}
                  variant={selectedScope === scope.id ? "default" : "ghost"}
                  className={`font-lato mx-1 rounded-full px-6 py-3 transition-all duration-300 ${
                    selectedScope === scope.id 
                      ? 'bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-lg' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
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
              className="bg-white/70 backdrop-blur-sm border-slate-300/50 hover:border-red-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-montserrat text-lg font-semibold text-slate-800 mb-2 hover:text-red-600 transition-colors cursor-pointer">
                      {item.title}
                    </h3>
                    <div className="flex items-center font-lato text-sm text-slate-500 space-x-4">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.location}
                      </span>
                      <span>{item.time}</span>
                      <span className="bg-red-500/20 text-red-600 px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsDemo;
