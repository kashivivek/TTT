import { registerPlugin } from "@capacitor/core";
import { getSupabase } from "./supabase";
import { appPlatform, isNativeApp } from "./native";
import { detectTvMode } from "./tv";

/**
 * Android TV / Google TV home screen "Continue watching" (Watch Next) row.
 * Native side: android/app/src/main/java/online/tvtime/app/WatchNextPlugin.java
 */
interface WatchNextItem {
  /** Stable key, e.g. "tv:1399". */
  id: string;
  title: string;
  /** Website path the card opens, e.g. /shows/1399 (mapped to the in-app route on open). */
  path: string;
  image?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  lastEngagement: number;
}

const WatchNext = registerPlugin<{ sync(options: { items: WatchNextItem[] }): Promise<void> }>("WatchNext");

const MAX_SHOWS = 10;
const MAX_MOVIES = 5;

/** Next episodes of the user's shows (and unwatched watchlist movies) as cards on the TV home screen. */
export async function syncWatchNext(userId: string): Promise<void> {
  if (!isNativeApp() || appPlatform() !== "android" || !detectTvMode()) return;
  try {
    const { data } = await getSupabase()
      .from("tracked_shows")
      .select("tmdb_id, name, media_type, current_season, current_episode, episode_title, backdrop_path, updated_at")
      .eq("user_id", userId)
      .in("media_type", ["tv", "movie"])
      .order("updated_at", { ascending: false })
      .limit(50);

    const rows = data || [];
    const image = (path: string | null) => (path ? `https://image.tmdb.org/t/p/w780${path}` : undefined);
    const engagement = (iso: string | null) => (iso ? new Date(iso).getTime() : Date.now());

    const shows: WatchNextItem[] = rows
      .filter((r) => r.media_type === "tv" && r.current_season && r.current_episode)
      .slice(0, MAX_SHOWS)
      .map((r) => ({
        id: `tv:${r.tmdb_id}`,
        title: r.name,
        path: `/shows/${r.tmdb_id}`,
        image: image(r.backdrop_path),
        season: r.current_season,
        episode: r.current_episode,
        episodeTitle: r.episode_title || undefined,
        lastEngagement: engagement(r.updated_at),
      }));
    const movies: WatchNextItem[] = rows
      .filter((r) => r.media_type === "movie")
      .slice(0, MAX_MOVIES)
      .map((r) => ({
        id: `movie:${r.tmdb_id}`,
        title: r.name,
        path: `/movies/${r.tmdb_id}`,
        image: image(r.backdrop_path),
        lastEngagement: engagement(r.updated_at),
      }));

    await WatchNext.sync({ items: [...shows, ...movies] });
  } catch {
    // Plugin missing in older app builds, or not a TV
  }
}
