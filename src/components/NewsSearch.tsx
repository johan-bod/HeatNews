import { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SearchParams {
  query: string;
}

interface NewsSearchProps {
  onSearch: (params: SearchParams) => void;
  onClear: () => void;
  isSearching?: boolean;
  currentSearch?: SearchParams;
}

const SCALES = [
  { id: 'all', name: 'All', description: 'All scales' },
  { id: 'local', name: 'Local', description: 'City news' },
  { id: 'regional', name: 'Regional', description: 'Regional news' },
  { id: 'national', name: 'National', description: 'Country news' },
  { id: 'international', name: 'Global', description: 'World news' },
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
  const [scale, setScale] = useState<string>('all');

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch({
      query: query.trim(),
    });
  };

  const handleClear = () => {
    setQuery('');
    setScale('all');
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSuggestedSearch = (suggestion: string) => {
    setQuery(suggestion);
  };

  const isSearchActive = currentSearch && currentSearch.query;

  return (
    <div className="bg-ivory-50/80 border border-amber-200/30 rounded-lg p-5">
      <h3 className="font-display text-lg font-bold text-navy-800 mb-1">
        Search News
      </h3>
      <p className="font-body text-xs text-navy-700/40 mb-4">
        Search topics across different geographic scales
      </p>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-700/30" />
          <Input
            type="text"
            placeholder="Search topics... (climate, elections, tech)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-9 bg-white border-amber-200/40 focus:border-amber-400 focus:ring-amber-400/20 font-body text-sm placeholder:text-navy-700/25"
            disabled={isSearching}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-700/30 hover:text-navy-700/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="bg-amber-600 hover:bg-amber-700 text-white font-body text-sm px-6"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Searching
            </>
          ) : (
            'Search'
          )}
        </Button>

        {isSearchActive && (
          <Button onClick={handleClear} variant="outline" className="border-amber-200/40 hover:bg-amber-50 font-body text-sm">
            Clear
          </Button>
        )}
      </div>

      {/* Scale Filter */}
      <div className="flex gap-1.5 mb-4">
        {SCALES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScale(s.id)}
            className={`px-3 py-1.5 rounded-md font-body text-xs transition-all ${
              scale === s.id
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-amber-200/40 text-navy-700/50 hover:border-amber-300 hover:text-navy-700/70'
            }`}
            title={s.description}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Suggested Searches */}
      {!isSearchActive && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_SEARCHES.map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer border-amber-200/30 text-navy-700/40 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors font-body text-[11px]"
              onClick={() => handleSuggestedSearch(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}

      {/* Active Search */}
      {isSearchActive && (
        <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-xs font-medium text-amber-800">Active Search</p>
              <p className="font-body text-[11px] text-amber-700/70 mt-0.5">
                "{currentSearch.query}"
              </p>
            </div>
            <Button onClick={handleClear} size="sm" variant="ghost" className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 w-7 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
