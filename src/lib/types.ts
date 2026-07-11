export interface WatchHistoryEntry {
  id?: number;
  user_id?: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  season_number: number | null;
  episode_number: number | null;
  watched_at: string;
  title?: string;
}

export interface TMDbSearchResult {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date?: string;
  release_date?: string;
  media_type?: string;
}

export interface TMDbSeason {
  season_number: number;
  episode_count: number;
  name: string;
  air_date: string | null;
}

export interface TMDbEpisode {
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  still_path: string | null;
}

export interface TrackedShow {
  tmdb_id: number;
  name: string;
  backdrop_path: string | null;
  current_season: number;
  current_episode: number;
  next_episode_name: string;
  total_seasons: number;
  watched_episodes: Set<string>; // "S01E01" format keys
}

export interface EmotionReaction {
  label: string;
  emoji: string;
}

export const EMOTIONS: EmotionReaction[] = [
  { label: "Happy", emoji: "😊" },
  { label: "Confusing", emoji: "😕" },
  { label: "Sad", emoji: "😢" },
  { label: "Scary", emoji: "😱" },
  { label: "Frustrated", emoji: "😤" },
  { label: "Shocking", emoji: "😲" },
  { label: "Exciting", emoji: "🤩" },
  { label: "Boring", emoji: "😴" },
];
