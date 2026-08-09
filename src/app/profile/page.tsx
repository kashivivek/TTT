"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ImportDropzone from "@/components/ImportDropzone";
import { parseImportZip } from "@/lib/import-parser";
import { getSupabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getTvDetails, getMovieDetails } from "@/lib/tmdb";
import FavoritesTab from "@/components/profile/FavoritesTab";
import ReviewsTab from "@/components/profile/ReviewsTab";
import BadgesTab from "@/components/profile/BadgesTab";

interface Stats {
  totalShows: number;
  totalEpisodes: number;
  tvMonths: number;
  tvDays: number;
  tvHours: number;
  movieMonths: number;
  movieDays: number;
  movieHours: number;
  moviesWatched: number;
}

interface TrackedShow {
  tmdb_id: number;
  name: string;
  backdrop_path: string | null;
  media_type: "movie" | "tv";
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [shows, setShows] = useState<TrackedShow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [preferredLanguages, setPreferredLanguages] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [favoriteActors, setFavoriteActors] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPreferencesSection, setShowPreferencesSection] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "reviews" | "badges">("history");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("other");
  const [deleteComments, setDeleteComments] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    stage: string;
    current: number;
    total: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load display name
  useEffect(() => {
    if (user) {
      setDisplayName(
        (user.user_metadata?.display_name as string) ||
          user.email?.split("@")[0] ||
          ""
      );
    }
  }, [user]);

  // Load stats and shows
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const supabase = getSupabase();

      try {
        // Total episodes watched (TV)
        const { count: tvEps } = await supabase
          .from("watch_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("media_type", "tv");

        // Movies watched
        const { count: movieCount } = await supabase
          .from("watch_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("media_type", "movie");

        // Tracked shows (for stats)
        const { count: showCount } = await supabase
          .from("tracked_shows")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Get 20 most recent unique watched items
        const { data: recentHistory } = await supabase
          .from("watch_history")
          .select("tmdb_id, media_type, watched_at")
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .limit(100); // Fetch 100 to find unique 20

        if (recentHistory) {
          const uniqueItems = [];
          const seen = new Set();
          for (const item of recentHistory) {
            const key = `${item.media_type}_${item.tmdb_id}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueItems.push(item);
              if (uniqueItems.length === 20) break;
            }
          }

          // Fetch posters via TMDB API
          const enriched = await Promise.all(
            uniqueItems.map(async (item) => {
              try {
                if (item.media_type === "movie") {
                  const details = await getMovieDetails(item.tmdb_id);
                  return {
                    tmdb_id: item.tmdb_id,
                    media_type: "movie",
                    name: details.title,
                    backdrop_path: details.poster_path || details.backdrop_path, // Fallback to poster if backdrop missing
                  };
                } else {
                  const details = await getTvDetails(item.tmdb_id);
                  return {
                    tmdb_id: item.tmdb_id,
                    media_type: "tv",
                    name: details.name,
                    backdrop_path: details.poster_path || details.backdrop_path,
                  };
                }
              } catch (e) {
                return null;
              }
            })
          );

          setShows(enriched.filter((x) => x !== null) as TrackedShow[]);
        }

        // Calculate TV time (~45 min per episode)
        const totalTvMinutes = (tvEps || 0) * 45;
        const tvTotalHours = Math.floor(totalTvMinutes / 60);
        const tvMonths = Math.floor(tvTotalHours / (24 * 30));
        const tvDays = Math.floor((tvTotalHours % (24 * 30)) / 24);
        const tvHours = tvTotalHours % 24;

        // Calculate Movie time (~120 min per movie)
        const totalMovieMinutes = (movieCount || 0) * 120;
        const movieTotalHours = Math.floor(totalMovieMinutes / 60);
        const movieMonths = Math.floor(movieTotalHours / (24 * 30));
        const movieDays = Math.floor((movieTotalHours % (24 * 30)) / 24);
        const movieHours = movieTotalHours % 24;

        const { data: preferenceData } = await supabase
          .from("user_preferences")
          .select("watch_country, preferred_languages, favorite_genres, favorite_actors")
          .eq("user_id", user.id)
          .single();

        if (preferenceData) {
          setPreferredCountry(preferenceData.watch_country || "");
          setPreferredLanguages(
            Array.isArray(preferenceData.preferred_languages)
              ? preferenceData.preferred_languages.join(", ")
              : ""
          );
          setFavoriteGenres(
            Array.isArray(preferenceData.favorite_genres)
              ? preferenceData.favorite_genres.join(", ")
              : ""
          );
          setFavoriteActors(
            Array.isArray(preferenceData.favorite_actors)
              ? preferenceData.favorite_actors.join(", ")
              : ""
          );
        }

        setStats({
          totalShows: showCount || 0,
          totalEpisodes: tvEps || 0,
          tvMonths,
          tvDays,
          tvHours,
          movieMonths,
          movieDays,
          movieHours,
          moviesWatched: movieCount || 0,
        });
      } catch {
        setStats({
          totalShows: 0,
          totalEpisodes: 0,
          tvMonths: 0,
          tvDays: 0,
          tvHours: 0,
          movieMonths: 0,
          movieDays: 0,
          movieHours: 0,
          moviesWatched: 0,
        });
      }
      setLoadingStats(false);
    };

    load();
  }, [user]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await getSupabase().auth.updateUser({
        data: { display_name: displayName.trim() },
      });
    } catch {
      // silently fail
    }
    setSavingName(false);
    setEditingName(false);
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPreferences(true);

    const languages = preferredLanguages
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const genres = favoriteGenres
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const actors = favoriteActors
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      await getSupabase().from("user_preferences").upsert(
        {
          user_id: user.id,
          watch_country: preferredCountry || null,
          preferred_languages: languages,
          favorite_genres: genres,
          favorite_actors: actors,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await parseImportZip(file, user, setProgress);
      setImportResult(res);
    } catch {
      setImportResult({ imported: 0, errors: ["Failed to process the file."] });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const supabase = getSupabase();
      // Try server-side deletion first (requires SUPABASE_SERVICE_ROLE_KEY configured server-side)
      try {
        const sess = await supabase.auth.getSession();
        const accessToken = sess?.data?.session?.access_token;
        if (accessToken) {
          const res = await fetch("/api/delete-account", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ reason: deleteReason, comments: deleteComments }),
          });

          if (res.ok) {
            await supabase.auth.signOut();
            router.push("/");
            setDeleting(false);
            setShowDeleteModal(false);
            return;
          }
          // otherwise fall through to client-side deletion
          console.error("Server delete-account responded with", res.status);
        }
      } catch (e) {
        console.error("Server-side delete attempt failed", e);
      }

      // Fallback: delete via client (best-effort)
      const tables = [
        "watch_history",
        "tracked_shows",
        "user_ratings",
        "user_comments",
        "user_preferences",
      ];

      await Promise.all(
        tables.map(async (t) => {
          try {
            await supabase.from(t).delete().eq("user_id", user.id);
          } catch (e) {
            // best-effort client-side deletion; ignore errors
          }
        })
      );

      try {
        await supabase.from("account_deletions").insert({
          user_id: user.id,
          reason: deleteReason,
          comments: deleteComments || null,
          deleted_at: new Date().toISOString(),
        });
      } catch {}

      await supabase.auth.signOut();
      router.push("/");
    } catch (e) {
      console.error("Failed to delete account data", e);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // Use first show's backdrop as cover, or gradient fallback
  const coverImage = shows[0]?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${shows[0].backdrop_path}`
    : null;

  return (
    <main className="min-h-screen pb-20">
      {/* Cover banner */}
      <div className="relative h-48 sm:h-56 bg-gradient-to-br from-card-surface to-bg-primary overflow-hidden">
        {coverImage && (
          <img
            src={coverImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/40 to-transparent" />
      </div>

      {/* Profile info overlapping banner */}
      <div className="max-w-7xl mx-auto px-4 -mt-14 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-card-surface border-4 border-bg-primary flex items-center justify-center text-2xl font-bold text-accent-yellow flex-shrink-0">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {editingName ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-card-surface text-text-primary rounded-lg px-3 py-1.5
                             border border-transparent focus:border-accent-yellow outline-none text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-accent-yellow text-xs font-bold"
                >
                  {savingName ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-text-muted text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-text-primary truncate">
                  {displayName}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="bg-card-surface text-text-primary text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide hover:bg-accent-yellow hover:text-bg-primary transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats section */}
        <section className="mt-6">
          <h2 className="text-lg font-bold text-text-primary mb-3">Stats</h2>
          {loadingStats ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-card-surface rounded-xl overflow-hidden border border-card-surface">
              <StatBox
                icon="📺"
                label="TV time"
                values={[
                  { num: stats.tvMonths, unit: "MONTHS" },
                  { num: stats.tvDays, unit: "DAYS" },
                  { num: stats.tvHours, unit: "HOURS" },
                ]}
              />
              <StatBox
                icon="📋"
                label="Episodes watched"
                single={stats.totalEpisodes.toLocaleString()}
              />
              <StatBox
                icon="🎬"
                label="Movie time"
                values={[
                  { num: stats.movieMonths, unit: "MONTHS" },
                  { num: stats.movieDays, unit: "DAYS" },
                  { num: stats.movieHours, unit: "HOURS" },
                ]}
              />
              <StatBox
                icon="🎥"
                label="Movies watched"
                single={stats.moviesWatched.toLocaleString()}
              />
            </div>
          ) : null}
        </section>

        {/* Tab Navigation */}
        <div className="flex gap-6 mt-8 mb-6 border-b border-white/10 overflow-x-auto scrollbar-hide px-1">
          {[
            { id: "history", label: "History" },
            { id: "favorites", label: "Favorites" },
            { id: "reviews", label: "Reviews" },
            { id: "badges", label: "Badges" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-bold whitespace-nowrap transition-all relative ${
                activeTab === tab.id ? "text-accent-yellow" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-yellow rounded-t-full shadow-[0_0_8px_rgba(255,213,79,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <section className="min-h-[300px] mb-8">
          {activeTab === "history" && (
            shows.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {shows.map((show) => (
                  <div
                    key={`${show.media_type}_${show.tmdb_id}`}
                    onClick={() => router.push(show.media_type === "movie" ? `/movies/${show.tmdb_id}` : `/shows/${show.tmdb_id}`)}
                    className="flex-shrink-0 w-24 h-36 rounded-lg overflow-hidden bg-card-surface relative group cursor-pointer hover:ring-2 hover:ring-accent-yellow transition-all"
                  >
                    {show.backdrop_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${show.backdrop_path}`}
                        alt={show.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
                        {show.name}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] font-medium truncate">
                        {show.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-text-muted p-8">No watch history yet.</div>
            )
          )}
          
          {activeTab === "favorites" && <FavoritesTab userId={user.id} />}
          {activeTab === "reviews" && <ReviewsTab userId={user.id} />}
          {activeTab === "badges" && <BadgesTab userId={user.id} />}
        </section>

        {/* Import section */}
        <section className="mt-6">
          <button
            onClick={() => setShowImport(!showImport)}
            className="w-full flex items-center justify-between bg-card-surface rounded-xl px-5 py-4 hover:ring-1 hover:ring-accent-yellow/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📥</span>
              <div className="text-left">
                <p className="text-text-primary font-bold text-sm flex items-center gap-2">
                  Import Watch History
                  <span className="animate-pulse bg-accent-yellow/20 text-accent-yellow px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-accent-yellow/50">
                    🔥 Hot
                  </span>
                </p>
                <p className="text-text-muted text-xs">
                  Upload a TV Time data export
                </p>
              </div>
            </div>
            <span
              className={`text-text-muted transition-transform ${showImport ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>

          {showImport && (
            <div className="mt-3 bg-card-surface rounded-xl p-5">
              <ImportDropzone onFileSelected={handleImport} disabled={importing} />

              {progress && (
                <div className="mt-4 text-center">
                  <p className="text-accent-yellow font-semibold text-sm">
                    {progress.stage}
                  </p>
                  {progress.total > 1 && (
                    <div className="mt-2 w-full bg-bg-primary rounded-full h-2">
                      <div
                        className="bg-accent-yellow h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                  <p className="text-text-muted text-xs mt-1">
                    {progress.current} / {progress.total}
                  </p>
                </div>
              )}

              {importResult && (
                <div className="mt-4 p-4 bg-bg-primary rounded-xl">
                  {importResult.imported > 0 && (
                    <p className="text-success-green font-bold text-sm mb-2">
                      ✓ {importResult.imported} episodes imported
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-red-400 text-xs">
                          {err}
                        </p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-text-muted text-xs">
                          ...and {importResult.errors.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Preferences section (collapsed by default) */}
        <section className="mt-6 space-y-4">
          <div className="bg-card-surface rounded-xl">
            <button
              onClick={() => setShowPreferencesSection((s) => !s)}
              className="w-full flex items-center justify-between p-5"
            >
              <div>
                <h2 className="text-lg font-bold text-text-primary">Preferences</h2>
                <p className="text-text-muted text-sm">Save your default country, languages, genres, and actors.</p>
              </div>
              <span className={`text-text-muted transition-transform ${showPreferencesSection ? "rotate-180" : ""}`}>▾</span>
            </button>

            {showPreferencesSection && (
              <div className="p-5 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div />
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className="rounded-full bg-accent-yellow px-4 py-2 text-sm font-bold text-bg-primary hover:brightness-110 disabled:opacity-70"
                  >
                    {savingPreferences ? "Saving..." : "Save Preferences"}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-text-muted text-xs uppercase tracking-[0.18em] mb-2 block">Preferred country</span>
                    <input
                      type="text"
                      value={preferredCountry}
                      onChange={(e) => setPreferredCountry(e.target.value)}
                      placeholder="US"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-text-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-text-muted text-xs uppercase tracking-[0.18em] mb-2 block">Preferred languages</span>
                    <input
                      type="text"
                      value={preferredLanguages}
                      onChange={(e) => setPreferredLanguages(e.target.value)}
                      placeholder="English, Spanish"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-text-primary"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-text-muted text-xs uppercase tracking-[0.18em] mb-2 block">Favorite genres</span>
                    <input
                      type="text"
                      value={favoriteGenres}
                      onChange={(e) => setFavoriteGenres(e.target.value)}
                      placeholder="Drama, Comedy, Sci-Fi"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-text-primary"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-text-muted text-xs uppercase tracking-[0.18em] mb-2 block">Favorite actors</span>
                    <input
                      type="text"
                      value={favoriteActors}
                      onChange={(e) => setFavoriteActors(e.target.value)}
                      placeholder="Keanu Reeves, Zendaya"
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-text-primary"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Account actions */}
        <section className="mt-6 space-y-3">
          <div className="bg-card-surface rounded-xl px-5 py-4">
            <p className="text-text-muted text-xs mb-1">Email</p>
            <p className="text-text-primary text-sm">{user.email}</p>
          </div>
          <div className="bg-card-surface rounded-xl px-5 py-4">
            <p className="text-text-muted text-xs mb-1">Member since</p>
            <p className="text-text-primary text-sm">
              {new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="w-full py-3">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 text-red-400 font-semibold text-sm bg-card-surface rounded-xl hover:bg-red-500/5 transition-colors"
              >
                Delete Account
              </button>
              <button
                onClick={() => signOut().then(() => router.push("/"))}
                className="w-full py-3 text-red-400 hover:text-red-300 font-semibold text-sm bg-card-surface rounded-xl hover:bg-red-400/10 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="absolute inset-0 bg-black/60 z-[9999]" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-card-surface rounded-xl p-6 z-[10000] w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete account</h3>
            <p className="text-text-muted text-sm mb-4">This will remove your watch history, tracked shows, reviews, preferences, and related data from our application. This cannot be undone.</p>

            <label className="block text-sm text-text-muted mb-2">Reason for deleting</label>
            <select
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-bg-primary px-3 py-2 mb-3"
            >
              <option value="privacy">Privacy concerns</option>
              <option value="not_useful">App not useful</option>
              <option value="technical">Technical issues</option>
              <option value="other">Other</option>
            </select>

            <label className="block text-sm text-text-muted mb-2">Additional comments (optional)</label>
            <textarea
              value={deleteComments}
              onChange={(e) => setDeleteComments(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-bg-primary px-3 py-2 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-full bg-card-surface text-text-muted"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-full bg-red-500 text-white font-bold"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatBox({
  icon,
  label,
  values,
  single,
}: {
  icon: string;
  label: string;
  values?: { num: number; unit: string }[];
  single?: string;
}) {
  return (
    <div className="bg-bg-primary p-4 flex flex-col items-center text-center">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-text-muted text-[11px] font-medium">{label}</span>
      </div>
      {single !== undefined ? (
        <p className="text-text-primary font-extrabold text-2xl">{single}</p>
      ) : values ? (
        <div className="flex items-baseline gap-2">
          {values.map((v) => (
            <div key={v.unit} className="flex flex-col items-center">
              <span className="text-text-primary font-extrabold text-xl leading-none">
                {v.num}
              </span>
              <span className="text-text-muted text-[9px] uppercase tracking-wide mt-0.5">
                {v.unit}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

