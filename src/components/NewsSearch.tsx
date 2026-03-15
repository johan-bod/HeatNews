import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SearchParams {
  query: string;
}

interface NewsSearchProps {
  onSearch: (params: SearchParams) => void;
  onClear: () => void;
  isSearching?: boolean;
  currentSearch?: SearchParams;
  variant?: 'overlay' | 'inline';
}

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
  variant = 'overlay',
}: NewsSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState(currentSearch?.query || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearchActive = !!currentSearch?.query;

  // Close on outside click or Escape
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // Focus input on expand
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch({ query: query.trim() });
    setIsExpanded(false);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSuggestedSearch = (suggestion: string) => {
    setQuery(suggestion);
    onSearch({ query: suggestion });
    setIsExpanded(false);
  };

  // Inline variant (mobile: full-width bar below globe)
  if (variant === 'inline') {
    return (
      <div className="w-full bg-navy-900 border-b border-ivory-200/5">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ivory-200/30" />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-8 py-2 bg-navy-900/80 border border-amber-500/20 rounded-lg font-body text-xs text-ivory-50 placeholder:text-ivory-200/30 focus:outline-none focus:border-amber-500/40"
                disabled={isSearching}
              />
              {(query || isSearchActive) && (
                <button
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ivory-200/30 hover:text-ivory-200/60"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {isSearching && <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />}
          </div>
        </div>
      </div>
    );
  }

  // Overlay variant (desktop: upper-right pill on globe)
  return (
    <div ref={containerRef} className="relative">
      {!isExpanded ? (
        // Collapsed pill
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 bg-navy-900/80 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-2 font-body text-xs text-ivory-200/50 hover:text-ivory-200/80 hover:border-amber-500/30 transition-colors"
          style={{ width: isSearchActive ? 'auto' : '160px' }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          {isSearchActive ? (
            <span className="text-amber-400 truncate max-w-[120px]">"{currentSearch.query}"</span>
          ) : (
            <span>Search...</span>
          )}
          {isSearching && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
        </button>
      ) : (
        // Expanded state
        <div className="bg-navy-900/95 backdrop-blur-md border border-amber-500/20 rounded-lg shadow-2xl shadow-black/50" style={{ width: '300px' }}>
          {/* Input */}
          <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ivory-200/30" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-8 pr-16 py-2 bg-transparent border-none font-body text-xs text-ivory-50 placeholder:text-ivory-200/30 focus:outline-none"
              disabled={isSearching}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {(query || isSearchActive) && (
                <button
                  onClick={handleClear}
                  className="text-ivory-200/30 hover:text-ivory-200/60 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {isSearching && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
            </div>
          </div>

          {/* Suggestions */}
          {!isSearchActive && (
            <div className="px-2 pb-2 border-t border-ivory-200/5">
              <div className="flex flex-wrap gap-1 pt-2">
                {SUGGESTED_SEARCHES.map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer border-amber-500/15 text-ivory-200/40 hover:bg-amber-500/10 hover:text-ivory-200/70 hover:border-amber-500/30 transition-colors font-body text-[10px]"
                    onClick={() => handleSuggestedSearch(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
