import { useRef, useEffect, useCallback } from 'react';

interface GlobeControlsOptions {
  idleTimeout?: number; // ms before auto-rotation resumes (default: 4000)
  rotationSpeed?: number; // degrees per frame (default: 0.15)
  enabled?: boolean; // disable on mobile
}

/**
 * Hook managing globe auto-rotation with idle timer.
 *
 * Spec: "3-5 second idle timer before auto-rotation resumes
 * after user interaction"
 *
 * Returns:
 * - onUserInteraction: call when user touches/drags/scrolls the globe
 * - getRotationAngle: returns current Y rotation angle (or null if paused)
 * - isRotating: whether auto-rotation is active
 */
export function useGlobeAutoRotation(options: GlobeControlsOptions = {}) {
  const {
    idleTimeout = 4000,
    rotationSpeed = 0.15,
    enabled = true,
  } = options;

  const isRotating = useRef(enabled);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const angleRef = useRef(0);
  const isGlobeActiveRef = useRef(false);

  const onUserInteraction = useCallback(() => {
    if (!enabled) return;

    // Stop rotation immediately on interaction
    isRotating.current = false;

    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Set new idle timer to resume rotation
    idleTimerRef.current = setTimeout(() => {
      isRotating.current = true;
    }, idleTimeout);
  }, [enabled, idleTimeout]);

  const setActive = useCallback((active: boolean) => {
    isGlobeActiveRef.current = active;
    if (!active) {
      // Returning to dormant — restart idle timer
      onUserInteraction();
    }
  }, [onUserInteraction]);

  const getRotationAngle = useCallback((): number | null => {
    if (isGlobeActiveRef.current) return null;
    if (!enabled || !isRotating.current) return null;
    angleRef.current = (angleRef.current + rotationSpeed) % 360;
    return angleRef.current;
  }, [enabled, rotationSpeed]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  return {
    onUserInteraction,
    getRotationAngle,
    isRotating: () => isRotating.current,
    setActive,
  };
}
