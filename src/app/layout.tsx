import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AdBanner from "@/components/AdBanner";

export const metadata: Metadata = {
  title: "TV Time Tracker",
  description:
    "Track your TV shows and movies. Migrate your watch history and never lose progress. A modern tracker for binge watchers and screen time enthusiasts.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFD200",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        {process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
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
      </body>
    </html>
  );
}
