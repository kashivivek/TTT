"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchMulti } from "@/lib/tmdb";

interface SearchResult {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
  media_type: "movie" | "tv" | "person";
}

interface SearchAutocompleteProps {
  onSelect: (id: number, type: "movie" | "tv" | "person") => void;
}

export default function SearchAutocomplete({
  onSelect,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchMulti(debouncedQuery)
      .then((data) => {
        if (!cancelled) {
          const filtered = (data.results as SearchResult[])
            .filter((r) => r.media_type === "tv" || r.media_type === "movie")
            .slice(0, 8);
          setResults(filtered);
          setOpen(filtered.length > 0);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelect(result.id, result.media_type);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TV shows and movies..."
          className="w-full bg-card-surface text-text-primary rounded-xl px-4 py-2.5
                     border border-transparent focus:border-accent-yellow outline-none
                     placeholder:text-text-muted text-sm pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-card-surface rounded-xl overflow-hidden shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-bg-primary
                         transition-colors border-b border-bg-primary last:border-0 flex items-center gap-3"
            >
              {r.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                  alt=""
                  className="w-8 h-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-12 rounded bg-bg-primary flex-shrink-0 flex items-center justify-center text-text-muted text-xs">
                  {r.media_type === "tv" ? "📺" : "🍿"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-text-primary text-sm">{r.name || r.title}</span>
                <span className="text-text-muted text-[10px] uppercase font-semibold">
                  {r.media_type === "movie" ? "Movie" : "TV Show"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
