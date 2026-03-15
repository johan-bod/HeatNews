import { useState, useCallback, useRef, useEffect } from 'react';

interface UseGlobeInteractionOptions {
  altitudeKm: number;
  maxAltitudeKm?: number;
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
  maxAltitudeKm = 15000,
  isMobile,
  onDeactivate,
}: UseGlobeInteractionOptions): UseGlobeInteractionReturn {
  const [isActive, setIsActive] = useState(false);
  const [showScrollToast, setShowScrollToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveActive = isMobile ? true : isActive;

  const activate = useCallback(() => {
    if (isMobile) return;
    setIsActive(true);
  }, [isMobile]);

  const deactivate = useCallback(() => {
    if (isMobile) return;
    setIsActive(false);
    onDeactivate?.();
  }, [isMobile, onDeactivate]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isMobile || !isActive) return;

      const isAtMaxAltitude = altitudeKm >= maxAltitudeKm;
      const isScrollingDown = e.deltaY > 0;

      if (isAtMaxAltitude && isScrollingDown) {
        setIsActive(false);
        onDeactivate?.();

        setShowScrollToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setShowScrollToast(false), 1000);
      }
    },
    [isActive, altitudeKm, maxAltitudeKm, isMobile, onDeactivate]
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
