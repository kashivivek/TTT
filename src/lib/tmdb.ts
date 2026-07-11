const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function backdropUrl(path: string | null, size = "w1280"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function posterUrl(path: string | null, size = "w342"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** All TMDb calls go through our API proxy to keep the key server-side */
export async function tmdbFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/tmdb?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) {
    throw new Error(`TMDb API error: ${res.status}`);
  }
  return res.json();
}

export async function searchTv(query: string) {
  return tmdbFetch<{ results: Array<{ id: number; name: string }> }>(
    `/search/tv?query=${encodeURIComponent(query)}`
  );
}

export async function searchMulti(query: string) {
  return tmdbFetch<{
    results: Array<{
      id: number;
      name?: string;
      title?: string;
      media_type: "movie" | "tv" | "person";
      backdrop_path: string | null;
      poster_path: string | null;
      first_air_date?: string;
      release_date?: string;
    }>;
  }>(`/search/multi?query=${encodeURIComponent(query)}`);
}

export async function getTvDetails(tmdbId: number) {
  return tmdbFetch<{
    id: number;
    name: string;
    backdrop_path: string | null;
    poster_path: string | null;
    overview: string;
    first_air_date: string;
    status: string;
    genres: Array<{ id: number; name: string }>;
    seasons: Array<{
      season_number: number;
      episode_count: number;
      name: string;
    }>;
    credits?: {
      cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    };
  }>(`/tv/${tmdbId}?append_to_response=credits`);
}

export async function getMovieDetails(tmdbId: number) {
  return tmdbFetch<{
    id: number;
    title: string;
    overview: string;
    release_date: string;
    poster_path: string | null;
    backdrop_path: string | null;
    status: string;
    genres: { id: number; name: string }[];
    credits?: {
      cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    };
  }>(`/movie/${tmdbId}?append_to_response=credits`);
}

export async function getSeasonEpisodes(tmdbId: number, season: number) {
  return tmdbFetch<{
    episodes: Array<{
      episode_number: number;
      name: string;
      still_path: string | null;
      air_date: string | null;
    }>;
  }>(`/tv/${tmdbId}/season/${season}`);
}

export async function getTrendingTv() {
  return tmdbFetch<{
    results: Array<{
      id: number;
      name: string;
      backdrop_path: string | null;
      poster_path: string | null;
      overview: string;
    }>;
  }>("/trending/tv/day");
}

export async function getTvRecommendations(tmdbId: number) {
  return tmdbFetch<{
    results: Array<{
      id: number;
      name: string;
      backdrop_path: string | null;
      poster_path: string | null;
      overview: string;
    }>;
  }>(`/tv/${tmdbId}/recommendations`);
}

export async function getUpcomingMovies() {
  return tmdbFetch<{
    results: Array<{
      id: number;
      title: string;
      backdrop_path: string | null;
      poster_path: string | null;
      overview: string;
      release_date: string;
    }>;
  }>("/movie/upcoming");
}

