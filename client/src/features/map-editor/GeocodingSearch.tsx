import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

interface GeocodingResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface GeocodingSearchProps {
  onSelectLocation: (lat: number, lng: number) => void;
}

export const GeocodingSearch: React.FC<GeocodingSearchProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/geocoding/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.warn("Geocoding search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: GeocodingResult) => {
    onSelectLocation(item.lat, item.lng);
    setQuery(item.displayName.split(",")[0]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-64 md:w-80">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search location or address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-400 absolute right-3 animate-spin" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 absolute right-2.5 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.placeId}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-start space-x-2 border-b border-slate-50 last:border-b-0 transition"
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 leading-snug line-clamp-2">{item.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
