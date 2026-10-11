"use client";

import { useEffect, useState } from "react";
import { logoUrl } from "@/lib/tmdb";
import { directLink, openProvider, providerUrl, type ProviderLike } from "@/lib/streaming-links";
import { isNativeApp } from "@/lib/native";
import { track } from "@/lib/analytics";
import { apiUrl } from "@/lib/app-routes";

const linkCache = new Map<string, Promise<Record<string, string>>>();

/** Exact title pages on streaming services (from /api/watch-links), shared by all buttons on a page. */
export function useWatchLinks(type: "movie" | "tv", id: number): Record<string, string> {
  const [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    const key = `${type}:${id}`;
    if (!linkCache.has(key)) {
      linkCache.set(
        key,
        fetch(apiUrl(`/api/watch-links?type=${type}&id=${id}`))
          .then((r) => (r.ok ? r.json() : { links: {} }))
          .then((d) => d.links || {})
          .catch(() => ({}))
      );
    }
    let active = true;
    linkCache.get(key)!.then((l) => active && setLinks(l));
    return () => {
      active = false;
    };
  }, [type, id]);
  return links;
}

interface ProviderButtonProps {
  provider: ProviderLike & { provider_id: number; logo_path: string | null };
  title: string;
  /** TMDB watch page, used when we don't know the service. */
  fallbackUrl?: string;
  /** Exact title pages by service key, from useWatchLinks. */
  links?: Record<string, string>;
  /** Called after the service was opened (schedules the "Finished it?" reminder). */
  onOpened?: () => void;
}

export default function ProviderButton({ provider, title, fallbackUrl, links, onOpened }: ProviderButtonProps) {
  const [message, setMessage] = useState("");
  const direct = directLink(provider, links);

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    track("open_provider", { provider: provider.provider_name, exact: Boolean(direct) });
    // Websites follow the link normally; the app decides between app launch and link.
    if (!isNativeApp()) return;
    e.preventDefault();
    const result = await openProvider(provider, title, fallbackUrl, direct);
    setMessage(result.ok ? "" : result.message);
    if (result.ok) onOpened?.();
  };

  return (
    <div>
      <a
        href={providerUrl(provider, title, fallbackUrl, direct)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        title={`Watch ${title} on ${provider.provider_name}`}
        className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl transition hover:bg-white/10"
      >
        {provider.logo_path ? (
          <img src={logoUrl(provider.logo_path)} alt="" className="w-6 h-6 rounded object-contain" />
        ) : null}
        <span className="text-xs flex-1">{provider.provider_name}</span>
        <span className="text-xs text-text-muted" aria-hidden="true">↗</span>
      </a>
      {message && <p className="mt-1 text-[11px] text-accent-yellow">{message}</p>}
    </div>
  );
}
