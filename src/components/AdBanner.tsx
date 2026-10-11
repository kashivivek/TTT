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

  // No slot configured (or in the app, where AdSense isn't allowed): render nothing.
  if (inApp || !adSlot) return null;

  if (isDev) return null;

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
