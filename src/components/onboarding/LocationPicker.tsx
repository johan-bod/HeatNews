import { useState, useMemo } from 'react';
import { MapPin, X, Search } from 'lucide-react';
import { LOCATIONS } from '@/data/geocoding-locations';
import type { PreferenceLocation } from '@/types/preferences';

interface LocationPickerProps {
  selected: PreferenceLocation[];
  onChange: (locations: PreferenceLocation[]) => void;
  max?: number;
}

/**
 * Build searchable location list from LOCATIONS database.
 * Groups by type based on naming conventions.
 */
function buildLocationList(): PreferenceLocation[] {
  return Object.entries(LOCATIONS).map(([key, coords]) => {
    // Determine type from key patterns
    let type: 'city' | 'country' | 'region' = 'city';
    // Keys that are country names (2-word or known countries)
    const countryKeys = ['united states', 'united kingdom', 'south korea', 'south africa',
      'new zealand', 'saudi arabia', 'costa rica', 'sri lanka', 'north korea',
      'france', 'germany', 'spain', 'italy', 'japan', 'china', 'india', 'brazil',
      'australia', 'canada', 'mexico', 'russia', 'turkey', 'egypt', 'nigeria',
      'argentina', 'colombia', 'indonesia', 'thailand', 'vietnam', 'poland',
      'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway',
      'denmark', 'finland', 'portugal', 'greece', 'ireland', 'czech republic'];
    const regionKeys = ['bretagne', 'normandie', 'provence', 'occitanie', 'auvergne',
      'aquitaine', 'alsace', 'lorraine', 'picardie', 'champagne',
      'île-de-france', 'bavière', 'catalonia', 'andalusia', 'lombardy',
      'tuscany', 'scotland', 'wales', 'northern ireland'];

    if (countryKeys.includes(key)) type = 'country';
    else if (regionKeys.some(r => key.includes(r))) type = 'region';

    const name = key
      .split(/[-\s]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return { name, key, lat: coords.lat, lng: coords.lng, type };
  });
}

const ALL_LOCATIONS = buildLocationList();

export default function LocationPicker({ selected, onChange, max = 5 }: LocationPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_LOCATIONS.slice(0, 30); // Show first 30 by default
    const q = search.toLowerCase();
    return ALL_LOCATIONS.filter(loc =>
      loc.name.toLowerCase().includes(q) || loc.key.includes(q)
    ).slice(0, 30);
  }, [search]);

  const add = (loc: PreferenceLocation) => {
    if (selected.length >= max) return;
    if (selected.some(s => s.key === loc.key)) return;
    onChange([...selected, loc]);
  };

  const remove = (key: string) => {
    onChange(selected.filter(s => s.key !== key));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-ivory-200/60">
          Choose locations to follow
        </p>
        <span className="font-body text-xs text-ivory-200/40">
          {selected.length}/{max}
        </span>
      </div>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map(loc => (
            <span
              key={loc.key}
              className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full px-3 py-1 font-body text-xs"
            >
              <MapPin className="w-3 h-3" />
              {loc.name}
              <button
                onClick={() => remove(loc.key)}
                className="hover:text-amber-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-200/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cities, countries, regions..."
          className="w-full bg-navy-900/60 border border-ivory-200/15 rounded-lg pl-10 pr-4 py-2.5 font-body text-sm text-ivory-50 placeholder-ivory-200/30 focus:outline-none focus:border-amber-500/40"
        />
      </div>

      {/* Location list */}
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-ivory-200/10 bg-navy-900/40 p-2">
        {filtered.map(loc => {
          const isSelected = selected.some(s => s.key === loc.key);
          return (
            <button
              key={loc.key}
              onClick={() => isSelected ? remove(loc.key) : add(loc)}
              disabled={!isSelected && selected.length >= max}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors
                ${isSelected
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-ivory-200/60 hover:bg-ivory-200/5 hover:text-ivory-200/80'
                }
                ${!isSelected && selected.length >= max ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-body text-sm flex-1">{loc.name}</span>
              <span className="font-body text-[10px] text-ivory-200/30 capitalize">{loc.type}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="font-body text-xs text-ivory-200/30 text-center py-4">
            No locations found
          </p>
        )}
      </div>
    </div>
  );
}
