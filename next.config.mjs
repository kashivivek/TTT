// `npm run build:app` sets NEXT_PUBLIC_APP_BUNDLE=1: a static export packaged inside the Android/iOS app.
// *.web.tsx pages (server-rendered for SEO) and all .ts routes/APIs exist only on the website;
// *.app.tsx pages exist only in the app.
const isAppBundle = process.env.NEXT_PUBLIC_APP_BUNDLE === "1";

/** @type {import('next').NextConfig} */
const webConfig = {
  pageExtensions: ["tsx", "ts", "web.tsx", "web.ts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/app-bundle/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

/** @type {import('next').NextConfig} */
const appConfig = {
  output: "export",
  distDir: "out",
  pageExtensions: ["app.tsx", "tsx"],
  images: { unoptimized: true },
};

export default function config(phase) {
  if (isAppBundle) return appConfig;
  // Separate folder so `next build` never clobbers a running `next dev`
  return phase === "phase-development-server" ? { ...webConfig, distDir: ".next-dev" } : webConfig;
}
