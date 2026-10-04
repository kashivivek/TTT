"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ShowCard from "@/components/ShowCard";
import EmotionMatrix from "@/components/EmotionMatrix";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import BottomNav from "@/components/BottomNav";
import FeedbackWidget from "@/components/FeedbackWidget";
import WhatsNewWidget from "@/components/WhatsNewWidget";
import NotificationPrompt from "@/components/NotificationPrompt";
import { getTvDetails, getTrendingAll, getMovieDetails, tmdbFetch } from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";
import { authFetch } from "@/lib/auth-fetch";
import { track } from "@/lib/analytics";
import {
  resolveNextAfter,
  refreshTrackState,
  isStillAwaiting,
  parseAirsTitle,
  todayISO,
  type TrackState,
} from "@/lib/progress";

interface TrackedShowState {
  tmdb_id: number;
  name: string;
  media_type?: string;
  backdrop_path: string | null;
  current_season: number;
  current_episode: number;
  episode_title: string;
  updated_at?: string;
}

interface UndoEntry {
  token: number;
  label: string;
  previous: TrackedShowState;
  season: number;
  episode: number;
  mediaType: string;
}

const REFRESH_KEY = "ttt-show-refresh";
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const RELOAD_THROTTLE_MS = 60 * 1000;

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "shows";
  
  const [shows, setShows] = useState<TrackedShowState[]>([]);
  const [showEmotionFor, setShowEmotionFor] = useState<{tmdbId: number, season: number, episode: number} | null>(null);
  const [loadingShows, setLoadingShows] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [undo, setUndo] = useState<UndoEntry | null>(null);
  const undoTokenRef = useRef(0);
  const cancelledTokensRef = useRef<Set<number>>(new Set());
  const lastLoadRef = useRef(0);
  
  const [trendingAll, setTrendingAll] = useState<any[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiTyped, setAiTyped] = useState(false);
  const [tvTimeQuery, setTvTimeQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiError, setAiError] = useState("");
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [searchingAi, setSearchingAi] = useState(false);
  const [suggestingMe, setSuggestingMe] = useState(false);
  const [aiCacheLoaded, setAiCacheLoaded] = useState(false);
  
  const [upcomingMovies, setUpcomingMovies] = useState<any[]>([]);
  const [unreleasedMovieIds, setUnreleasedMovieIds] = useState<Set<number>>(new Set());
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  // Re-sync shows when the user returns to this tab (throttled)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoadRef.current > RELOAD_THROTTLE_MS) {
        setRefreshKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Re-check awaiting/completed shows against TMDB so new episodes resurface.
  const refreshStaleShows = useCallback(async (rows: TrackedShowState[]) => {
    if (!user) return;
    let refreshedAt: Record<string, number> = {};
    try {
      refreshedAt = JSON.parse(localStorage.getItem(REFRESH_KEY) || "{}");
    } catch {
      refreshedAt = {};
    }
    const now = Date.now();
    const candidates = rows.filter(
      (r) =>
        (r.media_type === "awaiting" || r.media_type === "completed") &&
        now - (refreshedAt[r.tmdb_id] || 0) > REFRESH_INTERVAL_MS
    );
    if (candidates.length === 0) return;

    const queue = [...candidates];
    const worker = async () => {
      while (queue.length > 0) {
        const row = queue.shift()!;
        try {
          const next = await refreshTrackState(tmdbFetch, row);
          refreshedAt[row.tmdb_id] = Date.now();
          if (!next) continue;
          const updatedAt = new Date().toISOString();
          await getSupabase()
            .from("tracked_shows")
            .update({ ...next, updated_at: updatedAt })
            .eq("user_id", user.id)
            .eq("tmdb_id", row.tmdb_id);
          setShows((prev) =>
            prev.map((s) => (s.tmdb_id === row.tmdb_id ? { ...s, ...next, updated_at: updatedAt } : s))
          );
        } catch {
          // Try again next time
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    localStorage.setItem(REFRESH_KEY, JSON.stringify(refreshedAt));
  }, [user]);

  // Load tracked shows from Supabase (re-runs on tab focus via refreshKey)
  useEffect(() => {
    if (!user) return;

    const loadShows = async () => {
      lastLoadRef.current = Date.now();
      try {
        const { data } = await getSupabase()
          .from("tracked_shows")
          .select("tmdb_id, name, media_type, backdrop_path, current_season, current_episode, episode_title, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (data) {
          const rows: TrackedShowState[] = data.map((row: Record<string, unknown>) => ({
            tmdb_id: row.tmdb_id as number,
            name: row.name as string,
            media_type: (row.media_type as string) || "tv",
            backdrop_path: row.backdrop_path as string | null,
            current_season: row.current_season as number,
            current_episode: row.current_episode as number,
            episode_title: (row.episode_title as string) || "",
            updated_at: row.updated_at as string | undefined,
          }));
          setShows(rows);
          refreshStaleShows(rows);

          if (data.length === 0) {
            const seenServer = user?.user_metadata?.has_seen_import_popup;
            const hasDismissedLocal = localStorage.getItem("hasDismissedImport");
            if (!seenServer && !hasDismissedLocal) {
              const { data: watchData } = await getSupabase()
                .from("watch_history")
                .select("tmdb_id")
                .eq("user_id", user.id)
                .limit(1);
              if (!watchData || watchData.length === 0) {
                setShowImportPopup(true);
              }
            }
          }
        }
      } catch {
        // Keep whatever is on screen
      }
      setLoadingShows(false);
    };

    loadShows();
  }, [user, refreshKey, refreshStaleShows]);


  // Load Explore Data
  useEffect(() => {
    if (tab !== "explore") return;
    if (trendingAll.length > 0 || loadingExplore) return;

    const loadExplore = async () => {
      setLoadingExplore(true);
      try {
        const trendingRes = await getTrendingAll();
        const filtered = (trendingRes.results || [])
          .filter((item) => item.media_type === "tv" || item.media_type === "movie")
          .slice(0, 12);

        setTrendingAll(filtered);
      } catch (err) {
        console.error("Failed to load explore trending", err);
      }
      setLoadingExplore(false);
    };
    loadExplore();
  }, [tab, trendingAll.length, loadingExplore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cache = window.localStorage.getItem("ttt-ai-suggestions");
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (typeof parsed.query === "string") {
          setTvTimeQuery(parsed.query);
          setAiQuery(parsed.query);
        }
        if (Array.isArray(parsed.suggestions)) {
          setAiSuggestions(parsed.suggestions);
        }
      } catch {
        // ignore invalid cache
      }
    }
    setAiCacheLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !aiCacheLoaded) return;

    const cachePayload = {
      query: tvTimeQuery,
      suggestions: aiSuggestions,
    };
    window.localStorage.setItem("ttt-ai-suggestions", JSON.stringify(cachePayload));
  }, [aiCacheLoaded, tvTimeQuery, aiSuggestions]);

  // Load Upcoming Movies from Tracked Movies
  const trackedMovieIdsKey = shows
    .filter((s) => s.media_type === "movie")
    .map((s) => s.tmdb_id)
    .join(",");

  useEffect(() => {
    if (tab !== "movies") return;
    if (!trackedMovieIdsKey) {
      setUpcomingMovies([]);
      setUnreleasedMovieIds(new Set());
      return;
    }
    const loadUpcomingTracked = async () => {
      setLoadingUpcoming(true);
      try {
        const ids = trackedMovieIdsKey.split(",").map(Number);
        const moviesDetails = await Promise.all(ids.map((id) => getMovieDetails(id).catch(() => null)));
        const now = todayISO();
        const upcoming = moviesDetails
          .filter((m) => m && m.release_date && m.release_date > now)
          .sort((a, b) => (a?.release_date || "").localeCompare(b?.release_date || ""));

        setUpcomingMovies(upcoming);
        setUnreleasedMovieIds(new Set(upcoming.map((m) => m?.id || 0)));
      } catch (e) {
        console.error("Failed to load upcoming", e);
      }
      setLoadingUpcoming(false);
    };
    loadUpcomingTracked();
  }, [tab, trackedMovieIdsKey]);

  const saveShowState = async (tmdbId: number, state: Partial<TrackedShowState>) => {
    if (!user) return;
    try {
      await getSupabase()
        .from("tracked_shows")
        .update({
          ...(state.media_type !== undefined && { media_type: state.media_type }),
          ...(state.current_season !== undefined && { current_season: state.current_season }),
          ...(state.current_episode !== undefined && { current_episode: state.current_episode }),
          ...(state.episode_title !== undefined && { episode_title: state.episode_title }),
          updated_at: state.updated_at || new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId);
    } catch {
      // Next load will reconcile
    }
  };

  const prioritizeResults = (query: string, items: any[]) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    const exactMatches = items.filter((item) => {
      const title = (item.title || item.name || "").toLowerCase();
      return title === normalizedQuery;
    });
    const partialMatches = items.filter((item) => {
      const title = (item.title || item.name || "").toLowerCase();
      return title.includes(normalizedQuery) && title !== normalizedQuery;
    });
    const others = items.filter((item) => {
      const title = (item.title || item.name || "").toLowerCase();
      return !title.includes(normalizedQuery);
    });

    return [...exactMatches, ...partialMatches, ...others].slice(0, 12);
  };

  const handleAiSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = aiQuery.trim();
    if (!query || searchingAi) return;

    setSearchingAi(true);
    setTvTimeQuery(query);
    setAiSuggestions([]);
    setAiError("");
    track("ai_search");

    try {
      const response = await authFetch("/api/groq-suggestions", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAiError(response.status === 429 ? "You've hit the suggestion limit. Try again in a bit." : "Suggestions are unavailable right now.");
      }
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(prioritizeResults(query, data.suggestions));
      } else {
        setAiSuggestions([]);
      }
    } catch (err) {
      console.error("AI suggestions failed", err);
      setAiSuggestions([]);
    }

    setSearchingAi(false);
  };

  const handleSuggestMe = async () => {
    if (!user || suggestingMe || searchingAi) return;
    setSuggestingMe(true);
    setSearchingAi(true);
    setAiSuggestions([]);
    setAiError("");
    setTvTimeQuery("Personalized suggestions");
    track("ai_suggest_me");

    try {
      const [{ data: watchData }, { data: trackedData }] = await Promise.all([
        getSupabase()
          .from("watch_history")
          .select("tmdb_id, media_type, watched_at")
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .limit(50),
        getSupabase()
          .from("tracked_shows")
          .select("tmdb_id")
          .eq("user_id", user.id),
      ]);

      const watchedIds = new Set<number>();
      (watchData || []).forEach((r: any) => watchedIds.add(r.tmdb_id));

      const trackedIds = new Set<number>();
      (trackedData || []).forEach((r: any) => trackedIds.add(r.tmdb_id));

      const excludeIds = new Set<number>([...watchedIds, ...trackedIds]);

      // Fetch a few recent watched details to provide as context to the LLM
      const recentIds = Array.from(watchedIds).slice(0, 24);
      const detailsPromises = recentIds.map((id) => {
        const row = (watchData || []).find((r: any) => r.tmdb_id === id);
        return (async () => {
          try {
            if (row && row.media_type === "movie") return await getMovieDetails(id);
            return await getTvDetails(id);
          } catch {
            return null;
          }
        })();
      });

      const details = (await Promise.all(detailsPromises)).filter(Boolean) as any[];
      const titles = details.map((d) => d.title || d.name).filter(Boolean).slice(0, 12);

      const prompt = `Suggest up to 12 movies or TV shows for this user based on their recent watch history. Do NOT recommend anything the user has already watched or is tracking. Recent watches:\n${titles.join("\n")}\nReturn only a JSON array of title strings.`;

      const response = await authFetch("/api/groq-suggestions", {
        method: "POST",
        body: JSON.stringify({ query: prompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAiError(response.status === 429 ? "You've hit the suggestion limit. Try again in a bit." : "Suggestions are unavailable right now.");
      }

      let suggestions: any[] = Array.isArray(data.suggestions) ? data.suggestions : [];

      // Filter out any already-watched or tracked items
      suggestions = suggestions.filter((it) => !excludeIds.has(it.id));

      setAiSuggestions(prioritizeResults("", suggestions));
      setTvTimeQuery("For you");
    } catch (e) {
      console.error("Suggest me failed", e);
      setAiSuggestions([]);
    } finally {
      setSearchingAi(false);
      setSuggestingMe(false);
    }
  };



  const handleEmotionSelect = async (emotion: string) => {
    if (!user || !showEmotionFor) return;
    try {
      await getSupabase().from("watch_history").update({ emotion })
        .eq("user_id", user.id)
        .eq("tmdb_id", showEmotionFor.tmdbId)
        .eq("season_number", showEmotionFor.season)
        .eq("episode_number", showEmotionFor.episode);
    } catch (e) {
      console.error(e);
    }
    setShowEmotionFor(null);
  };

  const handleSnooze = async () => {
    if (!user) return;
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + 7); // Snooze for 1 week
    try {
      await getSupabase().auth.updateUser({
        data: { snooze_feedback_until: snoozeUntil.toISOString() }
      });
    } catch (e) {
      console.error(e);
    }
    setShowEmotionFor(null);
  };

  const handleWatched = async (tmdbId: number, season: number, episode: number, mediaType: string = "tv") => {
    if (!user) return;
    const previous = shows.find((s) => s.tmdb_id === tmdbId);
    if (!previous) return;
    const isMovie = mediaType === "movie";
    const started = Date.now();

    const snoozeUntil = user.user_metadata?.snooze_feedback_until;
    if (!isMovie && (!snoozeUntil || new Date(snoozeUntil) < new Date())) {
      setShowEmotionFor({ tmdbId, season, episode });
    }

    const token = ++undoTokenRef.current;
    setUndo({
      token,
      label: isMovie ? `${previous.name} marked as watched` : `${previous.name} S${season}E${episode} marked as watched`,
      previous,
      season,
      episode,
      mediaType,
    });
    track("mark_watched", { media_type: isMovie ? "movie" : "tv", source: "dashboard" });

    const watchedAt = new Date().toISOString();
    if (isMovie) {
      getSupabase()
        .from("watch_history")
        .insert({ user_id: user.id, tmdb_id: tmdbId, media_type: "movie", watched_at: watchedAt })
        .then(() => {});
    } else {
      getSupabase()
        .from("watch_history")
        .upsert(
          {
            user_id: user.id,
            tmdb_id: tmdbId,
            media_type: "tv",
            season_number: season,
            episode_number: episode,
            watched_at: watchedAt,
          },
          { onConflict: "user_id,tmdb_id,season_number,episode_number" }
        )
        .then(() => {});
    }

    let next: Partial<TrackedShowState> = { updated_at: watchedAt };
    if (isMovie) {
      next = { media_type: "completed_movie", updated_at: watchedAt };
    } else {
      try {
        const state: TrackState = await resolveNextAfter(tmdbFetch, tmdbId, season, episode);
        next = { ...state, updated_at: watchedAt };
        if (state.media_type === "completed") track("show_completed");
      } catch {
        // Keep the pointer; the next refresh will fix it
      }
    }

    // Let the check animation finish before the card changes
    await new Promise((r) => setTimeout(r, Math.max(0, 1200 - (Date.now() - started))));
    if (cancelledTokensRef.current.has(token)) return;

    setShows((prev) => prev.map((s) => (s.tmdb_id === tmdbId ? { ...s, ...next } : s)));
    await saveShowState(tmdbId, next);
  };

  const [cardResetKey, setCardResetKey] = useState(0);

  const handleUndo = async () => {
    if (!undo || !user) return;
    const entry = undo;
    setUndo(null);
    setShowEmotionFor(null);
    cancelledTokensRef.current.add(entry.token);

    const del = getSupabase()
      .from("watch_history")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", entry.previous.tmdb_id);
    if (entry.mediaType === "movie") {
      await del.eq("media_type", "movie");
    } else {
      await del.eq("season_number", entry.season).eq("episode_number", entry.episode);
    }

    setShows((prev) => prev.map((s) => (s.tmdb_id === entry.previous.tmdb_id ? entry.previous : s)));
    setCardResetKey((k) => k + 1);
    await saveShowState(entry.previous.tmdb_id, entry.previous);
    track("undo_watched");
  };

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo((u) => (u?.token === undo.token ? null : u)), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-sm border-b border-card-surface px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
              <h1 className="text-2xl font-extrabold text-text-primary">
                TV Time Tracker
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <WhatsNewWidget />
              <FeedbackWidget />
              <a
                href="/profile"
                className="w-9 h-9 rounded-full bg-accent-yellow/20 flex items-center justify-center
                           text-sm font-bold text-accent-yellow hover:bg-accent-yellow/30 transition-colors"
                title="Profile"
              >
                {user?.email?.charAt(0).toUpperCase() || "?"}
              </a>
            </div>
          </div>

          <div className="absolute -bottom-6 w-full max-w-lg px-4 left-1/2 -translate-x-1/2">
          <SearchAutocomplete onSelect={(id, type) => {
            if (type === "movie") router.push(`/movies/${id}`);
            else router.push(`/shows/${id}`);
          }} />
        </div>
        </div>
      </header>

      {/* Main Content Area based on tab */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-6">
        
        {tab === "explore" && (
          <div className="space-y-8">
            <div className="bg-card-surface p-6 rounded-3xl border border-white/10 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-text-primary">TV Time Suggestions</h2>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-text-muted">
                    <span>✨</span>
                    <span>AI Suggestions</span>
                  </div>
                </div>
              </div>
              <p className="text-text-muted text-sm mt-1">Ask for a mood, genre, or vibe and get recommendations from trending movies and TV shows.</p>

              <form onSubmit={handleAiSearch} className="space-y-4">
                <textarea
                  value={aiQuery}
                  onChange={(e) => {
                    setAiQuery(e.target.value);
                    setAiTyped(true);
                  }}
                  rows={3}
                  placeholder="I want to watch something horror and binge-worthy..."
                  className="w-full rounded-3xl border border-white/10 bg-bg-primary px-4 py-3 text-text-primary placeholder:text-text-muted outline-none focus:border-accent-yellow"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-text-muted">Try prompts like “horror thrillers”, “feel-good comedies”, or “new TV shows with suspense”.</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestMe}
                      disabled={suggestingMe || searchingAi}
                      className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
                      aria-label="Suggest me"
                    >
                      {suggestingMe ? (
                        <div className="w-4 h-4 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="text-lg">✨</span>
                          <span className="hidden sm:inline">Suggest me something</span>
                        </>
                      )}
                    </button>
                    {aiTyped && aiQuery.trim().length > 0 && (
                      <button
                        type="submit"
                        className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary hover:brightness-110 disabled:opacity-70"
                        disabled={searchingAi}
                      >
                        {searchingAi ? "Finding suggestions..." : "Get TV Time Suggestions"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {searchingAi && (
              <div className="flex items-center gap-3 text-text-muted">
                <div className="w-5 h-5 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
                <span>{suggestingMe ? "Getting recommendations tailored for you..." : "Getting recommendations from AI..."}</span>
              </div>
            )}

            {aiError && !searchingAi && (
              <div className="text-sm text-red-400">{aiError}</div>
            )}

            {tvTimeQuery && aiSuggestions.length === 0 && !searchingAi && !aiError && (
              <div className="text-sm text-text-muted">No AI suggestions matched that prompt. Showing trending picks below.</div>
            )}

            {(aiSuggestions.length > 0 ? aiSuggestions : trendingAll).length > 0 ? (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-4">
                  {aiSuggestions.length > 0 ? (tvTimeQuery === "For you" ? "Suggestions based on your watch history" : `Suggestions for “${tvTimeQuery}”`) : "Trending on TV Time"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(aiSuggestions.length > 0 ? aiSuggestions : trendingAll).map((item: any) => {
                    const title = item.title || item.name || "Untitled";
                    const route = item.media_type === "movie" ? `/movies/${item.id}` : `/shows/${item.id}`;

                    return (
                      <div
                        key={`${item.media_type}-${item.id}`}
                        onClick={() => router.push(route)}
                        className="cursor-pointer rounded-3xl overflow-hidden bg-card-surface hover:ring-2 hover:ring-accent-yellow/50 transition-all"
                      >
                        {item.backdrop_path && (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${item.backdrop_path}`}
                            alt={title}
                            className="w-full h-44 object-cover opacity-90 hover:opacity-100"
                          />
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-accent-yellow text-xs uppercase tracking-[0.2em] font-semibold">
                              {item.media_type === "movie" ? "Movie" : "TV"}
                            </span>
                            {item.release_date || item.first_air_date ? (
                              <span className="text-[10px] text-text-muted uppercase">
                                {new Date(item.release_date || item.first_air_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-white font-bold text-base leading-tight mb-2 truncate">{title}</h3>
                          <p className="text-text-muted text-sm line-clamp-3">{item.overview || "No description available."}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !loadingExplore && (
                <div className="text-text-muted">No suggestions to show yet. Try a different prompt or check back later.</div>
              )
            )}
          </div>
        )}

        {(tab === "shows" || tab === "movies") && (
          <>
            {loadingShows ? (
              <div className="text-center py-20">
                <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (() => {
              const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
              const today = todayISO();

              const tvShows = shows.filter(s => s.media_type !== "movie" && s.media_type !== "completed_movie");
              const awaitingShows = tvShows.filter(s => isStillAwaiting(s.media_type, s.episode_title, today));
              const completedShows = tvShows.filter(s => s.media_type === "completed");
              const watchableShows = tvShows
                .filter(s => !isStillAwaiting(s.media_type, s.episode_title, today) && s.media_type !== "completed")
                .map(s => {
                  // An "awaiting" episode whose air date has passed is watchable now
                  const airs = s.media_type === "awaiting" ? parseAirsTitle(s.episode_title) : null;
                  return airs ? { ...s, media_type: "tv", episode_title: airs.name } : s;
                });

              const lastActivity = (s: TrackedShowState) => (s.updated_at ? new Date(s.updated_at).getTime() : 0);
              const byRecent = (a: TrackedShowState, b: TrackedShowState) => lastActivity(b) - lastActivity(a);
              const activeShows = watchableShows.filter(s => lastActivity(s) >= twoWeeksAgo).sort(byRecent);
              const inactiveShows = watchableShows.filter(s => lastActivity(s) < twoWeeksAgo).sort(byRecent);

              const movieShows = shows.filter(s => s.media_type === "movie" && !unreleasedMovieIds.has(s.tmdb_id));
              const completedMovies = shows.filter(s => s.media_type === "completed_movie");

              const tabIsEmpty = tab === "shows"
                ? tvShows.length === 0
                : movieShows.length === 0 && completedMovies.length === 0 && upcomingMovies.length === 0 && !loadingUpcoming;

              if (tabIsEmpty) {
                return (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">{tab === "shows" ? "📺" : "🍿"}</div>
                    <p className="text-text-muted text-lg mb-2">No {tab} tracked yet</p>
                    <p className="text-text-muted text-sm mb-6">Search above to add and start tracking</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => router.push("/dashboard?tab=explore")}
                        className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary hover:brightness-110"
                      >
                        Browse trending
                      </button>
                      {tab === "shows" && (
                        <button
                          onClick={() => router.push("/profile?import=1")}
                          className="rounded-full border border-white/10 px-5 py-2.5 font-bold hover:bg-white/5"
                        >
                          Import from TV Time
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const renderShowCard = (show: TrackedShowState) => (
                <div key={`${show.tmdb_id}-${cardResetKey}`}>
                  <ShowCard
                    tmdbId={show.tmdb_id}
                    name={show.name}
                    backdropPath={show.backdrop_path}
                    currentSeason={show.current_season}
                    currentEpisode={show.current_episode}
                    episodeTitle={show.episode_title}
                    mediaType={show.media_type}
                    onWatched={handleWatched}
                  />
                </div>
              );

              return (
              <div>
                {tab === "movies" && (
                  <>
                    <h2 className="text-xl font-bold mb-4">Movies</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {movieShows.map(renderShowCard)}
                    </div>

                    <div className="mt-10">
                      <h2 className="text-xl font-bold mb-4">Upcoming Movies</h2>
                      {loadingUpcoming ? (
                        <div className="text-center py-10">
                          <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : upcomingMovies.length === 0 ? (
                        <div className="bg-card-surface p-6 rounded-xl text-center">
                          <p className="text-text-muted text-sm">No upcoming unreleased movies in your tracking list.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                          {upcomingMovies.map((movie) => (
                            <div key={movie.id} onClick={() => router.push(`/movies/${movie.id}`)} className="cursor-pointer hover:ring-2 hover:ring-accent-yellow rounded-xl overflow-hidden bg-card-surface">
                              {movie.backdrop_path && (
                                <img src={`https://image.tmdb.org/t/p/w500${movie.backdrop_path}`} alt={movie.title} className="w-full h-24 object-cover opacity-80 hover:opacity-100" />
                              )}
                              <div className="p-3">
                                <h3 className="font-bold text-sm truncate">{movie.title}</h3>
                                {movie.release_date && <p className="text-xs text-text-muted">{movie.release_date}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {completedMovies.length > 0 && (
                      <div className="mt-10">
                        <h2 className="text-xl font-bold mb-1">Completed</h2>
                        <p className="text-text-muted text-sm mb-4">Movies you've watched</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {completedMovies
                            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
                            .map(movie => (
                            <div
                              key={movie.tmdb_id}
                              onClick={() => router.push(`/movies/${movie.tmdb_id}`)}
                              className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-yellow/50 transition-all"
                            >
                              {movie.backdrop_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,20,20,0.95), rgba(20,20,20,0.4))" }} />
                              <div className="relative z-10 flex flex-col justify-center h-full px-5">
                                <span className="text-accent-yellow font-bold text-sm tracking-wide">Movie</span>
                                <h2 className="text-white font-bold text-lg leading-tight truncate">{movie.name}</h2>
                                <p className="text-text-muted text-sm mt-1">
                                  Watched on {movie.updated_at ? new Date(movie.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {tab === "shows" && (
                  <>
                    <NotificationPrompt />

                    {activeShows.length > 0 && (
                      <>
                        <h2 className="text-xl font-bold mb-4">Shows</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeShows.map(renderShowCard)}
                        </div>
                      </>
                    )}

                    {inactiveShows.length > 0 && (
                      <div className="mt-10">
                        <h2 className="text-xl font-bold mb-1">Not Watched Recently</h2>
                        <p className="text-text-muted text-sm mb-4">Shows you haven't watched in over 2 weeks</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {inactiveShows.map(renderShowCard)}
                        </div>
                      </div>
                    )}

                    {awaitingShows.length > 0 && (
                      <div className="mt-10">
                        <h2 className="text-xl font-bold mb-1">Upcoming Episodes</h2>
                        <p className="text-text-muted text-sm mb-4">Upcoming episodes and unreleased seasons</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {awaitingShows.map(show => {
                            const airs = parseAirsTitle(show.episode_title);
                            const futureDate = airs
                              ? new Date(`${airs.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : null;

                            return (
                            <div
                              key={show.tmdb_id}
                              onClick={() => router.push(`/shows/${show.tmdb_id}`)}
                              className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-yellow/50 transition-all"
                            >
                              {show.backdrop_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w780${show.backdrop_path}`}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,20,20,0.95), rgba(20,20,20,0.4))" }} />
                              <div className="relative z-10 flex flex-col justify-center h-full px-5">
                                <span className="text-accent-yellow font-bold text-sm tracking-wide">
                                  {airs
                                    ? `S${String(show.current_season).padStart(2, "0")} | E${String(show.current_episode).padStart(2, "0")}`
                                    : "Up to date"}
                                </span>
                                <h2 className="text-white font-bold text-lg leading-tight truncate">{show.name}</h2>
                                <p className="text-text-muted text-xs mt-1 truncate">
                                  {airs ? `Airs ${futureDate}${airs.name ? ` · ${airs.name}` : ""}` : "Waiting for the next episode date"}
                                </p>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {completedShows.length > 0 && (
                      <div className="mt-10">
                        <h2 className="text-xl font-bold mb-1">Completed</h2>
                        <p className="text-text-muted text-sm mb-4">Shows you've fully watched</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {completedShows
                            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
                            .map(show => (
                            <div
                              key={show.tmdb_id}
                              onClick={() => router.push(`/shows/${show.tmdb_id}`)}
                              className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-yellow/50 transition-all"
                            >
                              {show.backdrop_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w780${show.backdrop_path}`}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,20,20,0.95), rgba(20,20,20,0.4))" }} />
                              <div className="relative z-10 flex flex-col justify-center h-full px-5">
                                <h2 className="text-white font-bold text-lg leading-tight truncate">{show.name}</h2>
                                <p className="text-text-muted text-sm mt-1">
                                  Completed on {show.updated_at ? new Date(show.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              );
            })()
          }
        </>
      )}
      </div>

      {/* Emotion overlay */}
      {showEmotionFor !== null && (
        <EmotionMatrix
          onSelect={handleEmotionSelect}
          onClose={() => setShowEmotionFor(null)}
          onSnooze={handleSnooze}
        />
      )}

      {undo && showEmotionFor === null && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-card-surface border border-white/10 shadow-2xl px-5 py-3 max-w-md w-full">
            <span className="text-sm text-text-primary truncate flex-1">{undo.label}</span>
            <button onClick={handleUndo} className="text-accent-yellow font-bold text-sm hover:underline">
              Undo
            </button>
          </div>
        </div>
      )}

      <BottomNav />
      
      {showImportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={async () => { setShowImportPopup(false); if (typeof window !== "undefined") localStorage.setItem("hasDismissedImport", "true"); if (user) { try { await getSupabase().auth.updateUser({ data: { has_seen_import_popup: true } }); } catch {} } }}>
          <div className="bg-card-surface border border-accent-yellow/20 rounded-2xl max-w-lg w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-text-muted hover:text-white" onClick={async () => { setShowImportPopup(false); if (typeof window !== "undefined") localStorage.setItem("hasDismissedImport", "true"); if (user) { try { await getSupabase().auth.updateUser({ data: { has_seen_import_popup: true } }); } catch {} } }}>✕</button>
            <h2 style={{ marginTop: 0, fontSize: "24px", fontWeight: "bold" }}>🚀 Import Your TV Time History</h2>
            <p style={{ fontSize: "16px", color: "#aaa", marginBottom: "20px" }}>Move all your watched shows, movies, and custom watchlists over to our platform in just a few minutes!</p>
            
            <h3 style={{ fontSize: "18px", marginBottom: "8px", fontWeight: "bold" }}>How it works:</h3>
            <ul style={{ paddingLeft: "20px", lineHeight: 1.6, marginBottom: "20px", listStyleType: "disc", color: "#ddd" }}>
              <li><strong>Request Data:</strong> Go to the <a href="https://tvtime.com" target="_blank" rel="noopener noreferrer" className="text-accent-yellow hover:underline">TV Time Data Portal</a> and log in.</li>
              <li><strong>Submit Request:</strong> Click the button to request your GDPR Data Export.</li>
              <li><strong>Check Email:</strong> TV Time will email you a password-protected .zip file alongside a decryption password.</li>
              <li><strong>Upload Here:</strong> Head over to your Profile Settings, drop the .zip file into the importer, and enter your password.</li>
            </ul>
            
            <div className="popup-links flex flex-col sm:flex-row gap-4 my-6 text-sm">
              <a href="https://tvtime.com" target="_blank" rel="noopener noreferrer" onClick={() => { if (typeof window !== "undefined") localStorage.setItem("hasDismissedImport", "true"); }} className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-center font-bold flex-1 transition-colors">👉 Go to TV Time</a>
              <a href="/profile?import=1" onClick={async () => { if (typeof window !== "undefined") localStorage.setItem("hasDismissedImport", "true"); if (user) { try { await getSupabase().auth.updateUser({ data: { has_seen_import_popup: true } }); } catch {} } }} className="bg-accent-yellow text-bg-primary hover:brightness-110 px-4 py-3 rounded-xl text-center font-bold flex-1 transition-colors">⚙️ Go to Profile</a>
            </div>
            
            <p style={{ fontSize: "13px", color: "#777", fontStyle: "italic", margin: 0 }}>
              (Note: Data generation by TV Time can take anywhere from a few minutes to a few hours depending on their system load.)
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}
