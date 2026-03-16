import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import type { Topology, GeometryObject } from 'topojson-specification';
import type { NewsArticle } from '@/types/news';
import type { PreferenceLocation } from '@/types/preferences';
import type { StoryCluster } from '@/utils/topicClustering';
import type { ArcData } from '@/utils/arcBuilder';
import { playDiscoverSound, isSoundEnabled, setSoundEnabled } from '@/utils/soundManager';
import { Volume2, VolumeX } from 'lucide-react';
import RegionJumpPills from './RegionJumpPills';
import { filterArticlesByAltitude, getMaxMarkers, computeResultsCentroid, computeFlyToAltitude } from '@/utils/globeUtils';
import { DEFAULT_COUNTRY, SCALE_ALTITUDES } from '@/data/countries';
import { articlesToMarkers, type GlobeMarkerData } from './GlobeMarkers';
import { useGlobeAutoRotation } from './GlobeControls';
import { useGlobeInteraction } from './useGlobeInteraction';
import GlobeOverlay from './GlobeOverlay';
import GlobePopup from './GlobePopup';
import GlobeTooltip from './GlobeTooltip';
import {
  aggregateCountryHeat,
  heatToFillOpacity,
  crossfadeOpacity,
  heatmapLayerOpacity,
  audienceScaleToRadiusKm,
  generateBlobPolygon,
} from '@/utils/territoryHalos';
import { MEDIA_OUTLETS } from '@/data/media-outlets';

// Minimal GeoJSON feature shape returned by topojson feature()
interface GeoFeature {
  id: string | number;
  type: string;
  geometry: object;
  properties: Record<string, unknown>;
}

// Merged polygon: either a GeoJSON country feature or a blob, with __type metadata
interface MergedPolygon extends GeoFeature {
  __type: 'country' | 'blob';
  __heat: number;
  __color: string | null;
  __crossfadeOpacity: number;
  __articleId?: string;
}

// Subset of Three.js OrbitControls we actually use
interface OrbitControls {
  noZoom: boolean;
  minDistance: number;
  maxDistance: number;
  addEventListener: (event: string, listener: () => void) => void;
}

interface GlobeViewProps {
  articles: NewsArticle[];
  clusters: StoryCluster[];
  onFlyToReady?: (
    flyTo: (lat: number, lng: number, alt?: number) => void,
    flyToResults?: (articles: NewsArticle[]) => void
  ) => void;
  preferenceLocations?: PreferenceLocation[];
  searchResultIds?: Set<string> | null;
  selectedScale?: string;
}

// Spec: 300ms transition for marker fade in/out
const MARKER_TRANSITION_MS = 300;

// Gaussian KDE heatmap color scale: transparent → amber → orange → red
const heatColorFn = (t: number): string => {
  if (t < 0.04) return 'rgba(0,0,0,0)';
  const a = Math.min(1, t * 1.3);
  if (t < 0.35) return `rgba(245,158,11,${(a * 0.55).toFixed(3)})`;
  if (t < 0.70) return `rgba(249,115,22,${(a * 0.72).toFixed(3)})`;
  return `rgba(220,38,38,${(a * 0.88).toFixed(3)})`;
};

// ISO 3166-1 numeric → alpha-2 for countries with media outlets
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '032': 'ar', '036': 'au', '056': 'be', '076': 'br', '124': 'ca',
  '156': 'cn', '250': 'fr', '276': 'de', '356': 'in', '360': 'id',
  '380': 'it', '392': 'jp', '404': 'ke', '410': 'kr', '458': 'my',
  '484': 'mx', '528': 'nl', '566': 'ng', '620': 'pt', '643': 'ru',
  '682': 'sa', '702': 'sg', '710': 'za', '724': 'es', '756': 'ch',
  '764': 'th', '784': 'ae', '818': 'eg', '826': 'gb', '840': 'us',
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function GlobeView({
  articles,
  clusters,
  onFlyToReady,
  preferenceLocations = [],
  searchResultIds,
  selectedScale = 'all',
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof Globe> | null>(null);
  const countryPolygonsRef = useRef<GeoFeature[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarkerData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [altitude, setAltitude] = useState(0.8);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const isMobile = screenWidth < 768;

  const autoRotation = useGlobeAutoRotation({
    enabled: !isMobile,
    idleTimeout: 4000,
    rotationSpeed: 0.15,
  });

  const altitudeKm = altitude * 6371;
  const maxMarkers = getMaxMarkers(screenWidth);

  // Globe interaction (dormant/active)
  const { isActive, activate, deactivate, handleWheel, showScrollToast } =
    useGlobeInteraction({
      altitudeKm,
      isMobile,
      onDeactivate: () => {
        autoRotation.setActive(false);
      },
    });

  // Sync active state to auto-rotation
  useEffect(() => {
    if (isActive && !isMobile) {
      autoRotation.setActive(true);
    }
  }, [isActive, isMobile, autoRotation]);

  // Toggle globe zoom controls based on active state
  useEffect(() => {
    if (!globeRef.current || isMobile) return;
    const controls = globeRef.current.controls() as OrbitControls;
    if (controls) {
      controls.noZoom = !isActive;
    }
  }, [isActive, isMobile]);

  // Filter articles by current zoom level
  const visibleArticles = useMemo(
    () => filterArticlesByAltitude(articles, altitudeKm, maxMarkers),
    [articles, altitudeKm, maxMarkers]
  );

  // Convert to marker data with search dimming
  const markers = useMemo(
    () => articlesToMarkers(visibleArticles, searchResultIds, altitudeKm),
    [visibleArticles, searchResultIds, altitudeKm]
  );

  // Build merged polygon data (country fills + radial blobs)
  const mergedPolygons = useMemo(() => {
    if (countryPolygonsRef.current.length === 0) return [];

    const { country: countryOpacity, blob: blobOpacity } = crossfadeOpacity(altitudeKm);
    const countryHeatMap = aggregateCountryHeat(articles);

    // Country polygons tagged with type
    const countryPolys = countryPolygonsRef.current.map((feat) => {
      const numericCode = String(feat.id).padStart(3, '0');
      const alpha2 = NUMERIC_TO_ALPHA2[numericCode] || '';
      const heatEntry = countryHeatMap.get(alpha2);
      return {
        ...feat,
        __type: 'country',
        __heat: heatEntry?.heat || 0,
        __color: heatEntry?.color || null,
        __crossfadeOpacity: countryOpacity,
      };
    });

    // Radial blob polygons (skip on mobile for performance)
    let blobPolys: MergedPolygon[] = [];
    if (blobOpacity > 0 && !isMobile && altitudeKm > 500) {
      const withCoords = articles.filter(a => a.coordinates);
      blobPolys = withCoords.map(article => {
        const outlet = MEDIA_OUTLETS.find(o =>
          o.domain && article.source?.url?.includes(o.domain)
        );
        const radiusKm = audienceScaleToRadiusKm(outlet?.audienceScale);
        const blob = generateBlobPolygon(
          article.coordinates!.lat,
          article.coordinates!.lng,
          radiusKm
        );
        return {
          ...blob,
          __type: 'blob',
          __color: article.color || '#94A3B8',
          __heat: article.heatLevel || 0,
          __crossfadeOpacity: blobOpacity,
          __articleId: article.id,
        };
      });
    }

    return [...countryPolys, ...blobPolys];
  }, [articles, altitudeKm, isMobile]);

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
      .pointAltitude((d: object) => (d as GlobeMarkerData).isPrimarySource ? 0.04 : 0.01)
      .pointRadius('size')
      .pointColor((d: object) => {
        const marker = d as GlobeMarkerData;
        if (marker.opacity < 1) {
          return hexToRgba(marker.color, marker.opacity);
        }
        return marker.color;
      })
      .pointLabel('')
      .pointsMerge(false)
      .pointsTransitionDuration(MARKER_TRANSITION_MS)
      .onPointClick((point: object) => {
        const marker = point as GlobeMarkerData;
        if (marker.isCluster) {
          // Zoom in one level on cluster click
          const currentAlt = globe.pointOfView().altitude;
          let targetAlt = currentAlt * 0.3;
          if (targetAlt < SCALE_ALTITUDES.local) targetAlt = SCALE_ALTITUDES.local;
          globe.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: targetAlt }, 1000);
          autoRotation.onUserInteraction();
          return;
        }
        setSelectedArticle(marker.article);
        const coords = globe.getScreenCoords(marker.lat, marker.lng);
        setPopupPosition(coords ? { x: coords.x, y: coords.y } : { x: 0, y: 0 });
      })
      .onGlobeClick(() => {
        setSelectedArticle(null);
        globe.arcsData([]);
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

    // Load country polygons and store for territory halos
    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then((topology: Topology) => {
        const countries = feature(topology, topology.objects.countries as GeometryObject);
        countryPolygonsRef.current = countries.features;
        // Initial polygon render (will be updated by mergedPolygons effect)
        globe
          .polygonsData(countries.features)
          .polygonCapColor(() => 'rgba(30, 42, 58, 0.6)')
          .polygonSideColor(() => 'rgba(30, 42, 58, 0.2)')
          .polygonStrokeColor(() => 'rgba(148, 163, 184, 0.15)')
          .polygonAltitude(0.005);
      })
      .catch(() => {
        console.warn('Could not load country polygons');
      });

    // Set initial point of view (France centered, national scale)
    globe.pointOfView({ lat: 46.5, lng: 2.5, altitude: 0.8 }, 0);

    // Set zoom distance limits + dormant state
    const controls = globe.controls() as OrbitControls;
    if (controls) {
      const radius = globe.getGlobeRadius();
      controls.minDistance = radius * 1.02;
      controls.maxDistance = radius * 4.5;
      if (!isMobile) {
        controls.noZoom = true;
      }
    }

    // Gaussian KDE heatmap layer (replaces hexbin)
    globe
      .heatmapsData([])
      .heatmapPoints('points')
      .heatmapPointLat('lat')
      .heatmapPointLng('lng')
      .heatmapPointWeight('weight')
      .heatmapBandwidth('bandwidth')
      .heatmapColorFn('colorFn')
      .heatmapColorSaturation('colorSaturation')
      .heatmapBaseAltitude('baseAltitude')
      .heatmapsTransitionDuration(600);

    // Rings layer for breaking hotspots
    globe
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor('color')
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.5)
      .ringRepeatPeriod(1200)
      .ringAltitude(0.005)
      .ringResolution(64);

    // Arc layer for story threads (starts empty)
    globe
      .arcsData([])
      .arcStartLat('startLat')
      .arcEndLat('endLat')
      .arcStartLng('startLng')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcStroke(1.5)
      .arcAltitude(0.15)
      .arcDashLength(3)
      .arcDashGap(2)
      .arcDashAnimateTime(2000)
      .arcsTransitionDuration(300);

    // Track zoom changes
    globe.controls().addEventListener('change', () => {
      const pov = globe.pointOfView();
      setAltitude(pov.altitude);
      autoRotation.onUserInteraction();
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
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) canvas.remove();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose flyTo and flyToResults for external callers
  useEffect(() => {
    if (!globeRef.current || !onFlyToReady) return;

    const flyTo = (lat: number, lng: number, alt?: number) => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude: alt ?? 0.4 }, alt ? 1000 : 400);
        autoRotation.onUserInteraction();
      }
    };

    const flyToResults = (resultArticles: NewsArticle[]) => {
      const centroid = computeResultsCentroid(resultArticles);
      if (!centroid) return;
      const alt = computeFlyToAltitude(resultArticles);
      globeRef.current?.pointOfView(
        { lat: centroid.lat, lng: centroid.lng, altitude: alt },
        1000
      );
    };

    onFlyToReady(flyTo, flyToResults);
  }, [onFlyToReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus on primary preference location on mount
  const primaryLocKey = preferenceLocations.length > 0
    ? `${preferenceLocations[0].lat},${preferenceLocations[0].lng}`
    : '';

  useEffect(() => {
    if (!globeRef.current || !primaryLocKey) return;
    const primary = preferenceLocations[0];
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

  // Fly to preset altitude when scale changes
  const prevScaleRef = useRef(selectedScale);
  useEffect(() => {
    if (!globeRef.current || selectedScale === 'all' || selectedScale === prevScaleRef.current) return;
    prevScaleRef.current = selectedScale;
    const altitude = SCALE_ALTITUDES[selectedScale as keyof typeof SCALE_ALTITUDES];
    if (!altitude) return;

    const countryCenter = DEFAULT_COUNTRY.center;
    const pov = globeRef.current.pointOfView();
    const dLat = Math.abs(pov.lat - countryCenter.lat);
    const dLng = Math.abs(pov.lng - countryCenter.lng);
    if (dLat <= 10 && dLng <= 10) {
      globeRef.current.pointOfView({ lat: countryCenter.lat, lng: countryCenter.lng, altitude }, 1000);
    } else {
      globeRef.current.pointOfView({ ...pov, altitude }, 1000);
    }
    autoRotation.onUserInteraction();
  }, [selectedScale, autoRotation]);

  // Update markers when data changes
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(markers);
  }, [markers]);

  // Update polygon data (territory halos) when merged polygons change
  useEffect(() => {
    if (!globeRef.current || mergedPolygons.length === 0) return;
    globeRef.current
      .polygonsData(mergedPolygons)
      .polygonCapColor((d: object) => {
        const poly = d as MergedPolygon;
        if (poly.__type === 'blob') {
          const alpha = 0.15 * poly.__crossfadeOpacity;
          if (searchResultIds && !searchResultIds.has(poly.__articleId ?? '')) {
            return 'rgba(0,0,0,0)';
          }
          return hexToRgba(poly.__color ?? '#94A3B8', alpha);
        }
        if (!poly.__color) return 'rgba(30, 42, 58, 0.6)';
        const heatAlpha = heatToFillOpacity(poly.__heat);
        const alpha = heatAlpha * poly.__crossfadeOpacity;
        return hexToRgba(poly.__color, alpha);
      })
      .polygonSideColor((d: object) => {
        const poly = d as MergedPolygon;
        if (poly.__type === 'blob') return 'rgba(0,0,0,0)';
        return 'rgba(30, 42, 58, 0.2)';
      })
      .polygonStrokeColor((d: object) => {
        const poly = d as MergedPolygon;
        if (poly.__type === 'blob') return 'rgba(0,0,0,0)';
        return 'rgba(148, 163, 184, 0.15)';
      })
      .polygonAltitude((d: object) => {
        const poly = d as MergedPolygon;
        if (poly.__type === 'blob') return 0.006;
        return 0.005;
      });
  }, [mergedPolygons, searchResultIds]);

  // Update Gaussian KDE heatmap when articles or zoom changes
  useEffect(() => {
    if (!globeRef.current) return;
    const opacity = heatmapLayerOpacity(altitudeKm);
    if (opacity === 0) {
      globeRef.current.heatmapsData([]);
      return;
    }
    // Bandwidth narrows as user zooms in: wide blobs at global, tight at national
    const bandwidth = altitudeKm > 5000 ? 4.0 : altitudeKm > 2500 ? 3.0 : 2.0;
    globeRef.current.heatmapsData([{
      points: articles
        .filter(a => a.coordinates)
        .map(a => ({
          lat: a.coordinates!.lat,
          lng: a.coordinates!.lng,
          weight: (a.heatLevel || 1) / 100,
        })),
      bandwidth,
      colorFn: heatColorFn,
      colorSaturation: 1.5,
      baseAltitude: 0.001,
    }]);
  }, [articles, altitudeKm]);

  // Update rings for the hottest articles (national→regional zoom only)
  useEffect(() => {
    if (!globeRef.current) return;
    if (altitudeKm > 8000 || altitudeKm < 300) {
      globeRef.current.ringsData([]);
      return;
    }
    const hotArticles = articles
      .filter(a => a.coordinates && (a.heatLevel || 0) >= 60)
      .sort((a, b) => (b.heatLevel || 0) - (a.heatLevel || 0))
      .slice(0, 15);
    globeRef.current.ringsData(hotArticles.map(a => ({
      lat: a.coordinates!.lat,
      lng: a.coordinates!.lng,
      color: [(t: number) => `rgba(245,158,11,${(Math.max(0, 1 - t) * 0.55).toFixed(3)})`],
    })));
  }, [articles, altitudeKm]);

  // Pause RAF when globe is off-screen
  const isVisibleRef = useRef(true);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-rotation + very-hot marker pulse animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (globeRef.current && isVisibleRef.current) {
        const pov = globeRef.current.pointOfView();

        if (!isMobile) {
          const angle = autoRotation.getRotationAngle();
          if (angle !== null) {
            globeRef.current.pointOfView({ lat: pov.lat, lng: angle, altitude: pov.altitude }, 0);
          }
        }

        const time = Date.now() / 1000;
        globeRef.current.pointAltitude((d: object) => {
          const marker = d as GlobeMarkerData;
          if (marker.heatLevel >= 81) {
            return 0.01 + Math.sin(time * 2) * 0.008;
          }
          return 0.01;
        });
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isMobile, autoRotation]);

  const handleRegionJump = useCallback((loc: PreferenceLocation, index: number) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 1.2 }, 1000);
      setActiveRegionIndex(index);
      autoRotation.onUserInteraction();
    }
  }, [autoRotation]);

  const handleShowArcs = useCallback((arcs: ArcData[]) => {
    if (globeRef.current) {
      globeRef.current.arcsData(arcs);
    }
  }, []);

  const handleFlyToArticle = useCallback((lat: number, lng: number) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.2 }, 1000);
      autoRotation.onUserInteraction();
      playDiscoverSound();
    }
  }, [autoRotation]);

  return (
    <div
      id="globe-section"
      className="relative w-full bg-navy-900"
      style={{ height: isMobile ? '400px' : '600px' }}
      onWheel={handleWheel}
    >
      <GlobeOverlay
        showOverlay={!isActive && !isMobile}
        showScrollToast={showScrollToast}
        onActivate={activate}
      />
      <div
        ref={containerRef}
        className={`w-full h-full ${isActive ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #050d18 70%, #000000 100%)' }}
        onClick={(e) => {
          // Click on globe canvas activates interaction
          if (!isActive && !isMobile) {
            activate();
          }
        }}
      />

      {/* Scale indicator + country — upper-left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-2 font-body text-xs">
          <div className="text-ivory-200/80 font-semibold">
            {preferenceLocations.length > 0 ? preferenceLocations[0].name : 'Global'}
          </div>
          <div className="text-ivory-200/50 mt-0.5">
            {altitudeKm > 8000 && 'International view'}
            {altitudeKm > 3000 && altitudeKm <= 8000 && 'National view'}
            {altitudeKm > 800 && altitudeKm <= 3000 && 'Regional view'}
            {altitudeKm <= 800 && 'Local view'}
            <span className="ml-2 text-amber-400/60">{visibleArticles.length} stories</span>
          </div>
          {!isMobile && (
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              className="mt-1 text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
              title={soundOn ? 'Mute discovery sound' : 'Enable discovery sound'}
            >
              {soundOn ? <Volume2 className="w-3 h-3 inline" /> : <VolumeX className="w-3 h-3 inline" />}
            </button>
          )}
        </div>
      </div>

      {/* Region jump pills */}
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
          onClose={() => {
            setSelectedArticle(null);
            if (globeRef.current) globeRef.current.arcsData([]);
          }}
          clusters={clusters}
          onShowArcs={handleShowArcs}
          onFlyToArticle={handleFlyToArticle}
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
