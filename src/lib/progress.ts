/**
 * Shared "what's next" logic for a tracked show. Works in the browser (via the
 * /api/tmdb proxy) and on the server (direct TMDB) by taking a fetcher.
 *
 * tracked_shows.current_* semantics by media_type:
 *  - "tv": the next episode to watch (already aired)
 *  - "awaiting" + title "Airs: YYYY-MM-DD - name": the next episode (not aired yet)
 *  - "awaiting" (other titles) / "completed": the last episode the user watched
 */

export type Fetcher = <T>(endpoint: string) => Promise<T>;

export interface TrackState {
  media_type: "tv" | "awaiting" | "completed";
  current_season: number;
  current_episode: number;
  episode_title: string;
}

export interface EpisodeRef {
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
}

interface SeasonResponse {
  episodes?: Array<{ episode_number: number; name: string; air_date: string | null }>;
}

interface DetailsResponse {
  status?: string;
  seasons?: Array<{ season_number: number; episode_count: number }>;
}

export const WAITING_TITLE = "Waiting for new episodes";
// Written by older versions where current_* pointed at the next season's first episode.
const LEGACY_UNKNOWN_TITLE = "Release date not yet confirmed";

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseAirsTitle(title: string | null | undefined): { date: string; name: string } | null {
  if (!title) return null;
  const match = title.match(/Airs:\s*(\d{4}-\d{2}-\d{2})(?:\s*-\s*(.*))?/);
  if (!match) return null;
  return { date: match[1], name: (match[2] || "").trim() };
}

export function isEndedStatus(status: string | undefined): boolean {
  return status === "Ended" || status === "Canceled";
}

/** True when an awaiting row is still in the future (or has no date at all). */
export function isStillAwaiting(mediaType: string | undefined, title: string, today = todayISO()): boolean {
  if (mediaType !== "awaiting") return false;
  const airs = parseAirsTitle(title);
  return !airs || airs.date > today;
}

export async function resolveNextAfter(
  fetcher: Fetcher,
  tmdbId: number,
  season: number,
  episode: number
): Promise<TrackState> {
  const today = todayISO();

  let seasonEps: SeasonResponse | null = null;
  try {
    seasonEps = await fetcher<SeasonResponse>(`/tv/${tmdbId}/season/${season}`);
  } catch {
    seasonEps = null;
  }

  let next: EpisodeRef | null = null;
  const sameSeason = seasonEps?.episodes?.find((e) => e.episode_number === episode + 1);
  if (sameSeason) next = { ...sameSeason, season_number: season };

  let details: DetailsResponse | null = null;
  if (!next) {
    details = await fetcher<DetailsResponse>(`/tv/${tmdbId}`);
    const nextSeason = (details.seasons || [])
      .filter((s) => s.season_number > season)
      .sort((a, b) => a.season_number - b.season_number)[0];
    if (nextSeason) {
      try {
        const eps = await fetcher<SeasonResponse>(`/tv/${tmdbId}/season/${nextSeason.season_number}`);
        const first = eps.episodes?.[0];
        if (first) next = { ...first, season_number: nextSeason.season_number };
      } catch {
        // Season announced but not published yet
      }
    }
  }

  if (next) {
    if (next.air_date && next.air_date <= today) {
      return {
        media_type: "tv",
        current_season: next.season_number,
        current_episode: next.episode_number,
        episode_title: next.name || `Episode ${next.episode_number}`,
      };
    }
    if (next.air_date) {
      return {
        media_type: "awaiting",
        current_season: next.season_number,
        current_episode: next.episode_number,
        episode_title: `Airs: ${next.air_date} - ${next.name || `Episode ${next.episode_number}`}`,
      };
    }
    return { media_type: "awaiting", current_season: season, current_episode: episode, episode_title: WAITING_TITLE };
  }

  if (!details) details = await fetcher<DetailsResponse>(`/tv/${tmdbId}`);
  if (isEndedStatus(details.status)) {
    return { media_type: "completed", current_season: season, current_episode: episode, episode_title: "Completed" };
  }
  return { media_type: "awaiting", current_season: season, current_episode: episode, episode_title: WAITING_TITLE };
}

/**
 * Re-checks an awaiting/completed row against TMDB so new episodes resurface.
 * Returns the new state, or null when nothing changed.
 */
export async function refreshTrackState(
  fetcher: Fetcher,
  row: { tmdb_id: number; media_type?: string; current_season: number; current_episode: number; episode_title: string }
): Promise<TrackState | null> {
  if (row.media_type !== "awaiting" && row.media_type !== "completed") return null;

  const airs = parseAirsTitle(row.episode_title);
  if (row.media_type === "awaiting" && airs) {
    if (airs.date > todayISO()) return null;
    return {
      media_type: "tv",
      current_season: row.current_season,
      current_episode: row.current_episode,
      episode_title: airs.name || `Episode ${row.current_episode}`,
    };
  }

  const legacyNextPointer = row.episode_title === LEGACY_UNKNOWN_TITLE && row.current_episode === 1;
  const fromEpisode = legacyNextPointer ? 0 : row.current_episode;
  const next = await resolveNextAfter(fetcher, row.tmdb_id, row.current_season, fromEpisode);

  const unchanged =
    next.media_type === row.media_type &&
    next.current_season === row.current_season &&
    next.current_episode === row.current_episode;
  return unchanged ? null : next;
}

/** Highest (season, episode) in a set of "season-episode" keys, ignoring specials. */
export function latestWatched(keys: Iterable<string>): { season: number; episode: number } | null {
  let best: { season: number; episode: number } | null = null;
  for (const key of keys) {
    const [s, e] = key.split("-").map(Number);
    if (!s || !e) continue;
    if (!best || s > best.season || (s === best.season && e > best.episode)) best = { season: s, episode: e };
  }
  return best;
}
