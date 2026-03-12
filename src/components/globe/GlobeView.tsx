import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { NewsArticle } from '@/types/news';
import { filterArticlesByAltitude, getMaxMarkers } from '@/utils/globeUtils';
import { articlesToMarkers, type GlobeMarkerData } from './GlobeMarkers';
import { useGlobeAutoRotation } from './GlobeControls';
import GlobePopup from './GlobePopup';

interface GlobeViewProps {
  articles: NewsArticle[];
}

// Spec: 300ms transition for marker fade in/out
const MARKER_TRANSITION_MS = 300;

export default function GlobeView({ articles }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof Globe> | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [altitude, setAltitude] = useState(2.5); // Globe.gl altitude units
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const isMobile = screenWidth < 768;

  const { onUserInteraction, getRotationAngle } = useGlobeAutoRotation({
    enabled: !isMobile, // Spec: disable auto-rotation on mobile
    idleTimeout: 4000,
    rotationSpeed: 0.15,
  });

  // Convert Globe.gl altitude to km (rough: altitude 1 ≈ 6371km earth radius)
  const altitudeKm = altitude * 6371;
  const maxMarkers = getMaxMarkers(screenWidth);

  // Filter articles by current zoom level
  const visibleArticles = useMemo(
    () => filterArticlesByAltitude(articles, altitudeKm, maxMarkers),
    [articles, altitudeKm, maxMarkers]
  );

  // Convert to marker data
  const markers = useMemo(
    () => articlesToMarkers(visibleArticles),
    [visibleArticles]
  );

  // Track screen width for responsive behavior
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Globe.gl
  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()(containerRef.current)
      .globeImageUrl('')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#1a365d')
      .atmosphereAltitude(0.15)
      .pointsData([])
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(0.01)
      .pointRadius('size')
      .pointColor('color')
      .pointLabel('')
      // Spec: 300ms transition for marker fade in/out between zoom levels
      .pointsMerge(false)
      .pointsTransitionDuration(MARKER_TRANSITION_MS)
      .onPointClick((point: object) => {
        const marker = point as GlobeMarkerData;
        setSelectedArticle(marker.article);
        const coords = globe.getScreenCoords(marker.lat, marker.lng);
        setPopupPosition(coords ? { x: coords.x, y: coords.y } : { x: 0, y: 0 });
      })
      .onGlobeClick(() => {
        setSelectedArticle(null);
      });

    // Dark editorial style: custom globe material
    const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial;
    if (globeMaterial) {
      globeMaterial.color.set('#0F1722');
      globeMaterial.emissive.set('#0a1628');
      globeMaterial.emissiveIntensity = 0.1;
      globeMaterial.shininess = 0.7;
    }

    // Show country polygons with subtle borders
    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then((topology: Topology) => {
        const countries = feature(topology, topology.objects.countries as any);
        globe
          .polygonsData(countries.features)
          .polygonCapColor(() => 'rgba(30, 42, 58, 0.6)')
          .polygonSideColor(() => 'rgba(30, 42, 58, 0.2)')
          .polygonStrokeColor(() => 'rgba(148, 163, 184, 0.15)')
          .polygonAltitude(0.005);
      })
      .catch(() => {
        // Graceful: globe works without country borders
        console.warn('Could not load country polygons');
      });

    // Set initial point of view (Europe centered)
    globe.pointOfView({ lat: 46, lng: 2, altitude: 2.5 }, 0);

    // Track zoom changes
    globe.controls().addEventListener('change', () => {
      const pov = globe.pointOfView();
      setAltitude(pov.altitude);
      onUserInteraction();
    });

    globeRef.current = globe;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        globe.width(containerRef.current.clientWidth);
        globe.height(containerRef.current.clientHeight);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      // Globe.gl cleanup: remove the renderer's DOM element
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) canvas.remove();
      }
    };
  }, [onUserInteraction]);

  // Update markers when data changes (Globe.gl handles 300ms transition)
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(markers);
  }, [markers]);

  // Auto-rotation + very-hot marker pulse animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (globeRef.current) {
        // Auto-rotation (desktop only) — getRotationAngle returns null when paused
        if (!isMobile) {
          const angle = getRotationAngle();
          if (angle !== null && globeRef.current) {
            const pov = globeRef.current.pointOfView();
            globeRef.current.pointOfView({ lat: pov.lat, lng: angle, altitude: pov.altitude }, 0);
          }
        }

        // Pulse very-hot markers (81-100 heat) by oscillating their altitude
        const time = Date.now() / 1000;
        globeRef.current.pointAltitude((d: object) => {
          const marker = d as GlobeMarkerData;
          if (marker.heatLevel >= 81) {
            return 0.01 + Math.sin(time * 2) * 0.008; // subtle altitude pulse
          }
          return 0.01;
        });
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isMobile, getRotationAngle]);

  return (
    <div className="relative w-full" style={{ height: isMobile ? '400px' : '600px' }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #050d18 70%, #000000 100%)' }}
      />

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 font-body text-xs text-ivory-200/60">
          {altitudeKm > 8000 && 'International view'}
          {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
          {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
          {altitudeKm <= 800 && 'Local view'}
          <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
        </div>
      </div>

      {/* Article popup */}
      {selectedArticle && (
        <GlobePopup
          article={selectedArticle}
          position={popupPosition}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}
