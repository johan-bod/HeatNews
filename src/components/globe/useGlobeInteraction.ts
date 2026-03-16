import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_DEZOOM_BUFFER = 3;

interface UseGlobeInteractionOptions {
  altitudeKm: number;
  minAltitudeKm?: number;
  isMobile: boolean;
  onDeactivate?: () => void;
}

interface UseGlobeInteractionReturn {
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  showScrollToast: boolean;
}

export function useGlobeInteraction({
  altitudeKm,
  minAltitudeKm = 200,
  isMobile,
  onDeactivate,
}: UseGlobeInteractionOptions): UseGlobeInteractionReturn {
  const [isActive, setIsActive] = useState(false);
  const [showScrollToast, setShowScrollToast] = useState(false);
  const dezoomCountRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDeactivateRef = useRef(onDeactivate);
  useEffect(() => { onDeactivateRef.current = onDeactivate; });

  const effectiveActive = isMobile ? true : isActive;

  const activate = useCallback(() => {
    if (isMobile) return;
    setIsActive(true);
    dezoomCountRef.current = 0;
  }, [isMobile]);

  const deactivate = useCallback(() => {
    if (isMobile) return;
    setIsActive(false);
    dezoomCountRef.current = 0;
    onDeactivateRef.current?.();
  }, [isMobile]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isMobile) return;

      if (!isActive) {
        return;
      }

      const isAtMinAltitude = altitudeKm <= minAltitudeKm + 50;
      const isScrollingDown = e.deltaY > 0;

      if (isAtMinAltitude && isScrollingDown) {
        dezoomCountRef.current++;
        if (dezoomCountRef.current >= MAX_DEZOOM_BUFFER) {
          setIsActive(false);
          dezoomCountRef.current = 0;
          onDeactivateRef.current?.();

          setShowScrollToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setShowScrollToast(false), 1000);
        }
      } else {
        dezoomCountRef.current = 0;
      }
    },
    [isActive, altitudeKm, minAltitudeKm, isMobile]
  );

  useEffect(() => {
    if (isMobile || !isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        deactivate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isMobile, deactivate]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return {
    isActive: effectiveActive,
    activate,
    deactivate,
    handleWheel,
    showScrollToast,
  };
}
