export interface BadgeStats {
  episodes: number;
  movies: number;
  completedShows: number;
  longestStreak: number;
  reviews: number;
  comments: number;
}

export interface BadgeDef {
  name: string;
  emoji: string;
  description: string;
  earned: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { name: "First Episode", emoji: "🎬", description: "Watch your first episode", earned: (s) => s.episodes >= 1 },
  { name: "Binge Starter", emoji: "📺", description: "Watch 100 episodes", earned: (s) => s.episodes >= 100 },
  { name: "Couch Commander", emoji: "🛋️", description: "Watch 500 episodes", earned: (s) => s.episodes >= 500 },
  { name: "Screen Legend", emoji: "🏆", description: "Watch 1,000 episodes", earned: (s) => s.episodes >= 1000 },
  { name: "Movie Buff", emoji: "🍿", description: "Watch 10 movies", earned: (s) => s.movies >= 10 },
  { name: "Cinephile", emoji: "🎥", description: "Watch 50 movies", earned: (s) => s.movies >= 50 },
  { name: "Finisher", emoji: "✅", description: "Complete 5 shows", earned: (s) => s.completedShows >= 5 },
  { name: "On a Roll", emoji: "🔥", description: "Watch something 7 days in a row", earned: (s) => s.longestStreak >= 7 },
  { name: "Unstoppable", emoji: "⚡", description: "Watch something 30 days in a row", earned: (s) => s.longestStreak >= 30 },
  { name: "Critic", emoji: "✍️", description: "Rate or review 5 titles", earned: (s) => s.reviews >= 5 },
  { name: "Conversation Starter", emoji: "💬", description: "Post your first community comment", earned: (s) => s.comments >= 1 },
];

export function badgeMeta(name: string): Pick<BadgeDef, "emoji" | "description"> {
  const def = BADGES.find((b) => b.name === name);
  return def ? { emoji: def.emoji, description: def.description } : { emoji: "🏅", description: "Imported from TV Time" };
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Current and longest run of consecutive days with at least one watch. */
export function computeStreaks(timestamps: string[]): { current: number; longest: number } {
  const days = new Set(timestamps.filter(Boolean).map((t) => localDateKey(new Date(t))));
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(days).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    prev.setDate(prev.getDate() + 1);
    run = localDateKey(prev) === sorted[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (days.has(localDateKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}
