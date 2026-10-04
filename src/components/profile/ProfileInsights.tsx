"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getTvDetails } from "@/lib/tmdb";
import { BADGES, computeStreaks } from "@/lib/badges";
import { track } from "@/lib/analytics";

interface Recap {
  year: number;
  episodes: number;
  movies: number;
  hours: number;
  topShows: string[];
}

const PAGE = 1000;
const MAX_PAGES = 20;

export default function ProfileInsights({ userId, displayName }: { userId: string; displayName: string }) {
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = getSupabase();
      const now = new Date();
      const year = now.getFullYear();
      const since = new Date(Math.min(new Date(year, 0, 1).getTime(), now.getTime() - 400 * 86400000));

      const rows: Array<{ tmdb_id: number; media_type: string; watched_at: string }> = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data } = await db
          .from("watch_history")
          .select("tmdb_id, media_type, watched_at")
          .eq("user_id", userId)
          .gte("watched_at", since.toISOString())
          .order("watched_at", { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
      }
      if (cancelled) return;

      const streaks = computeStreaks(rows.map((r) => r.watched_at));
      setStreak(streaks);

      const thisYear = rows.filter((r) => new Date(r.watched_at).getFullYear() === year);
      const episodes = thisYear.filter((r) => r.media_type === "tv").length;
      const movies = thisYear.filter((r) => r.media_type === "movie").length;
      const perShow = new Map<number, number>();
      thisYear.filter((r) => r.media_type === "tv").forEach((r) => perShow.set(r.tmdb_id, (perShow.get(r.tmdb_id) || 0) + 1));
      const topIds = Array.from(perShow.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
      const topShows = (await Promise.all(topIds.map((id) => getTvDetails(id).then((d) => d.name).catch(() => null)))).filter(
        (n): n is string => !!n
      );
      if (cancelled) return;
      setRecap({ year, episodes, movies, hours: Math.round((episodes * 45 + movies * 120) / 60), topShows });

      // Award any newly earned badges
      const [tvTotal, movieTotal, completed, reviews, comments, existing] = await Promise.all([
        db.from("watch_history").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("media_type", "tv"),
        db.from("watch_history").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("media_type", "movie"),
        db.from("tracked_shows").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("media_type", "completed"),
        db.from("user_ratings").select("*", { count: "exact", head: true }).eq("user_id", userId),
        db.from("user_comments").select("*", { count: "exact", head: true }).eq("user_id", userId),
        db.from("user_badges").select("badge_name").eq("user_id", userId),
      ]);
      const stats = {
        episodes: tvTotal.count || 0,
        movies: movieTotal.count || 0,
        completedShows: completed.count || 0,
        reviews: reviews.count || 0,
        comments: comments.count || 0,
        longestStreak: streaks.longest,
      };
      const have = new Set((existing.data || []).map((b: { badge_name: string }) => b.badge_name));
      const newBadges = BADGES.filter((b) => b.earned(stats) && !have.has(b.name));
      if (newBadges.length > 0) {
        await db
          .from("user_badges")
          .insert(newBadges.map((b) => ({ user_id: userId, badge_name: b.name, earned_at: new Date().toISOString() })));
        newBadges.forEach((b) => track("badge_earned", { badge: b.name }));
      }
    }

    load().catch((e) => console.error("Failed to load insights", e));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const shareRecap = async () => {
    if (!recap) return;
    const params = new URLSearchParams({
      name: displayName.slice(0, 30),
      year: String(recap.year),
      eps: String(recap.episodes),
      movies: String(recap.movies),
      hours: String(recap.hours),
      streak: String(streak?.longest || 0),
      top: recap.topShows.join("|").slice(0, 120),
    });
    const url = `${window.location.origin}/share/recap?${params.toString()}`;
    const text = `My ${recap.year} in TV: ${recap.episodes} episodes, ${recap.movies} movies, ${recap.hours} hours 📺`;
    track("share_recap");
    try {
      if (navigator.share) {
        await navigator.share({ title: "My year in TV", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch {
      // Share sheet dismissed
    }
  };

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="bg-card-surface rounded-xl p-5 flex items-center gap-4">
        <span className="text-4xl">{streak && streak.current > 0 ? "🔥" : "🕯️"}</span>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">Watch streak</p>
          <p className="text-2xl font-extrabold">
            {streak ? `${streak.current} day${streak.current === 1 ? "" : "s"}` : "…"}
          </p>
          <p className="text-xs text-text-muted">
            {streak ? `Best: ${streak.longest} day${streak.longest === 1 ? "" : "s"}` : ""}
            {streak && streak.current === 0 ? " · Watch an episode today to start one" : ""}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-accent-yellow/20 to-orange-500/10 border border-accent-yellow/20 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wide">Your {recap?.year ?? new Date().getFullYear()} so far</p>
            <p className="text-2xl font-extrabold">{recap ? `${recap.episodes} eps · ${recap.movies} movies` : "…"}</p>
            <p className="text-xs text-text-muted truncate">
              {recap ? `${recap.hours} hours${recap.topShows.length ? ` · Top: ${recap.topShows.join(", ")}` : ""}` : ""}
            </p>
          </div>
          <button
            onClick={shareRecap}
            disabled={!recap}
            className="rounded-full bg-accent-yellow px-4 py-2 text-sm font-bold text-bg-primary hover:brightness-110 disabled:opacity-50 shrink-0"
          >
            {shareMsg || "Share"}
          </button>
        </div>
      </div>
    </section>
  );
}
