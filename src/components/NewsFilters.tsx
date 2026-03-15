import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface NewsFiltersType {
  countries: string[];
  languages: string[];
  categories: string[];
  scale: 'all' | 'local' | 'regional' | 'national' | 'international';
  prioritydomain?: 'top' | 'medium' | 'low';
}

interface NewsFiltersProps {
  onFilterChange: (filters: NewsFiltersType) => void;
  onClear?: () => void;
  currentFilters?: NewsFiltersType;
}

const COUNTRIES = [
  { code: 'ar', name: 'Argentina', flag: '🇦🇷' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'cn', name: 'China', flag: '🇨🇳' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'my', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: 'za', name: 'South Africa', flag: '🇿🇦' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'th', name: 'Thailand', flag: '🇹🇭' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'th', name: 'Thai' },
];

const CATEGORIES = [
  { id: 'business', name: 'Business' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'environment', name: 'Environment' },
  { id: 'food', name: 'Food' },
  { id: 'health', name: 'Health' },
  { id: 'politics', name: 'Politics' },
  { id: 'science', name: 'Science' },
  { id: 'sports', name: 'Sports' },
  { id: 'technology', name: 'Technology' },
  { id: 'top', name: 'Top Stories' },
  { id: 'tourism', name: 'Tourism' },
  { id: 'world', name: 'World' },
];

const SCALES = [
  { id: 'all', name: 'All' },
  { id: 'local', name: 'Local' },
  { id: 'regional', name: 'Regional' },
  { id: 'national', name: 'National' },
  { id: 'international', name: 'International' },
];

const PRIORITIES = [
  { id: 'all', name: 'All Sources' },
  { id: 'top', name: 'Top Tier' },
  { id: 'medium', name: 'Medium+' },
];

export function NewsFilters({ onFilterChange, onClear, currentFilters }: NewsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const defaultFilters: NewsFiltersType = {
    countries: [],
    languages: [],
    categories: [],
    scale: 'all',
  };
  const [localFilters, setLocalFilters] = useState<NewsFiltersType>(currentFilters || defaultFilters);

  const toggleCountry = (code: string) => {
    const newCountries = localFilters.countries.includes(code)
      ? localFilters.countries.filter(c => c !== code)
      : [...localFilters.countries, code];
    setLocalFilters({ ...localFilters, countries: newCountries });
  };

  const toggleLanguage = (code: string) => {
    const newLanguages = localFilters.languages.includes(code)
      ? localFilters.languages.filter(l => l !== code)
      : [...localFilters.languages, code];
    setLocalFilters({ ...localFilters, languages: newLanguages });
  };

  const toggleCategory = (id: string) => {
    const newCategories = localFilters.categories.includes(id)
      ? localFilters.categories.filter(c => c !== id)
      : [...localFilters.categories, id];
    setLocalFilters({ ...localFilters, categories: newCategories });
  };

  const applyFilters = () => onFilterChange(localFilters);

  const resetFilters = () => {
    const df: NewsFiltersType = { countries: [], languages: [], categories: [], scale: 'all' };
    setLocalFilters(df);
    if (onClear) { onClear(); } else { onFilterChange(df); }
  };

  const activeFiltersCount =
    localFilters.countries.length +
    localFilters.languages.length +
    localFilters.categories.length +
    (localFilters.prioritydomain ? 1 : 0);

  return (
    <div className="bg-ivory-50/80 border border-amber-200/30 rounded-lg">
      {/* Scale selector — always visible */}
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {SCALES.map(s => (
            <Button
              key={s.id}
              variant={localFilters.scale === s.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const updated = { ...localFilters, scale: s.id as NewsFiltersType['scale'] };
                setLocalFilters(updated);
                // Scale applies immediately (primary filter control, no staged apply needed)
                onFilterChange(updated);
              }}
              className={`font-body text-xs h-8 ${
                localFilters.scale === s.id
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border-amber-200/40 text-navy-700/50 hover:border-amber-300'
              }`}
            >
              {s.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters header — collapsible toggle */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-amber-50/30 transition-colors border-t border-amber-200/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-navy-700/40" />
          <h3 className="font-display text-sm font-semibold text-navy-800">Advanced Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-amber-600 text-white font-body text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-navy-700/30" />
          : <ChevronDown className="w-4 h-4 text-navy-700/30" />
        }
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-amber-200/20 space-y-5">
          {/* Countries */}
          <div>
            <Label className="font-body text-xs font-semibold text-navy-700/50 mb-2 block">
              Countries ({localFilters.countries.length})
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-white/60 rounded-md border border-amber-200/20">
              {COUNTRIES.map(c => (
                <Badge
                  key={c.code}
                  variant={localFilters.countries.includes(c.code) ? 'default' : 'outline'}
                  className={`cursor-pointer font-body text-[11px] transition-all ${
                    localFilters.countries.includes(c.code)
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                      : 'border-amber-200/30 text-navy-700/40 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                  onClick={() => toggleCountry(c.code)}
                >
                  <span className="mr-1">{c.flag}</span>
                  {c.name}
                  {localFilters.countries.includes(c.code) && <X className="w-2.5 h-2.5 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <Label className="font-body text-xs font-semibold text-navy-700/50 mb-2 block">
              Languages ({localFilters.languages.length})
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white/60 rounded-md border border-amber-200/20">
              {LANGUAGES.map(l => (
                <Badge
                  key={l.code}
                  variant={localFilters.languages.includes(l.code) ? 'default' : 'outline'}
                  className={`cursor-pointer font-body text-[11px] transition-all ${
                    localFilters.languages.includes(l.code)
                      ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600'
                      : 'border-amber-200/30 text-navy-700/40 hover:bg-sky-50 hover:border-sky-300'
                  }`}
                  onClick={() => toggleLanguage(l.code)}
                >
                  {l.name}
                  {localFilters.languages.includes(l.code) && <X className="w-2.5 h-2.5 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <Label className="font-body text-xs font-semibold text-navy-700/50 mb-2 block">
              Categories ({localFilters.categories.length})
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <Badge
                  key={cat.id}
                  variant={localFilters.categories.includes(cat.id) ? 'default' : 'outline'}
                  className={`cursor-pointer font-body text-[11px] transition-all ${
                    localFilters.categories.includes(cat.id)
                      ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                      : 'border-amber-200/30 text-navy-700/40 hover:bg-violet-50 hover:border-violet-300'
                  }`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.name}
                  {localFilters.categories.includes(cat.id) && <X className="w-2.5 h-2.5 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Source Priority */}
          <div>
            <Label className="font-body text-xs font-semibold text-navy-700/50 mb-2 block">Source Priority</Label>
            <Select
              value={localFilters.prioritydomain || 'all'}
              onValueChange={(value: string) =>
                setLocalFilters({
                  ...localFilters,
                  prioritydomain: value === 'all' ? undefined : value as 'top' | 'medium' | 'low',
                })
              }
            >
              <SelectTrigger className="w-48 font-body text-sm border-amber-200/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.id} value={p.id} className="font-body text-sm">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-amber-200/20">
            <Button
              onClick={applyFilters}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-body text-sm"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Apply Filters
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="border-amber-200/40 hover:bg-amber-50 font-body text-sm"
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
