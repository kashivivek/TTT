"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { tmdbFetch } from "@/lib/tmdb";
import { syncShowPointer } from "@/lib/tracking";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

interface ShowOption {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

const MIN_PICKS = 3;
const POSTER = "https://image.tmdb.org/t/p/w342";

/** First-run onboarding: pick a few shows so the dashboard is useful right away. */
export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [options, setOptions] = useState<ShowOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    Promise.allSettled([
      tmdbFetch<{ results: ShowOption[] }>("/trending/tv/week"),
      tmdbFetch<{ results: ShowOption[] }>("/tv/popular"),
    ]).then((results) => {
      const seen = new Set<number>();
      const shows: ShowOption[] = [];
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const s of r.value.results) {
          if (s.poster_path && !seen.has(s.id)) {
            seen.add(s.id);
            shows.push(s);
          }
        }
      }
      setOptions(shows.slice(0, 30));
    });
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const finish = async (skip: boolean) => {
    if (!user) return;
    setSaving(true);
    setError("");
    if (!skip) {
      const picks = options.filter((o) => selected.has(o.id));
      const results = await Promise.allSettled(
        picks.map((s) => syncShowPointer(user.id, s.id, { name: s.name, backdrop_path: s.backdrop_path, firstSeason: 1 }, []))
      );
      if (results.every((r) => r.status === "rejected")) {
        setSaving(false);
        setError("Couldn't save your shows. Check your connection and try again.");
        return;
      }
    }
    await getSupabase().auth.updateUser({ data: { onboarded: true } }).catch(() => {});
    track(skip ? "onboarding_skipped" : "onboarding_completed", { picks: selected.size });
    router.replace("/dashboard");
  };

  if (!user) return null;

  return (
    <main className="min-h-screen px-5 pb-32 pt-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-yellow">Welcome to TTT</p>
      <h1 className="mt-2 text-3xl font-extrabold">What are you watching?</h1>
      <p className="mt-2 text-text-muted">
        Pick at least {MIN_PICKS} shows. We&apos;ll track your next episodes and tell you when new ones drop.
      </p>

      {options.length === 0 ? (
        <div className="mt-10 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-yellow border-t-transparent" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {options.map((show) => {
            const isSelected = selected.has(show.id);
            return (
              <button
                key={show.id}
                onClick={() => toggle(show.id)}
                aria-pressed={isSelected}
                className={`relative overflow-hidden rounded-xl text-left transition-all ${isSelected ? "ring-4 ring-accent-yellow" : "opacity-90 hover:opacity-100"}`}
              >
                <img src={`${POSTER}${show.poster_path}`} alt={show.name} loading="lazy" className="aspect-[2/3] w-full object-cover" />
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-yellow text-sm font-extrabold text-bg-primary">
                    ✓
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 text-xs font-semibold line-clamp-2">
                  {show.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-bg-primary/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button onClick={() => finish(true)} disabled={saving} className="px-3 py-3 text-sm text-text-muted hover:text-text-primary">
            Skip
          </button>
          <div className="flex-1 text-right text-sm text-text-muted">
            {error ? <span className="text-red-400">{error}</span> : `${selected.size} selected`}
          </div>
          <button
            onClick={() => finish(false)}
            disabled={selected.size < MIN_PICKS || saving}
            className="rounded-xl bg-accent-yellow px-6 py-3 font-bold text-bg-primary transition-all hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Saving..." : selected.size < MIN_PICKS ? `Pick ${MIN_PICKS - selected.size} more` : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
