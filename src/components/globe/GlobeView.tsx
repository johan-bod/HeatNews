import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import type { Topology, GeometryObject } from 'topojson-specification';
import type { NewsArticle } from '@/types/news';
import type { PreferenceLocation } from '@/types/preferences';
import RegionJumpPills from './RegionJumpPills';
import { filterArticlesByAltitude, getMaxMarkers } from '@/utils/globeUtils';
import { articlesToMarkers, type GlobeMarkerData } from './GlobeMarkers';
import { useGlobeAutoRotation } from './GlobeControls';
import GlobePopup from './GlobePopup';
import GlobeTooltip from './GlobeTooltip';

interface GlobeViewProps {
  articles: NewsArticle[];
  onFlyToReady?: (flyTo: (lat: number, lng: number) => void) => void;
  preferenceLocations?: PreferenceLocation[];
}

// Spec: 300ms transition for marker fade in/out
const MARKER_TRANSITION_MS = 300;

export default function GlobeView({ articles, onFlyToReady, preferenceLocations = [] }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof Globe> | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarkerData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [altitude, setAltitude] = useState(2.5); // Globe.gl altitude units
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
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
      })
      .onPointHover((point: object | null) => {
        if (point) {
          const marker = point as GlobeMarkerData;
          setHoveredMarker(marker);
          const coords = globe.getScreenCoords(marker.lat, marker.lng);
          setHoverPosition(coords ? { x: coords.x, y: coords.y } : { x: 0, y: 0 });
        } else {
          setHoveredMarker(null);
        }
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
        const countries = feature(topology, topology.objects.countries as GeometryObject);
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

    // Hex-bin heatmap glow layer — ambient warmth under markers
    globe
      .hexBinPointsData(articles.filter(a => a.coordinates).map(a => ({
        lat: a.coordinates!.lat,
        lng: a.coordinates!.lng,
        heatLevel: a.heatLevel || 0,
      })))
      .hexBinPointLat('lat')
      .hexBinPointLng('lng')
      .hexBinPointWeight((d: object) => (d as { heatLevel: number }).heatLevel)
      .hexBinResolution(3) // coarse bins for ambient effect
      .hexAltitude(0.003) // just above globe surface
      .hexTopColor((d: object) => {
        const pts = d as { points: { heatLevel: number }[] };
        const avgHeat = pts.points.reduce((s, p) => s + p.heatLevel, 0) / pts.points.length;
        const alpha = Math.min(0.35, avgHeat / 200);
        return `rgba(245, 158, 11, ${alpha})`; // amber glow
      })
      .hexSideColor(() => 'rgba(245, 158, 11, 0.02)')
      .hexBinMerge(true)
      .hexTransitionDuration(MARKER_TRANSITION_MS);

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

  // Expose flyTo for external callers (article feed)
  useEffect(() => {
    if (!globeRef.current || !onFlyToReady) return;
    onFlyToReady((lat: number, lng: number) => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude: 0.4 }, 1000);
        onUserInteraction();
      }
    });
  }, [onFlyToReady, onUserInteraction]);

  // Auto-focus on primary preference location on mount
  const primaryLocKey = preferenceLocations.length > 0
    ? `${preferenceLocations[0].lat},${preferenceLocations[0].lng}`
    : '';

  useEffect(() => {
    if (!globeRef.current || !primaryLocKey) return;
    const primary = preferenceLocations[0];
    // Delay to let globe initialize
    const timer = setTimeout(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: primary.lat, lng: primary.lng, altitude: 1.2 },
          1500
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [primaryLocKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when data changes (Globe.gl handles 300ms transition)
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(markers);
  }, [markers]);

  // Update hex-bin heatmap when articles change
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.hexBinPointsData(
      articles.filter(a => a.coordinates).map(a => ({
        lat: a.coordinates!.lat,
        lng: a.coordinates!.lng,
        heatLevel: a.heatLevel || 0,
      }))
    );
  }, [articles]);

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

  const handleRegionJump = useCallback((loc: PreferenceLocation, index: number) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 1.2 }, 1000);
      setActiveRegionIndex(index);
      onUserInteraction();
    }
  }, [onUserInteraction]);

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

      {/* Region jump pills (signed-in users with multiple locations) */}
      {preferenceLocations.length > 1 && (
        <RegionJumpPills
          locations={preferenceLocations}
          activeIndex={activeRegionIndex}
          onJump={handleRegionJump}
        />
      )}

      {/* Article popup */}
      {selectedArticle && (
        <GlobePopup
          article={selectedArticle}
          position={popupPosition}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* Hover tooltip */}
      {hoveredMarker && !selectedArticle && (
        <GlobeTooltip
          title={hoveredMarker.article.title}
          source={hoveredMarker.article.source.name}
          position={hoverPosition}
        />
      )}
    </div>
  );
}
