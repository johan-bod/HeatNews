import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useGuideTour } from '@/hooks/useGuideTour';

interface Props {
  isReady: boolean;
}

export default function GuideTour({ isReady }: Props) {
  const { isActive, step, totalSteps, stepConfig, next, skip } = useGuideTour(isReady);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isActive || !stepConfig) return;

    const compute = () => {
      const el = document.querySelector(stepConfig.targetSelector);
      if (!el) {
        setTooltipStyle({ bottom: '24px', left: '50%', transform: 'translateX(-50%)' });
        return;
      }
      const rect = el.getBoundingClientRect();
      const MARGIN = 12;
      const maxLeft = window.innerWidth - 300 - MARGIN;

      if (stepConfig.position === 'above') {
        setTooltipStyle({
          bottom: `${window.innerHeight - rect.top + MARGIN}px`,
          left: `${Math.max(MARGIN, Math.min(rect.left, maxLeft))}px`,
        });
      } else if (stepConfig.position === 'below') {
        setTooltipStyle({
          top: `${rect.bottom + MARGIN}px`,
          left: `${Math.max(MARGIN, Math.min(rect.left, maxLeft))}px`,
        });
      } else {
        // center — bottom-center of screen
        setTooltipStyle({ bottom: '28px', left: '50%', transform: 'translateX(-50%)' });
      }
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [isActive, step, stepConfig]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    if (isActive) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, skip]);

  if (!isActive) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/40" aria-hidden="true" />

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={stepConfig.title}
        className="fixed z-[91] w-72 rounded-xl bg-navy-800 border border-ivory-200/10 p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-sm font-semibold text-ivory-100">{stepConfig.title}</h3>
          <button
            onClick={skip}
            aria-label="Skip tour"
            className="flex-shrink-0 text-ivory-200/30 hover:text-ivory-200/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="font-body text-xs text-ivory-200/60 leading-relaxed mb-4">{stepConfig.body}</p>
        <div className="flex items-center justify-between">
          <span className="font-body text-[10px] text-ivory-200/25">{step + 1} of {totalSteps}</span>
          <button
            onClick={next}
            autoFocus
            className="font-body text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-navy-900 px-3 py-1.5 rounded-lg transition-colors"
          >
            {step < totalSteps - 1 ? 'Next' : 'Done'}
          </button>
        </div>
      </div>
    </>
  );
}
