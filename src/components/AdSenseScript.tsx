"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { isNativeApp } from "@/lib/native";

/** AdSense isn't allowed inside app WebViews, so it only loads on the website. */
export default function AdSenseScript({ client }: { client: string }) {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    setLoad(!isNativeApp());
  }, []);

  if (!load) return null;
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
