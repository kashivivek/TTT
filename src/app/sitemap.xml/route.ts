import { NextResponse } from "next/server";
import { tmdbServer } from "@/lib/tmdb-server";

export const revalidate = 86400;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://tvtime.online";

interface ListResponse {
  results: Array<{ id: number }>;
}

async function ids(endpoint: string): Promise<number[]> {
  try {
    const data = await tmdbServer<ListResponse>(endpoint, 86400);
    return (data.results || []).map((r) => r.id);
  } catch {
    return [];
  }
}

export async function GET() {
  const pages = [1, 2, 3, 4, 5];
  const [tvLists, movieLists] = await Promise.all([
    Promise.all([
      ids("/trending/tv/week"),
      ...pages.map((p) => ids(`/tv/popular?page=${p}`)),
      ...pages.map((p) => ids(`/tv/on_the_air?page=${p}`)),
    ]),
    Promise.all([ids("/trending/movie/week"), ...pages.map((p) => ids(`/movie/popular?page=${p}`))]),
  ]);
  const tvIds = Array.from(new Set(tvLists.flat()));
  const movieIds = Array.from(new Set(movieLists.flat()));

  const urls = [
    { loc: `${BASE}/`, changefreq: "weekly", priority: 1.0 },
    { loc: `${BASE}/signup`, changefreq: "monthly", priority: 0.5 },
    { loc: `${BASE}/login`, changefreq: "monthly", priority: 0.3 },
    { loc: `${BASE}/about`, changefreq: "monthly", priority: 0.5 },
    { loc: `${BASE}/contact`, changefreq: "yearly", priority: 0.3 },
    { loc: `${BASE}/privacy`, changefreq: "yearly", priority: 0.3 },
    { loc: `${BASE}/terms`, changefreq: "yearly", priority: 0.3 },
    ...tvIds.map((id) => ({ loc: `${BASE}/shows/${id}`, changefreq: "weekly", priority: 0.7 })),
    ...movieIds.map((id) => ({ loc: `${BASE}/movies/${id}`, changefreq: "weekly", priority: 0.6 })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority.toFixed(2)}</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
