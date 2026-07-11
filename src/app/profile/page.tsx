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
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "reviews" | "badges">("history");

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
          <button
            onClick={() => signOut().then(() => router.push("/"))}
            className="w-full py-3 text-red-400 hover:text-red-300 font-semibold text-sm
                       bg-card-surface rounded-xl hover:bg-red-400/10 transition-colors"
          >
            Sign Out
          </button>
        </section>
      </div>

      <BottomNav />
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

