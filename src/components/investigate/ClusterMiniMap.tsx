// src/components/investigate/ClusterMiniMap.tsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { NewsArticle } from '@/types/news';
import 'leaflet/dist/leaflet.css';

interface ClusterMiniMapProps {
  articles: NewsArticle[];
  heatColor: string;
}

function FitBounds({ articles }: { articles: NewsArticle[] }) {
  const map = useMap();

  useEffect(() => {
    if (articles.length === 0) return;

    const coords: [number, number][] = articles.map(a => [a.coordinates!.lat, a.coordinates!.lng]);

    // Check unique positions (rounded to 1 decimal)
    const unique = new Set(coords.map(([lat, lng]) => `${Math.round(lat * 10)},${Math.round(lng * 10)}`));

    if (unique.size >= 2) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], animate: false });
    } else {
      map.setView(coords[0], 6, { animate: false });
    }
  }, [articles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function ClusterMiniMap({ articles, heatColor }: ClusterMiniMapProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-ivory-200/10 mb-4">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="w-full"
        style={{ height: 280, background: '#0a0a0f' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {articles.map(article => (
          <CircleMarker
            key={article.id}
            center={[article.coordinates!.lat, article.coordinates!.lng]}
            radius={7}
            fillColor={heatColor}
            fillOpacity={0.8}
            stroke={true}
            color={heatColor}
            weight={1}
            opacity={0.3}
          />
        ))}
        <FitBounds articles={articles} />
      </MapContainer>
    </div>
  );
}
