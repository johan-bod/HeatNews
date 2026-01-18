import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { NewsArticle } from '@/types/news';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, Calendar, Flame } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface NewsMapProps {
  articles: NewsArticle[];
  center?: [number, number];
  zoom?: number;
}

// Component to fit bounds when articles change
function FitBounds({ articles }: { articles: NewsArticle[] }) {
  const map = useMap();

  useEffect(() => {
    const articlesWithCoords = articles.filter(a => a.coordinates);

    if (articlesWithCoords.length > 0) {
      const bounds = articlesWithCoords.map(a => [
        a.coordinates!.lat,
        a.coordinates!.lng,
      ] as [number, number]);

      if (bounds.length === 1) {
        // Single marker - just center on it
        map.setView(bounds[0], 6);
      } else {
        // Multiple markers - fit all in view
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [articles, map]);

  return null;
}

/**
 * Get heat description based on heat level
 */
function getHeatDescription(heatLevel?: number): string {
  if (!heatLevel) return 'Single source';
  if (heatLevel <= 20) return 'Limited coverage';
  if (heatLevel <= 40) return 'Moderate coverage';
  if (heatLevel <= 60) return 'Good coverage';
  if (heatLevel <= 80) return 'High coverage';
  return 'Very hot topic!';
}

export function NewsMap({ articles, center = [20, 0], zoom = 2 }: NewsMapProps) {
  const articlesWithLocation = articles.filter(a => a.coordinates);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds articles={articlesWithLocation} />

      {articlesWithLocation.map((article) => {
        // Use article color from heat map, default to grey
        const color = article.color || '#6B7280';
        const heatLevel = article.heatLevel || 0;
        const coverage = article.coverage || 1;

        // Radius based on heat level (hotter = bigger)
        const radius = 8 + (heatLevel / 100) * 12; // 8-20px

        return (
          <CircleMarker
            key={article.id}
            center={[article.coordinates!.lat, article.coordinates!.lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6,
            }}
          >
            <Popup maxWidth={350} className="news-popup">
              <div className="p-2">
                {/* Heat indicator */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: color,
                      borderColor: color,
                      opacity: 0.8
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <Flame
                      className="w-4 h-4"
                      style={{ color: heatLevel > 50 ? '#EF4444' : '#6B7280' }}
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {getHeatDescription(heatLevel)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    ({coverage} {coverage === 1 ? 'source' : 'sources'})
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" style={{ color }} />
                  <h3 className="font-montserrat font-semibold text-sm leading-tight">
                    {article.title}
                  </h3>
                </div>

                {article.description && (
                  <p className="font-merriweather text-xs text-slate-600 mb-3 line-clamp-3">
                    {article.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {article.scale && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${color}20`,
                        color: heatLevel > 50 ? '#991B1B' : '#374151',
                        borderColor: color
                      }}
                    >
                      {article.scale}
                    </Badge>
                  )}
                  {article.category && (
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                  )}
                  {article.location && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {article.location}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Read more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Source */}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    Source: <span className="font-medium">{article.source.name}</span>
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
