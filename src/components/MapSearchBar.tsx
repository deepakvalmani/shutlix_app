import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation } from 'lucide-react';
import { searchPlaces } from '../services/nominatim';

interface MapSearchBarProps {
  onSearch: (query: string) => Promise<any>;
  className?: string;
  onSelectResult?: (result: any) => void;
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSearch, className = '', onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
        setSuggestions([]);
        return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        try {
            const results = await searchPlaces(query);
            setSuggestions(results);
            setShowSuggestions(true);
        } catch (err) {
            // Only log as error if it's not a common networking/abort issue
            if ((err as Error).name !== 'AbortError') {
                console.warn("Autocomplete search non-critical failure:", err);
            }
        } finally {
            setIsSearching(false);
        }
    }, 500);

    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  const handleSelect = (item: any) => {
      setQuery(item.label);
      setSuggestions([]);
      setShowSuggestions(false);
      if (onSelectResult) {
          onSelectResult(item);
      } else {
          onSearch(item.label);
      }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      await onSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative group ${className}`}>
      <form onSubmit={handleSubmit} className="relative z-50">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-4 group-focus-within:text-brand transition-colors">
          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setSuggestions(prev => prev.length > 0 ? prev : []) && setShowSuggestions(true)}
          placeholder="Search places or stops..."
          className="w-full bg-glass-3 border border-border-1 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all backdrop-blur-xl shadow-xl"
        />

        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-glass-2 rounded-full text-text-4 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-glass-3 border border-border-1 rounded-2xl overflow-hidden shadow-2xl z-[100] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-64 overflow-y-auto">
                  {suggestions.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(item)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-brand/5 transition-colors border-b border-border-2 last:border-0 text-left"
                      >
                          <div className="mt-0.5 p-1.5 rounded-lg bg-brand/10 text-brand">
                              <MapPin size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-text-1 truncate">{JSON.stringify(item.label).replace(/^"|"$/g, '').split(',')[0]}</p>
                              <p className="text-[10px] text-text-3 truncate mt-0.5 leading-tight">{item.label}</p>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default MapSearchBar;
