import { MousePointer2 } from 'lucide-react';

interface GlobeOverlayProps {
  showOverlay: boolean;
  showScrollToast: boolean;
  onActivate: () => void;
}

export default function GlobeOverlay({
  showOverlay,
  showScrollToast,
  onActivate,
}: GlobeOverlayProps) {
  return (
    <>
      {showOverlay && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          onClick={onActivate}
          role="button"
          aria-label="Click to interact with the globe"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onActivate();
          }}
        >
          <div className="bg-navy-900/60 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 pointer-events-none">
            <MousePointer2 className="w-4 h-4 text-ivory-200/50" />
            <span className="font-body text-xs text-ivory-200/50">
              Click to interact
            </span>
          </div>
        </div>
      )}

      {showScrollToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-fade-up">
          <div className="bg-navy-900/80 backdrop-blur-sm px-3 py-1.5 rounded-md">
            <span className="font-body text-[11px] text-ivory-200/40">
              Scrolling page
            </span>
          </div>
        </div>
      )}
    </>
  );
}
