const TMDB_BASE = "https://api.themoviedb.org/3";

/** Server-only TMDB fetch with Next.js data caching. */
export async function tmdbServer<T>(endpoint: string, revalidate = 3600): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");
  const separator = endpoint.includes("?") ? "&" : "?";
  const res = await fetch(`${TMDB_BASE}${endpoint}${separator}api_key=${apiKey}`, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json() as Promise<T>;
}
