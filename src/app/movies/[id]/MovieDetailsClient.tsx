"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getMovieWatchProviders,
  backdropUrl,
  posterUrl,
  logoUrl,
} from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import BottomNav from "@/components/BottomNav";
import WatchCountrySelector from "@/components/WatchCountrySelector";
import ReviewEditor from "@/components/ReviewEditor";
import CommunityTab from "@/components/CommunityTab";
import FavoriteButton from "@/components/FavoriteButton";

type Tab = "about" | "cast" | "community";

export default function MovieDetailsClient({ tmdbId, initialDetails }: { tmdbId: number; initialDetails: any }) {
  const { user } = useAuth();
  const router = useRouter();

  const [details] = useState<any>(initialDetails);
  const [providers, setProviders] = useState<any | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [preferredCountry, setPreferredCountry] = useState<string | null>(null);
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isTracked, setIsTracked] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    getMovieWatchProviders(tmdbId).then(setProviders).catch(() => setProviders(null));
  }, [tmdbId]);

  const requireUser = () => {
    if (user) return true;
    track("signup_prompt", { source: "movie_page" });
    router.push(`/signup?next=${encodeURIComponent(`/movies/${tmdbId}`)}`);
    return false;
  };

  useEffect(() => {
    if (!user) return;

    const loadPreference = async () => {
      const db = getSupabase();
      const { data, error } = await db
        .from("user_preferences")
        .select("watch_country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data?.watch_country) {
        setPreferredCountry(data.watch_country);
        setSelectedCountry(null);
      }
    };

    loadPreference().catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!providers) return;
    const availableRegions = Object.keys(providers.results || {});
    const defaultCountry = preferredCountry && availableRegions.includes(preferredCountry)
      ? preferredCountry
      : availableRegions.includes("US")
        ? "US"
        : availableRegions[0] || null;

    if (defaultCountry && !selectedCountry) {
      setSelectedCountry(defaultCountry);
    }
  }, [providers, preferredCountry, selectedCountry]);

  // Load tracking status and watched history
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      const db = getSupabase();
      
      // Check if tracked
      const { data: trackData } = await db
        .from("tracked_shows")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .maybeSingle();
        
      if (trackData) setIsTracked(true);

      // Load watch history for this movie
      const { data: history } = await db
        .from("watch_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", "movie")
        .limit(1);
        
      if (history && history.length > 0) {
        setIsWatched(true);
      }
    };
    
    loadUserData();
  }, [user, tmdbId]);

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    if (!user) return;

    setIsSavingCountry(true);
    try {
      await getSupabase().from("user_preferences").upsert(
        {
          user_id: user.id,
          watch_country: country,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setPreferredCountry(country);
    } catch (err) {
      console.error("Failed to save watch country", err);
    } finally {
      setIsSavingCountry(false);
    }
  };

  const movieRow = (mediaType: "movie" | "completed_movie") => ({
    user_id: user!.id,
    tmdb_id: tmdbId,
    name: details.title,
    media_type: mediaType,
    backdrop_path: details.backdrop_path,
    current_season: 0,
    current_episode: 0,
    episode_title: "",
    updated_at: new Date().toISOString(),
  });

  const handleTrackShow = async () => {
    if (!requireUser() || !details) return;
    const db = getSupabase();

    try {
      if (isTracked) {
        if (!window.confirm(`Remove ${details.title} from your movies? Your watch history is kept.`)) return;
        await db.from("tracked_shows").delete().eq("user_id", user!.id).eq("tmdb_id", tmdbId);
        setIsTracked(false);
        track("untrack_show", { media_type: "movie" });
      } else {
        await db
          .from("tracked_shows")
          .upsert(movieRow(isWatched ? "completed_movie" : "movie"), { onConflict: "user_id,tmdb_id" });
        setIsTracked(true);
        track("track_show", { media_type: "movie" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleWatched = async () => {
    if (!requireUser()) return;
    const db = getSupabase();

    try {
      if (isWatched) {
        await db.from("watch_history")
          .delete()
          .eq("user_id", user!.id)
          .eq("tmdb_id", tmdbId)
          .eq("media_type", "movie");
        setIsWatched(false);

        if (isTracked) {
          await db.from("tracked_shows")
            .update({ media_type: "movie", updated_at: new Date().toISOString() })
            .eq("user_id", user!.id)
            .eq("tmdb_id", tmdbId);
        }
      } else {
        await db.from("watch_history").insert({
          user_id: user!.id,
          tmdb_id: tmdbId,
          media_type: "movie",
          watched_at: new Date().toISOString(),
        });
        setIsWatched(true);
        track("mark_watched", { media_type: "movie", source: "movie_page" });

        await db.from("tracked_shows").upsert(movieRow("completed_movie"), { onConflict: "user_id,tmdb_id" });
        setIsTracked(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative h-64 sm:h-80 w-full">
        {details.backdrop_path ? (
          <img 
            src={backdropUrl(details.backdrop_path)} 
            alt={details.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-4 pb-4">
          <div className="max-w-5xl mx-auto flex items-end justify-between">
            <div>
              <button 
                onClick={() => (window.history.length > 1 ? router.back() : router.push(user ? "/dashboard?tab=movies" : "/"))} 
                className="mb-4 text-text-muted hover:text-white flex items-center gap-2"
              >
                ← Back
              </button>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2">{details.title}</h1>
              <p className="text-text-muted text-sm sm:text-base">
                {details.status}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <FavoriteButton tmdbId={tmdbId} mediaType="movie" onRequireAuth={requireUser} />
              <button
                onClick={handleTrackShow}
                title={isTracked ? "Remove from your movies" : "Add to your movies"}
                className={`px-5 py-2.5 rounded-full font-bold transition-all flex items-center gap-2
                  ${isTracked
                    ? "bg-gray-800 text-accent-yellow border border-gray-700 hover:border-red-900 hover:text-red-400"
                    : "bg-accent-yellow text-bg-primary hover:brightness-110"
                  }`}
              >
                {isTracked ? <>✓ Tracking</> : <>+ Add Movie</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Tabs */}
        <div className="flex border-b border-card-surface mb-6 overflow-x-auto">
          {(["about", "cast", "community"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-6 font-bold text-sm tracking-wide transition-colors ${
                activeTab === tab ? "border-b-2 border-accent-yellow text-white" : "text-text-muted hover:text-white"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "about" && (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="bg-card-surface p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">About the Movie</h2>
              <div className="flex gap-4 items-start">
                {details.poster_path && (
                  <img src={posterUrl(details.poster_path)} alt="Poster" className="w-24 rounded-lg hidden sm:block" />
                )}
                <div>
                  <p className="text-text-muted text-sm mb-2">
                    {details.release_date ? details.release_date.split("-")[0] : ""} • {details.genres?.map((g: any) => g.name).join(", ")}
                  </p>
                  <p className="text-sm leading-relaxed">{details.overview || "No overview available."}</p>
                </div>
              </div>
            </div>

            <div className="bg-card-surface p-6 rounded-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold">Reviews</h2>
                <span className="text-sm text-text-muted">Optional</span>
              </div>
              <div className="space-y-4">
                <ReviewEditor tmdbId={tmdbId} mediaType="movie" />
              </div>
            </div>
          </div>

          <div className="bg-card-surface p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold">Where to Watch</h2>
                <p className="text-sm text-text-muted">Your preferred region is shown here.</p>
              </div>
              <WatchCountrySelector
                providers={providers}
                value={selectedCountry}
                onChange={handleCountryChange}
              />
            </div>
            {!providers ? (
              <p className="text-text-muted">Loading providers...</p>
            ) : Object.keys(providers.results || {}).length === 0 ? (
              <p className="text-text-muted">No provider data available.</p>
            ) : (
              <>
                {selectedCountry && providers.results[selectedCountry] ? (
                  <div className="space-y-4">
                    <p className="text-sm text-text-muted mb-2">
                      Showing providers for <strong>{selectedCountry}</strong>{isSavingCountry ? " — saving..." : ""}
                    </p>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {( ["flatrate", "rent", "buy"] as const ).map((tier) => {
                        const items = providers.results[selectedCountry][tier];
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={tier} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{tier === "flatrate" ? "Streaming" : tier === "rent" ? "Rent" : "Buy"}</p>
                            <div className="grid gap-2">
                              {items.map((provider: any) => (
                                <a
                                  key={provider.provider_id}
                                  href={providers.results[selectedCountry]?.link || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl transition hover:bg-white/10"
                                >
                                  {provider.logo_path ? (
                                    <img src={logoUrl(provider.logo_path)} alt={provider.provider_name} className="w-6 h-6 object-contain" />
                                  ) : null}
                                  <span className="text-xs">{provider.provider_name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-text-muted">Selected country has no provider data.</p>
                )}
              </>
            )}
          </div>

          <div className="bg-card-surface p-6 rounded-xl flex items-center justify-between">
            <div>
               <h3 className="font-bold text-lg">Mark as Watched</h3>
               <p className="text-text-muted text-sm">Add this movie to your watch history</p>
            </div>
            <button
               onClick={toggleWatched}
               className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                 isWatched 
                   ? "bg-accent-yellow text-black" 
                   : "bg-white/10 hover:bg-white/20 text-transparent hover:text-white"
               }`}
             >
               ✓
            </button>
          </div>
          </div>
        )}

        {activeTab === "cast" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {details.credits?.cast?.map((actor: any) => (
              <div key={actor.id} className="bg-card-surface rounded-xl overflow-hidden text-center hover:ring-2 hover:ring-accent-yellow transition-all">
                {actor.profile_path ? (
                  <img src={posterUrl(actor.profile_path)} alt={actor.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-text-muted text-3xl">?</div>
                )}
                <div className="p-3">
                  <p className="font-bold text-sm truncate" title={actor.name}>{actor.name}</p>
                  <p className="text-xs text-text-muted truncate mt-1" title={actor.character}>{actor.character}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "community" && (
          <div className="space-y-6">
            <CommunityTab tmdbId={tmdbId} mediaType="movie" />
          </div>
        )}
      </div>
      
      <BottomNav />
    </main>
  );
}
