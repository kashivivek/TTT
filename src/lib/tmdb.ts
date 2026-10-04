const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function backdropUrl(path: string | null, size = "w1280"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function posterUrl(path: string | null, size = "w342"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export interface TMDbProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TMDbRegionWatchProviders {
  link: string;
  flatrate?: TMDbProviderItem[];
  rent?: TMDbProviderItem[];
  buy?: TMDbProviderItem[];
  ads?: TMDbProviderItem[];
  free?: TMDbProviderItem[];
}

export interface TMDbEpisodeRef {
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  still_path?: string | null;
}

export interface WatchProvidersResponse {
  id: number;
  results: Record<string, TMDbRegionWatchProviders>;
}

const PREFERRED_PROVIDER_COUNTRIES = [
  "US",
  "GB",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "SE",
  "NO",
  "DK"
];

export function logoUrl(path: string | null, size = "w92"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function sortWatchProviderRegions(results: Record<string, TMDbRegionWatchProviders>) {
  const available = Object.keys(results);
  const prioritized = PREFERRED_PROVIDER_COUNTRIES.filter((code) => available.includes(code));
  const remaining = available.filter((code) => !PREFERRED_PROVIDER_COUNTRIES.includes(code)).sort();
  return [...prioritized, ...remaining];
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
      air_date?: string | null;
    }>;
    next_episode_to_air?: TMDbEpisodeRef | null;
    last_episode_to_air?: TMDbEpisodeRef | null;
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

export async function getMovieWatchProviders(tmdbId: number) {
  return tmdbFetch<WatchProvidersResponse>(`/movie/${tmdbId}/watch/providers`);
}

export async function getTvWatchProviders(tmdbId: number) {
  return tmdbFetch<WatchProvidersResponse>(`/tv/${tmdbId}/watch/providers`);
}

export async function getSeasonEpisodes(tmdbId: number, season: number) {
  return tmdbFetch<{
    episodes: Array<{
      episode_number: number;
      name: string;
      overview: string;
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

export async function getTrendingAll() {
  return tmdbFetch<{
    results: Array<{
      id: number;
      name?: string;
      title?: string;
      media_type: "movie" | "tv" | string;
      backdrop_path: string | null;
      poster_path: string | null;
      overview: string;
      release_date?: string;
      first_air_date?: string;
    }>;
  }>("/trending/all/day");
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

