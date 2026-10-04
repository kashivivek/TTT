import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/server-auth";

const TMDB_BASE = "https://api.themoviedb.org/3";
const ALLOWED_PATH = /^\/(search\/(multi|tv|movie)|tv\/\d+(\/(season\/\d+|watch\/providers|recommendations|similar|credits))?|movie\/\d+(\/(watch\/providers|recommendations|similar|credits))?|trending\/(all|tv|movie)\/(day|week)|movie\/(upcoming|popular|now_playing)|tv\/(popular|on_the_air|airing_today)|discover\/(tv|movie)|genre\/(tv|movie)\/list)$/;

/** Server-side proxy for TMDb so the API key never reaches the browser. */
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDb API key not configured" }, { status: 500 });
  }

  if (!rateLimit(`tmdb:${clientIp(request)}`, 300, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const endpoint = request.nextUrl.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint, "https://tmdb.invalid");
  } catch {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  if (parsed.origin !== "https://tmdb.invalid" || !ALLOWED_PATH.test(parsed.pathname)) {
    return NextResponse.json({ error: "Endpoint not allowed" }, { status: 400 });
  }

  parsed.searchParams.delete("api_key");
  parsed.searchParams.set("api_key", apiKey);
  const isSearch = parsed.pathname.startsWith("/search/");
  const ttl = isSearch ? 600 : 3600;

  try {
    const res = await fetch(`${TMDB_BASE}${parsed.pathname}${parsed.search}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: ttl },
    });

    if (!res.ok) {
      console.error(`TMDb ${res.status} for ${parsed.pathname}`);
      return NextResponse.json({ error: `TMDb returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=86400` },
    });
  } catch (err) {
    console.error("TMDb fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch from TMDb" }, { status: 502 });
  }
}
