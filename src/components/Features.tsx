
import React from 'react';
import { Zap, Filter, Bell, Shield, Map, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Features = () => {
  const features = [
    {
      icon: Map,
      title: "Geo-Intelligent Filtering",
      description: "AI-powered location detection automatically surfaces relevant local and global news",
      color: "text-red-400"
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Stay ahead with instant notifications as stories develop in your area and worldwide",
      color: "text-blue-400"
    },
    {
      icon: Filter,
      title: "Smart Curation",
      description: "Machine learning algorithms learn your preferences to deliver personalized news feeds",
      color: "text-red-300"
    },
    {
      icon: Bell,
      title: "Contextual Alerts",
      description: "Get notified about breaking news that matters to your location and interests",
      color: "text-blue-300"
    },
    {
      icon: Shield,
      title: "Source Verification",
      description: "Verified sources and fact-checking ensure you get reliable, trustworthy information",
      color: "text-red-400"
    },
    {
      icon: Sparkles,
      title: "Hyper-Local Discovery",
      description: "Discover neighborhood stories and community events you won't find anywhere else",
      color: "text-blue-400"
    }
  ];

  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Powered by 
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Intelligence</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Advanced technology meets intuitive design to revolutionize how you consume and interact with news.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="bg-white/60 backdrop-blur-sm border-slate-300/50 hover:border-red-500/50 transition-all duration-500 transform hover:scale-105 hover:shadow-xl hover:shadow-red-500/10 group"
              >
                <CardContent className="p-8 text-center">
                  <div className="relative mb-6">
                    <Icon className={`w-12 h-12 ${feature.color.replace('text-red-400', 'text-red-600').replace('text-blue-400', 'text-blue-600').replace('text-red-300', 'text-red-500').replace('text-blue-300', 'text-blue-500')} mx-auto group-hover:scale-110 transition-transform duration-300`} />
                    <div className={`absolute inset-0 ${feature.color.replace('text-', 'bg-').replace('-400', '-600').replace('-300', '-500')}/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300`}></div>
                  </div>
                  <h3 className="font-montserrat text-xl font-bold text-slate-800 mb-4 group-hover:text-red-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="font-merriweather text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
