
import React from 'react';
import { Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Import your map component here when ready
// import YourMapComponent from './YourMapComponent';

const MapSection = () => {
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Explore News 
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Globally</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Visualize news stories on an interactive world map. Click anywhere to discover local stories.
          </p>
        </div>

        {/* Map Container - Ready for your map component */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-lg">
            <CardContent className="p-0">
              <div className="relative h-96 rounded-lg overflow-hidden">
                {/* Replace this placeholder with your map component */}
                {/* <YourMapComponent /> */}
                
                {/* Temporary placeholder - remove when you add your map */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative mb-6">
                      <Globe className="w-24 h-24 text-red-600 mx-auto animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-2 border-red-600/30 rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <h3 className="font-montserrat text-2xl font-bold text-slate-700 mb-4">
                      Interactive Map Ready
                    </h3>
                    <p className="font-merriweather text-slate-600 max-w-md mx-auto">
                      Simply import your map component and replace the placeholder above.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions for plugging in your map */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto border border-blue-200/50">
            <h4 className="font-montserrat text-lg font-semibold text-slate-700 mb-3">
              Ready to Add Your Map
            </h4>
            <p className="font-lato text-sm text-slate-600">
              Import your map component at the top of this file and replace the placeholder div. 
              The container is sized and styled to fit perfectly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
