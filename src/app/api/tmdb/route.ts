import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Server-side proxy for TMDb API calls.
 * Keeps the TMDB_API_KEY secret on the server, never exposed to the client.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDb API key not configured" },
      { status: 500 }
    );
  }

  const endpoint = request.nextUrl.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint parameter" },
      { status: 400 }
    );
  }

  // Only allow TMDb API paths — prevent SSRF
  if (!endpoint.startsWith("/")) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE}${endpoint}${separator}api_key=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`TMDb ${res.status}: ${body}`);
      return NextResponse.json(
        { error: `TMDb returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("TMDb fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch from TMDb" },
      { status: 502 }
    );
  }
}
