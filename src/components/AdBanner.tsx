"use client";

import { useEffect, useRef, useState } from "react";
import { isNativeApp } from "@/lib/native";

interface AdBannerProps {
  className?: string;
  adSlot?: string;
  format?: string;
  responsive?: boolean;
}

export default function AdBanner({ 
  className = "", 
  adSlot,
  format = "auto",
  responsive = true 
}: AdBannerProps) {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "ca-pub-9050370531125390";
  const isDev = process.env.NODE_ENV === "development";
  const adLoaded = useRef(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(isNativeApp());
  }, []);

  useEffect(() => {
    if (adSlot && !isDev && !inApp && !adLoaded.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adLoaded.current = true;
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [adSlot, isDev, inApp]);

  // Never show a fake "Your Ad Here" box to real users; AdSense isn't allowed in the app.
  if (inApp || (!isDev && !adSlot)) return null;

  if (!isDev) {
    return (
      <div className={`ad-container ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    );
  }

  // Placeholder when no ad account is configured or in development
  return (
    <div
      className={`bg-card-surface/30 border border-white/5 rounded-xl flex items-center justify-center flex-col text-text-muted transition-colors hover:bg-card-surface/50 w-full h-full ${className}`}
    >
      <span className="text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">Advertisement</span>
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <span className="text-xl opacity-50">🍿</span>
      </div>
      <span className="text-sm font-medium opacity-50 px-4 text-center">Your Ad Here</span>
    </div>
  );
}
