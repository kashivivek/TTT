import { NextResponse } from "next/server";

export async function GET() {
  const base = "https://tvtime.online";
  const urls = [
    { loc: `${base}/`, changefreq: "weekly", priority: 1.0 },
    { loc: `${base}/dashboard`, changefreq: "daily", priority: 0.8 },
    { loc: `${base}/shows`, changefreq: "weekly", priority: 0.64 },
    { loc: `${base}/movies`, changefreq: "weekly", priority: 0.64 },
    { loc: `${base}/login`, changefreq: "monthly", priority: 0.32 },
    { loc: `${base}/signup`, changefreq: "monthly", priority: 0.32 },
    { loc: `${base}/profile`, changefreq: "monthly", priority: 0.4 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority.toFixed(2)}</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
