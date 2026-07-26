"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WatchProvidersResponse } from "@/lib/tmdb";
import { countryCodeToFlag, getCountryName, groupRegionsByContinent } from "@/lib/countries";

interface WatchCountrySelectorProps {
  providers: WatchProvidersResponse | null;
  value: string | null;
  onChange: (countryCode: string) => void;
}

export default function WatchCountrySelector({ providers, value, onChange }: WatchCountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => {
    if (!providers) return [];
    return groupRegionsByContinent(Object.keys(providers.results || {}));
  }, [providers]);

  const availableCodes = useMemo(
    () => groups.flatMap((group) => group.codes),
    [groups]
  );

  const selected = value && availableCodes.includes(value) ? value : availableCodes[0] ?? "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  if (!providers || availableCodes.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-card-surface px-4 py-2 text-sm text-text-primary shadow-sm hover:bg-white/5 transition"
      >
        <span>{countryCodeToFlag(selected)}</span>
        <span>{getCountryName(selected)}</span>
        <span className="text-text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-3 w-72 max-h-72 overflow-hidden rounded-3xl border border-white/10 bg-bg-primary shadow-2xl">
          <div className="max-h-72 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.continent} className="border-b border-white/10 last:border-b-0">
                <div className="px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-text-muted bg-card-surface">
                  {group.continent}
                </div>
                {group.codes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      onChange(code);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-3 text-left text-text-primary hover:bg-white/5 transition"
                  >
                    <span>{countryCodeToFlag(code)}</span>
                    <span>{getCountryName(code)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
