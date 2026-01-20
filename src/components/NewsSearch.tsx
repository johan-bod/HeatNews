import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface SearchParams {
  query: string;
  scale: 'all' | 'local' | 'regional' | 'national' | 'international';
}

interface NewsSearchProps {
  onSearch: (params: SearchParams) => void;
  onClear: () => void;
  isSearching?: boolean;
  currentSearch?: SearchParams;
}

const SCALES = [
  { id: 'all', name: 'All Scales', icon: '🌐', description: 'Search across all news scales' },
  { id: 'local', name: 'Local Only', icon: '📍', description: 'City and community news' },
  { id: 'regional', name: 'Regional Only', icon: '🗺️', description: 'State and regional news' },
  { id: 'national', name: 'National Only', icon: '🏴', description: 'Country-level news' },
  { id: 'international', name: 'International Only', icon: '🌍', description: 'Global news' },
];

const SUGGESTED_SEARCHES = [
  'climate change',
  'elections',
  'technology',
  'healthcare',
  'economy',
  'education',
  'sports',
  'entertainment',
];

export function NewsSearch({
  onSearch,
  onClear,
  isSearching = false,
  currentSearch,
}: NewsSearchProps) {
  const [query, setQuery] = useState(currentSearch?.query || '');
  const [scale, setScale] = useState<string>(currentSearch?.scale || 'all');

  const handleSearch = () => {
    if (!query.trim()) return;

    onSearch({
      query: query.trim(),
      scale: scale as any,
    });
  };

  const handleClear = () => {
    setQuery('');
    setScale('all');
    onClear();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestedSearch = (suggestion: string) => {
    setQuery(suggestion);
  };

  const isSearchActive = currentSearch && currentSearch.query;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-300 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-montserrat font-semibold text-slate-800 text-lg mb-1">
          Search News
        </h3>
        <p className="text-sm text-slate-600">
          Search for specific topics across different scales
        </p>
      </div>

      {/* Search Input */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search for topics... (e.g., climate change, elections, technology)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-10"
            disabled={isSearching}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>

        {isSearchActive && (
          <Button
            onClick={handleClear}
            variant="outline"
            className="hover:bg-slate-100"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Scale Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Filter by Scale
        </label>
        <div className="grid grid-cols-5 gap-2">
          {SCALES.map((scaleOption) => (
            <button
              key={scaleOption.id}
              onClick={() => setScale(scaleOption.id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                scale === scaleOption.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
              title={scaleOption.description}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{scaleOption.icon}</span>
                <span className="text-xs font-semibold text-slate-700">
                  {scaleOption.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {scaleOption.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Searches */}
      {!isSearchActive && (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Popular Searches
          </label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SEARCHES.map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                onClick={() => handleSuggestedSearch(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active Search Info */}
      {isSearchActive && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Active Search
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Query: <span className="font-semibold">"{currentSearch.query}"</span>
                {currentSearch.scale !== 'all' && (
                  <> • Scale: <span className="font-semibold capitalize">{currentSearch.scale}</span></>
                )}
              </p>
            </div>
            <Button
              onClick={handleClear}
              size="sm"
              variant="ghost"
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
