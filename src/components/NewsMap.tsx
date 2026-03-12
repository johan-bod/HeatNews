import { useEffect } from 'react';
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
        map.setView(bounds[0], 6);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [articles, map]);

  return null;
}

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
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds articles={articlesWithLocation} />

      {articlesWithLocation.map((article) => {
        const color = article.color || '#94A3B8';
        const heatLevel = article.heatLevel || 0;
        const coverage = article.coverage || 1;
        const radius = 7 + (heatLevel / 100) * 11;

        return (
          <CircleMarker
            key={article.id}
            center={[article.coordinates!.lat, article.coordinates!.lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 1.5,
              opacity: 0.7,
              fillOpacity: 0.5,
            }}
          >
            <Popup maxWidth={320} className="news-popup">
              <div className="p-1.5">
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b" style={{ borderColor: `${color}30` }}>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color, opacity: 0.8 }}
                  />
                  <div className="flex items-center gap-1">
                    <Flame
                      className="w-3.5 h-3.5"
                      style={{ color: heatLevel > 50 ? '#EF4444' : '#94A3B8' }}
                    />
                    <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', fontWeight: 600, color: '#1E2A3A' }}>
                      {getHeatDescription(heatLevel)}
                    </span>
                  </div>
                  <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '10px', color: '#94A3B8' }}>
                    ({coverage} {coverage === 1 ? 'source' : 'sources'})
                  </span>
                </div>

                <div className="flex items-start gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
                  <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '13px', fontWeight: 600, lineHeight: 1.3, color: '#1E2A3A' }}>
                    {article.title}
                  </h3>
                </div>

                {article.description && (
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: '#64748B', lineHeight: 1.5, marginBottom: '8px' }}
                     className="line-clamp-3">
                    {article.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {article.scale && (
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                      style={{
                        fontFamily: '"DM Sans", sans-serif',
                        backgroundColor: `${color}15`,
                        color: '#1E2A3A',
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {article.scale}
                    </Badge>
                  )}
                  {article.category && (
                    <Badge variant="secondary" className="text-[10px]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                      {article.category}
                    </Badge>
                  )}
                  {article.location && (
                    <Badge variant="outline" className="text-[10px]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                      <MapPin className="w-2.5 h-2.5 mr-0.5" />
                      {article.location}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between" style={{ fontSize: '10px', color: '#94A3B8', fontFamily: '"DM Sans", sans-serif' }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                    style={{ color: '#D97706', fontWeight: 500 }}
                  >
                    Read more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #F5EFDF' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: '"DM Sans", sans-serif' }}>
                    Source: <span style={{ fontWeight: 500 }}>{article.source.name}</span>
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
