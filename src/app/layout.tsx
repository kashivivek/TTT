import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

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
              <div className="w-full h-[600px] bg-card-surface/30 border border-white/5 rounded-xl flex items-center justify-center flex-col text-text-muted transition-colors hover:bg-card-surface/50">
                <span className="text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">Advertisement</span>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <span className="text-xl opacity-50">📺</span>
                </div>
                <span className="text-sm font-medium opacity-50 px-4 text-center">Support TV Time Tracker</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 max-w-5xl">
              {children}
            </div>

            {/* Right Ad Banner */}
            <div className="hidden xl:block w-[160px] 2xl:w-[200px] flex-shrink-0 pt-24 sticky top-0 h-screen mx-4">
              <div className="w-full h-[600px] bg-card-surface/30 border border-white/5 rounded-xl flex items-center justify-center flex-col text-text-muted transition-colors hover:bg-card-surface/50">
                <span className="text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">Advertisement</span>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <span className="text-xl opacity-50">🍿</span>
                </div>
                <span className="text-sm font-medium opacity-50 px-4 text-center">Your Ad Here</span>
              </div>
            </div>
          </div>
        </AuthProvider>
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
