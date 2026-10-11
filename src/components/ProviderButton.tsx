"use client";

import { useState } from "react";
import { logoUrl } from "@/lib/tmdb";
import { openProvider, providerUrl, type ProviderLike } from "@/lib/streaming-links";
import { isNativeApp } from "@/lib/native";
import { track } from "@/lib/analytics";

interface ProviderButtonProps {
  provider: ProviderLike & { provider_id: number; logo_path: string | null };
  title: string;
  /** TMDB watch page, used when we don't know the service. */
  fallbackUrl?: string;
}

export default function ProviderButton({ provider, title, fallbackUrl }: ProviderButtonProps) {
  const [message, setMessage] = useState("");

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    track("open_provider", { provider: provider.provider_name });
    // Websites follow the link normally; the app decides between app launch and link.
    if (!isNativeApp()) return;
    e.preventDefault();
    const result = await openProvider(provider, title, fallbackUrl);
    setMessage(result.ok ? "" : result.message);
  };

  return (
    <div>
      <a
        href={providerUrl(provider, title, fallbackUrl)}
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
