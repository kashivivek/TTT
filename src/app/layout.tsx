import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AdBanner from "@/components/AdBanner";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tvtime.online";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "ca-pub-9050370531125390";
const DESCRIPTION =
  "Track your TV shows and movies, get notified when new episodes air, and import your TV Time history. A modern, free TV Time alternative.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TV Time Tracker – Track TV Shows & Movies",
    template: "%s | TV Time Tracker",
  },
  description: DESCRIPTION,
  manifest: "/manifest.json",
  applicationName: "TV Time Tracker",
  appleWebApp: { capable: true, title: "TTT", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "TV Time Tracker",
    title: "TV Time Tracker – Track TV Shows & Movies",
    description: DESCRIPTION,
    url: SITE_URL,
    images: ["/icons/icon-512.png"],
  },
  twitter: { card: "summary", title: "TV Time Tracker", description: DESCRIPTION },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <AuthProvider>
          <AnalyticsTracker />
          <div className="flex justify-center w-full min-h-screen">
            {/* Left Ad Banner */}
            <div className="hidden xl:block w-[160px] 2xl:w-[200px] flex-shrink-0 pt-24 sticky top-0 h-screen mx-4">
              <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_LEFT_SLOT} className="h-[600px]" format="vertical" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 max-w-5xl">
              {children}
            </div>

            {/* Right Ad Banner */}
            <div className="hidden xl:block w-[160px] 2xl:w-[200px] flex-shrink-0 pt-24 sticky top-0 h-screen mx-4">
              <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_RIGHT_SLOT} className="h-[600px]" format="vertical" />
            </div>
          </div>
        </AuthProvider>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
