import { useState, useEffect } from 'react';

export interface TourStep {
  targetSelector: string;
  title: string;
  body: string;
  position: 'above' | 'below' | 'center';
}

const STEPS: TourStep[] = [
  {
    targetSelector: '#globe-section',
    title: 'This is your story map',
    body: 'Each dot is a story cluster — a group of articles from different outlets covering the same event. The more outlets report it, the hotter it gets.',
    position: 'center',
  },
  {
    targetSelector: '#globe-legend',
    title: 'Heat = coverage intensity',
    body: "Cold (grey) means few sources. Hot (red) means many credible outlets are covering it. Heat isn't importance — it's how widely a story is being reported.",
    position: 'above',
  },
  {
    targetSelector: '#globe-section',
    title: 'Click any dot to explore',
    body: "Clicking a globe dot opens a story popup. Clustered stories have a card below — click it to jump straight into investigation mode.",
    position: 'center',
  },
  {
    targetSelector: '[data-guide="investigate-btn"]',
    title: 'The Investigate dashboard',
    body: 'All story clusters ranked by heat, with source breakdowns, coverage gaps, and perspective analysis. Your newsroom control room.',
    position: 'below',
  },
];

const STORAGE_KEY = 'ht-guide-seen';

export function useGuideTour(isReady: boolean) {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
    const timer = setTimeout(() => setIsActive(true), 1200);
    return () => clearTimeout(timer);
  }, [isReady]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setIsActive(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  return {
    isActive,
    step,
    totalSteps: STEPS.length,
    stepConfig: STEPS[step],
    next,
    skip: dismiss,
  };
}
