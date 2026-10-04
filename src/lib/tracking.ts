import { getSupabase } from "./supabase";
import { tmdbFetch } from "./tmdb";
import { latestWatched, resolveNextAfter, type TrackState } from "./progress";

/**
 * Recomputes a show's "next episode" from the user's watched set and saves it,
 * creating the tracked_shows row if needed.
 */
export async function syncShowPointer(
  userId: string,
  tmdbId: number,
  meta: { name: string; backdrop_path: string | null; firstSeason: number },
  watchedKeys: Iterable<string>
): Promise<TrackState> {
  const latest = latestWatched(watchedKeys);
  const state = latest
    ? await resolveNextAfter(tmdbFetch, tmdbId, latest.season, latest.episode)
    : await resolveNextAfter(tmdbFetch, tmdbId, meta.firstSeason, 0);

  await getSupabase()
    .from("tracked_shows")
    .upsert(
      {
        user_id: userId,
        tmdb_id: tmdbId,
        name: meta.name,
        backdrop_path: meta.backdrop_path,
        ...state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tmdb_id" }
    );

  return state;
}
