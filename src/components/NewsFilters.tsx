import React, { useState } from 'react';
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

// Available countries (most popular ones)
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

// Available languages
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

// Available categories
const CATEGORIES = [
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'environment', name: 'Environment', icon: '🌍' },
  { id: 'food', name: 'Food', icon: '🍽️' },
  { id: 'health', name: 'Health', icon: '🏥' },
  { id: 'politics', name: 'Politics', icon: '🏛️' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'top', name: 'Top Stories', icon: '⭐' },
  { id: 'tourism', name: 'Tourism', icon: '✈️' },
  { id: 'world', name: 'World', icon: '🌐' },
];

const SCALES = [
  { id: 'all', name: 'All Scales', icon: '🌐' },
  { id: 'local', name: 'Local', icon: '📍' },
  { id: 'regional', name: 'Regional', icon: '🗺️' },
  { id: 'national', name: 'National', icon: '🏴' },
  { id: 'international', name: 'International', icon: '🌍' },
];

const PRIORITIES = [
  { id: 'all', name: 'All Sources' },
  { id: 'top', name: 'Top Tier Only' },
  { id: 'medium', name: 'Medium & Above' },
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

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const resetFilters = () => {
    const defaultFilters: NewsFiltersType = {
      countries: [],
      languages: [],
      categories: [],
      scale: 'all',
    };
    setLocalFilters(defaultFilters);
    if (onClear) {
      onClear();
    } else {
      onFilterChange(defaultFilters);
    }
  };

  const activeFiltersCount =
    localFilters.countries.length +
    localFilters.languages.length +
    localFilters.categories.length +
    (localFilters.scale !== 'all' ? 1 : 0) +
    (localFilters.prioritydomain ? 1 : 0);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-300 rounded-lg shadow-md">
      {/* Filter Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-montserrat font-semibold text-slate-800">
            Advanced Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-blue-500 text-white">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-6 border-t border-slate-200 space-y-6">
          {/* Scale Filter */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              News Scale
            </Label>
            <div className="flex flex-wrap gap-2">
              {SCALES.map(scale => (
                <Button
                  key={scale.id}
                  variant={localFilters.scale === scale.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters({ ...localFilters, scale: scale.id as any })}
                  className={
                    localFilters.scale === scale.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                      : ''
                  }
                >
                  <span className="mr-2">{scale.icon}</span>
                  {scale.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Countries Filter */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Countries ({localFilters.countries.length} selected)
            </Label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-md">
              {COUNTRIES.map(country => (
                <Badge
                  key={country.code}
                  variant={
                    localFilters.countries.includes(country.code)
                      ? 'default'
                      : 'outline'
                  }
                  className={`cursor-pointer transition-all ${
                    localFilters.countries.includes(country.code)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleCountry(country.code)}
                >
                  <span className="mr-1">{country.flag}</span>
                  {country.name}
                  {localFilters.countries.includes(country.code) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Languages Filter */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Languages ({localFilters.languages.length} selected)
            </Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-md">
              {LANGUAGES.map(lang => (
                <Badge
                  key={lang.code}
                  variant={
                    localFilters.languages.includes(lang.code)
                      ? 'default'
                      : 'outline'
                  }
                  className={`cursor-pointer transition-all ${
                    localFilters.languages.includes(lang.code)
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleLanguage(lang.code)}
                >
                  {lang.name}
                  {localFilters.languages.includes(lang.code) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Categories ({localFilters.categories.length} selected)
            </Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Badge
                  key={cat.id}
                  variant={
                    localFilters.categories.includes(cat.id)
                      ? 'default'
                      : 'outline'
                  }
                  className={`cursor-pointer transition-all ${
                    localFilters.categories.includes(cat.id)
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.name}
                  {localFilters.categories.includes(cat.id) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Source Priority */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Source Priority
            </Label>
            <Select
              value={localFilters.prioritydomain || 'all'}
              onValueChange={(value: any) =>
                setLocalFilters({
                  ...localFilters,
                  prioritydomain: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(priority => (
                  <SelectItem key={priority.id} value={priority.id}>
                    {priority.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={applyFilters}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="hover:bg-slate-100"
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
