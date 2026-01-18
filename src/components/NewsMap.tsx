import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { NewsArticle } from '@/types/news';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, Calendar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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

      {articlesWithLocation.map((article) => (
        <Marker
          key={article.id}
          position={[article.coordinates!.lat, article.coordinates!.lng]}
        >
          <Popup maxWidth={300} className="news-popup">
            <div className="p-2">
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
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
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
