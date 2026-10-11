"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { PLAY_STORE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

/** Official "Get it on Google Play" badge. Hidden inside the app itself. */
export default function PlayStoreBadge({ source, className = "h-14" }: { source: string; className?: string }) {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isNativeApp()), []);
  if (inApp) return null;

  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("play_store_click", { source })}
      className="inline-block shrink-0"
    >
      <img src="/badges/google-play-badge.png" alt="Get it on Google Play" width={646} height={250} className={`${className} w-auto`} />
    </a>
  );
}
