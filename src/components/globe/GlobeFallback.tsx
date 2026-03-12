import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { NewsArticle } from '@/types/news';
import { getMarkerColor, getMarkerSize } from '@/utils/globeUtils';
import 'leaflet/dist/leaflet.css';

interface GlobeFallbackProps {
  articles: NewsArticle[];
}

export default function GlobeFallback({ articles }: GlobeFallbackProps) {
  const articlesWithCoords = articles.filter(a => a.coordinates);

  return (
    <div className="w-full h-full bg-navy-900 rounded-lg overflow-hidden">
      <div className="absolute top-3 left-3 z-[1000] bg-navy-900/80 backdrop-blur-sm px-3 py-1.5 rounded text-ivory-200/60 font-body text-xs border border-amber-500/20">
        2D map — WebGL unavailable
      </div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
        style={{ background: '#0F1722' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {articlesWithCoords.map(article => (
          <CircleMarker
            key={article.id}
            center={[article.coordinates!.lat, article.coordinates!.lng]}
            radius={getMarkerSize(article.heatLevel || 0) * 12}
            fillColor={getMarkerColor(article.heatLevel || 0)}
            fillOpacity={0.7}
            stroke={false}
          >
            <Popup>
              <div className="font-body text-sm">
                <strong>{article.title}</strong>
                <br />
                <span className="text-xs text-gray-500">{article.source.name}</span>
                <br />
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Read article →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
