"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";
import NotificationPrompt from "@/components/NotificationPrompt";
import { getSupabase } from "@/lib/supabase";
import { getTvDetails, backdropUrl, type TMDbEpisodeRef } from "@/lib/tmdb";
import { todayISO } from "@/lib/progress";

interface CalendarEntry {
  tmdbId: number;
  showName: string;
  backdrop: string | null;
  episode: TMDbEpisodeRef;
}

const LOOKAHEAD_DAYS = 60;
const LOOKBACK_DAYS = 7;

function shiftDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

function formatDay(iso: string, today: string) {
  if (iso === today) return "Today";
  if (iso === shiftDays(1)) return "Tomorrow";
  if (iso === shiftDays(-1)) return "Yesterday";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [recent, setRecent] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?next=/calendar");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await getSupabase()
        .from("tracked_shows")
        .select("tmdb_id, name, backdrop_path, media_type")
        .eq("user_id", user!.id)
        .in("media_type", ["tv", "awaiting", "completed"]);

      const rows = data || [];
      setTrackedCount(rows.length);
      const today = todayISO();
      const until = shiftDays(LOOKAHEAD_DAYS);
      const since = shiftDays(-LOOKBACK_DAYS);
      const up: CalendarEntry[] = [];
      const past: CalendarEntry[] = [];

      const queue = [...rows];
      const worker = async () => {
        while (queue.length > 0) {
          const row = queue.shift()!;
          try {
            const d = await getTvDetails(row.tmdb_id);
            const base = { tmdbId: row.tmdb_id, showName: d.name || row.name, backdrop: d.backdrop_path || row.backdrop_path };
            const next = d.next_episode_to_air;
            if (next?.air_date && next.air_date >= today && next.air_date <= until) up.push({ ...base, episode: next });
            const last = d.last_episode_to_air;
            if (last?.air_date && last.air_date >= since && last.air_date < today) past.push({ ...base, episode: last });
          } catch {
            // Skip shows TMDB can't return right now
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (cancelled) return;

      up.sort((a, b) => (a.episode.air_date || "").localeCompare(b.episode.air_date || ""));
      past.sort((a, b) => (b.episode.air_date || "").localeCompare(a.episode.air_date || ""));
      setUpcoming(up);
      setRecent(past);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const today = todayISO();
  const grouped = upcoming.reduce<Record<string, CalendarEntry[]>>((acc, e) => {
    const key = e.episode.air_date as string;
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-sm border-b border-card-surface px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold">Upcoming</h1>
          <p className="text-sm text-text-muted">New episodes from shows you track</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        <NotificationPrompt />

        {loading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : trackedCount === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗓️</div>
            <p className="text-text-muted mb-6">Track some shows to see their upcoming episodes here.</p>
            <Link href="/dashboard?tab=explore" className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary">
              Find shows
            </Link>
          </div>
        ) : (
          <>
            {Object.keys(grouped).length === 0 ? (
              <div className="bg-card-surface rounded-xl p-6 text-center text-text-muted">
                Nothing scheduled in the next {LOOKAHEAD_DAYS} days.
              </div>
            ) : (
              Object.entries(grouped).map(([date, entries]) => (
                <section key={date}>
                  <h2 className={`text-lg font-bold mb-3 ${date === today ? "text-accent-yellow" : ""}`}>
                    {formatDay(date, today)}
                  </h2>
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <EpisodeRow key={`${e.tmdbId}-${e.episode.season_number}-${e.episode.episode_number}`} entry={e} />
                    ))}
                  </div>
                </section>
              ))
            )}

            {recent.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-1">Recently aired</h2>
                <p className="text-sm text-text-muted mb-3">Catch up on what came out this week</p>
                <div className="space-y-2">
                  {recent.map((e) => (
                    <EpisodeRow key={`r-${e.tmdbId}`} entry={e} subtitle={formatDay(e.episode.air_date as string, today)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function EpisodeRow({ entry, subtitle }: { entry: CalendarEntry; subtitle?: string }) {
  const { episode } = entry;
  return (
    <Link
      href={`/shows/${entry.tmdbId}`}
      className="flex items-center gap-4 bg-card-surface rounded-xl overflow-hidden hover:ring-2 hover:ring-accent-yellow/50 transition-all"
    >
      <div className="w-28 h-16 flex-shrink-0 bg-black/30">
        {entry.backdrop && (
          <img src={backdropUrl(entry.backdrop, "w300")} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="min-w-0 py-2 pr-4">
        <p className="font-bold truncate">{entry.showName}</p>
        <p className="text-sm text-text-muted truncate">
          S{String(episode.season_number).padStart(2, "0")}E{String(episode.episode_number).padStart(2, "0")}
          {episode.name ? ` · ${episode.name}` : ""}
          {subtitle ? ` · ${subtitle}` : ""}
        </p>
      </div>
    </Link>
  );
}
