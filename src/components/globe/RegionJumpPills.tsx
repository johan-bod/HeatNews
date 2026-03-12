import { MapPin } from 'lucide-react';
import type { PreferenceLocation } from '@/types/preferences';

interface RegionJumpPillsProps {
  locations: PreferenceLocation[];
  activeIndex: number;
  onJump: (location: PreferenceLocation, index: number) => void;
}

/**
 * Floating pills for jumping between preference regions.
 * Spec: "Quick-jump buttons appear for other preference regions"
 */
export default function RegionJumpPills({ locations, activeIndex, onJump }: RegionJumpPillsProps) {
  if (locations.length <= 1) return null;

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
      {locations.map((loc, i) => (
        <button
          key={loc.key}
          onClick={() => onJump(loc, i)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-xs
            backdrop-blur-sm border transition-all duration-200
            ${i === activeIndex
              ? 'bg-amber-500/25 border-amber-500/50 text-amber-300'
              : 'bg-navy-900/70 border-ivory-200/15 text-ivory-200/60 hover:border-amber-500/30 hover:text-ivory-200/80'
            }
          `}
        >
          <MapPin className="w-3 h-3" />
          {loc.name}
        </button>
      ))}
    </div>
  );
}
