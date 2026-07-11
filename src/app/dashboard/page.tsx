"use client";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ShowCard from "@/components/ShowCard";
import EmotionMatrix from "@/components/EmotionMatrix";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import BottomNav from "@/components/BottomNav";
import FeedbackWidget from "@/components/FeedbackWidget";
import { getTvDetails, getSeasonEpisodes, getTrendingTv, getTvRecommendations, getMovieDetails } from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";

interface TrackedShowState {
  tmdb_id: number;
  name: string;
  media_type?: string;
  backdrop_path: string | null;
  current_season: number;
  current_episode: number;
  episode_title: string;
}

interface ExploreContent {
  trending: any[];
  recommendations: any[];
}

function DashboardContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "shows";
  
  const [shows, setShows] = useState<TrackedShowState[]>([]);
  const [showEmotionFor, setShowEmotionFor] = useState<number | null>(null);
  const [loadingShows, setLoadingShows] = useState(true);
  
  const [exploreData, setExploreData] = useState<ExploreContent>({ trending: [], recommendations: [] });
  const [loadingExplore, setLoadingExplore] = useState(false);
  
  const [upcomingMovies, setUpcomingMovies] = useState<any[]>([]);
  const [unreleasedMovieIds, setUnreleasedMovieIds] = useState<Set<number>>(new Set());
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load tracked shows from Supabase
  useEffect(() => {
    if (!user) return;

    const loadShows = async () => {
      try {
        const { data } = await getSupabase()
          .from("tracked_shows")
          .select("*, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (data) {
          setShows(
            data.map((row: Record<string, unknown>) => ({
              tmdb_id: row.tmdb_id as number,
              name: row.name as string,
              media_type: (row.media_type as string) || "tv",
              backdrop_path: row.backdrop_path as string | null,
              current_season: row.current_season as number,
              current_episode: row.current_episode as number,
              episode_title: (row.episode_title as string) || "Episode 1",
            }))
          );
          if (data.length === 0) {
            setShowImportPopup(true);
          }
        }
      } catch {
        // Table might not exist yet — that's ok
      }
      setLoadingShows(false);
    };

    loadShows();
  }, [user]);

  // Auto-sync: Advance or remove tracked shows that are already in watch_history
  useEffect(() => {
    if (!user || shows.length === 0) return;

    const autoSync = async () => {
      try {
        const { data: history } = await getSupabase()
          .from("watch_history")
          .select("tmdb_id, season_number, episode_number")
          .eq("user_id", user.id);

        if (!history) return;

        const historySet = new Set(
          history.map((h: any) => `${h.tmdb_id}_${h.season_number}_${h.episode_number}`)
        );

        let didSync = false;
        for (const show of shows) {
          if (show.media_type === "movie") continue;

          // If the episode currently tracked as "Up Next" is ALREADY in the user's watch history
          if (historySet.has(`${show.tmdb_id}_${show.current_season}_${show.current_episode}`)) {
            console.log(`Auto-syncing watched show: ${show.name} S${show.current_season}E${show.current_episode}`);
            handleWatched(show.tmdb_id, show.current_season, show.current_episode, show.media_type);
            didSync = true;
          }
        }
      } catch (e) {
        console.error("Auto-sync failed", e);
      }
    };

    autoSync();
    // We only want to run this once when shows are initially loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingShows]);

  // Load Explore Data
  useEffect(() => {
    if (tab === "explore" && exploreData.trending.length === 0 && !loadingExplore) {
      const loadExplore = async () => {
        setLoadingExplore(true);
        try {
          const trendingRes = await getTrendingTv();
          
          let recsRes: any = { results: [] };
          if (shows.length > 0) {
             const randomShow = shows[Math.floor(Math.random() * shows.length)];
             recsRes = await getTvRecommendations(randomShow.tmdb_id);
          }
          
          setExploreData({
            trending: trendingRes.results.slice(0, 6),
            recommendations: recsRes.results.slice(0, 6)
          });
        } catch {
          // fail silently
        }
        setLoadingExplore(false);
      };
      loadExplore();
    }
  }, [tab, shows, exploreData.trending.length, loadingExplore]);

  // Load Upcoming Movies from Tracked Movies
  useEffect(() => {
    if (tab === "movies" && shows.length > 0) {
      const loadUpcomingTracked = async () => {
        setLoadingUpcoming(true);
        try {
          const trackedMovies = shows.filter(s => s.media_type === "movie");
          const detailsPromises = trackedMovies.map(m => getMovieDetails(m.tmdb_id).catch(() => null));
          const moviesDetails = await Promise.all(detailsPromises);
          
          const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const upcoming = moviesDetails
            .filter(m => m && m.release_date && m.release_date > now)
            .sort((a, b) => (a?.release_date || "").localeCompare(b?.release_date || ""));
            
          setUpcomingMovies(upcoming);
          setUnreleasedMovieIds(new Set(upcoming.map(m => m?.id || 0)));
        } catch (e) {
          console.error("Failed to load upcoming", e);
        }
        setLoadingUpcoming(false);
      };
      loadUpcomingTracked();
    } else if (shows.length === 0) {
      setUpcomingMovies([]);
      setUnreleasedMovieIds(new Set());
    }
  }, [tab, shows]);

  // Save a tracked show to Supabase
  const saveShow = async (show: TrackedShowState) => {
    if (!user) return;
    try {
      // Use update instead of upsert to avoid constraint issues, 
      // since the show must already exist in tracked_shows
      await getSupabase().from("tracked_shows")
        .update({
          current_season: show.current_season,
          current_episode: show.current_episode,
          episode_title: show.episode_title,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("tmdb_id", show.tmdb_id);
    } catch {
      // silently fail
    }
  };



  const handleWatched = (tmdbId: number, season: number, episode: number, mediaType: string = "tv") => {
    setShowEmotionFor(tmdbId);

    // Record to watch_history
    if (user) {
      getSupabase()
        .from("watch_history")
        .insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: mediaType,
          season_number: season,
          episode_number: episode,
        })
        .then(() => {});
    }

    // If it's a movie, it's done. Remove from tracked_shows.
    if (mediaType === "movie") {
      setTimeout(() => {
        setShows((prev) => prev.filter((s) => s.tmdb_id !== tmdbId));
        if (user) {
          getSupabase()
            .from("tracked_shows")
            .delete()
            .eq("user_id", user.id)
            .eq("tmdb_id", tmdbId)
            .then(() => {});
        }
      }, 1200);
      return;
    }

    // Advance to next episode after a delay
    setTimeout(async () => {
      try {
        const eps = await getSeasonEpisodes(tmdbId, season);
        const nextEp = eps.episodes?.find(
          (e) => e.episode_number === episode + 1
        );

        if (nextEp) {
          setShows((prev) => {
            const updated = prev.map((s) =>
              s.tmdb_id === tmdbId
                ? {
                    ...s,
                    current_episode: nextEp.episode_number,
                    episode_title: nextEp.name,
                  }
                : s
            );
            const show = updated.find((s) => s.tmdb_id === tmdbId);
            if (show) saveShow(show);
            return updated;
          });
        } else {
          // Try next season
          const details = await getTvDetails(tmdbId);
          const nextSeason = details.seasons?.find(
            (s) => s.season_number === season + 1
          );
          if (nextSeason) {
            const nextEps = await getSeasonEpisodes(
              tmdbId,
              nextSeason.season_number
            );
            const firstEp = nextEps.episodes?.[0];
            setShows((prev) => {
              const updated = prev.map((s) =>
                s.tmdb_id === tmdbId
                  ? {
                      ...s,
                      current_season: nextSeason.season_number,
                      current_episode: firstEp?.episode_number ?? 1,
                      episode_title: firstEp?.name ?? "Episode 1",
                    }
                  : s
              );
              const show = updated.find((s) => s.tmdb_id === tmdbId);
              if (show) saveShow(show);
              return updated;
            });
          } else {
            // Show complete — remove from tracked and from DB
            setShows((prev) => prev.filter((s) => s.tmdb_id !== tmdbId));
            if (user) {
              getSupabase()
                .from("tracked_shows")
                .delete()
                .eq("user_id", user.id)
                .eq("tmdb_id", tmdbId)
                .then(() => {});
            }
          }
        }
      } catch {
        // keep as is on error
      }
    }, 1200);
  };

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
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">Trending</h2>
            {loadingExplore ? (
              <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {exploreData.trending.map((show) => (
                  <div key={show.id} onClick={() => router.push(`/shows/${show.id}`)} className="cursor-pointer hover:ring-2 hover:ring-accent-yellow rounded-xl overflow-hidden bg-card-surface">
                    {show.backdrop_path && (
                      <img src={`https://image.tmdb.org/t/p/w500${show.backdrop_path}`} alt={show.name} className="w-full h-24 object-cover opacity-80 hover:opacity-100" />
                    )}
                    <div className="p-3">
                      <h3 className="font-bold text-sm truncate">{show.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {exploreData.recommendations.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-text-primary mb-4">Since You Watched...</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {exploreData.recommendations.map((show) => (
                    <div key={show.id} onClick={() => router.push(`/shows/${show.id}`)} className="cursor-pointer hover:ring-2 hover:ring-accent-yellow rounded-xl overflow-hidden bg-card-surface">
                      {show.backdrop_path && (
                        <img src={`https://image.tmdb.org/t/p/w500${show.backdrop_path}`} alt={show.name} className="w-full h-24 object-cover opacity-80 hover:opacity-100" />
                      )}
                      <div className="p-3">
                        <h3 className="font-bold text-sm truncate">{show.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {(tab === "shows" || tab === "movies") && (
          <>
            {loadingShows ? (
              <div className="text-center py-20">
                <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : shows.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">{tab === "shows" ? "📺" : "🍿"}</div>
                <p className="text-text-muted text-lg mb-2">
                  No {tab} tracked yet
                </p>
                <p className="text-text-muted text-sm">
                  Search above to add and start tracking
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold mb-4">{tab === "movies" ? "Movies" : "Shows"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shows
                    .filter((s) => tab === "movies" ? (s.media_type === "movie" && !unreleasedMovieIds.has(s.tmdb_id)) : s.media_type !== "movie")
                    .map((show, index) => (
                    <div key={show.tmdb_id}>
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
                  ))}
                </div>
                
                {tab === "shows" && (
                  <div className="mt-12">
                    <h2 className="text-xl font-bold mb-4">Upcoming Episodes</h2>
                    <div className="bg-card-surface p-6 rounded-xl text-center">
                      <p className="text-text-muted text-sm">No upcoming episodes airing soon for your tracked shows.</p>
                    </div>
                  </div>
                )}

                {tab === "movies" && (
                  <div className="mt-12">
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
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Emotion overlay */}
      {showEmotionFor !== null && (
        <EmotionMatrix
          onSelect={() => setShowEmotionFor(null)}
          onClose={() => setShowEmotionFor(null)}
        />
      )}

      <BottomNav />
      
      {showImportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowImportPopup(false)}>
          <div className="bg-bg-primary border border-card-surface p-6 rounded-2xl max-w-lg w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-text-muted hover:text-white" onClick={() => setShowImportPopup(false)}>✕</button>
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
              <a href="https://tvtime.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl text-center font-bold flex-1 transition-colors">👉 Go to TV Time</a>
              <a href="/profile" className="bg-accent-yellow text-bg-primary hover:brightness-110 px-4 py-3 rounded-xl text-center font-bold flex-1 transition-colors">⚙️ Go to Profile</a>
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
