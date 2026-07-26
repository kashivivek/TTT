"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getTvDetails,
  getSeasonEpisodes,
  getTvWatchProviders,
  backdropUrl,
  posterUrl,
  logoUrl,
  sortWatchProviderRegions,
} from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import UserReviewWidget from "@/components/UserReviewWidget";
import WatchCountrySelector from "@/components/WatchCountrySelector";
import ReviewEditor from "@/components/ReviewEditor";
import CommunityTab from "@/components/CommunityTab";

type Tab = "about" | "episodes" | "cast" | "community";

interface Episode {
  episode_number: number;
  name: string;
  still_path: string | null;
  air_date: string | null;
  overview?: string;
}

export default function ShowDetailsPage() {
  const params = useParams();
  const tmdbId = parseInt(params.id as string, 10);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [details, setDetails] = useState<any>(null);
  const [providers, setProviders] = useState<any | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [preferredCountry, setPreferredCountry] = useState<string | null>(null);
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isTracked, setIsTracked] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  
  // For episodes tab
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [seasonData, setSeasonData] = useState<Record<number, Episode[]>>({});
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Load basic details
  useEffect(() => {
    getTvDetails(tmdbId).then(setDetails).catch(console.error);
    getTvWatchProviders(tmdbId).then(setProviders).catch(() => setProviders(null));
  }, [tmdbId]);

  useEffect(() => {
    if (!user) return;

    const loadPreference = async () => {
      const db = getSupabase();
      const { data, error } = await db
        .from("user_preferences")
        .select("watch_country")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.watch_country) {
        setPreferredCountry(data.watch_country);
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

    if (defaultCountry && defaultCountry !== selectedCountry) {
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
        .single();
        
      if (trackData) setIsTracked(true);

      // Load watch history for this show
      const { data: history } = await db
        .from("watch_history")
        .select("season_number, episode_number")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId);
        
      if (history) {
        const watched = new Set(history.map((h: any) => `${h.season_number}-${h.episode_number}`));
        setWatchedEpisodes(watched);
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

  const handleTrackShow = async () => {
    if (!user || !details) return;
    
    try {
      if (isTracked) {
        await getSupabase().from("tracked_shows")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_id", tmdbId);
        setIsTracked(false);
      } else {
        const firstSeason = details.seasons?.find((s: any) => s.season_number >= 1)?.season_number ?? 1;
        await getSupabase().from("tracked_shows").insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          name: details.name,
          media_type: "tv",
          backdrop_path: details.backdrop_path,
          current_season: firstSeason,
          current_episode: 1,
          episode_title: "Episode 1",
          updated_at: new Date().toISOString(),
        });
        setIsTracked(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExpandSeason = async (seasonNum: number) => {
    if (expandedSeason === seasonNum) {
      setExpandedSeason(null);
      return;
    }
    
    setExpandedSeason(seasonNum);
    
    if (!seasonData[seasonNum]) {
      setLoadingSeason(true);
      try {
        const data = await getSeasonEpisodes(tmdbId, seasonNum);
        setSeasonData(prev => ({ ...prev, [seasonNum]: data.episodes || [] }));
      } catch (e) {
        console.error(e);
      }
      setLoadingSeason(false);
    }
  };

  const handleMarkSeasonWatched = async (e: React.MouseEvent, seasonNum: number) => {
    e.stopPropagation();
    if (!user) return;
    
    // First, ensure we have the episode data for this season
    let eps = seasonData[seasonNum];
    if (!eps) {
      try {
        const data = await getSeasonEpisodes(tmdbId, seasonNum);
        eps = data.episodes || [];
        setSeasonData(prev => ({ ...prev, [seasonNum]: eps }));
      } catch (err) {
        console.error(err);
        return;
      }
    }

    if (!eps || eps.length === 0) return;

    const allWatched = eps.every((ep: Episode) => watchedEpisodes.has(`${seasonNum}-${ep.episode_number}`));

    const db = getSupabase();
    
    try {
      if (allWatched) {
        const episodeNumbers = eps.map((e: Episode) => e.episode_number);
        await db.from("watch_history")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_id", tmdbId)
          .eq("season_number", seasonNum)
          .in("episode_number", episodeNumbers);
          
        setWatchedEpisodes(prev => {
          const next = new Set(prev);
          eps.forEach((ep: Episode) => next.delete(`${seasonNum}-${ep.episode_number}`));
          return next;
        });
      } else {
        // Build rows to insert
        const rows = eps.map((ep: Episode) => ({
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: "tv",
          season_number: seasonNum,
          episode_number: ep.episode_number
        }));

        // Upsert to avoid duplicate key errors
        await db.from("watch_history").upsert(rows, { onConflict: "user_id, tmdb_id, season_number, episode_number" });
        
        // Update local state
        setWatchedEpisodes(prev => {
          const next = new Set(prev);
          eps.forEach((ep: Episode) => next.add(`${seasonNum}-${ep.episode_number}`));
          return next;
        });

        if (!isTracked) {
          // Temporarily set isTracked to true locally to avoid infinite recursion or duplicate tracks
          setIsTracked(true);
          const firstSeason = details?.seasons?.find((s: any) => s.season_number >= 1)?.season_number ?? 1;
          await db.from("tracked_shows").insert({
            user_id: user.id,
            tmdb_id: tmdbId,
            name: details?.name,
            media_type: "tv",
            backdrop_path: details?.backdrop_path,
            current_season: seasonNum,
            current_episode: eps[eps.length - 1].episode_number,
            episode_title: "Episode " + eps[eps.length - 1].episode_number,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Point tracked_shows to the last episode of this season
          await db.from("tracked_shows").update({
            current_season: seasonNum,
            current_episode: eps[eps.length - 1].episode_number,
            updated_at: new Date().toISOString()
          }).eq("user_id", user.id).eq("tmdb_id", tmdbId);
        }
      }
    } catch (err) {
      console.error("Failed to mark season", err);
    }
  };

  const toggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!user) return;
    
    const key = `${seasonNum}-${episodeNum}`;
    const db = getSupabase();
    const isWatched = watchedEpisodes.has(key);
    
    try {
      if (isWatched) {
        // Unwatch
        await db.from("watch_history")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_id", tmdbId)
          .eq("season_number", seasonNum)
          .eq("episode_number", episodeNum);
          
        setWatchedEpisodes(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        // Watch
        await db.from("watch_history").insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: "tv",
          season_number: seasonNum,
          episode_number: episodeNum
        });
        
        setWatchedEpisodes(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });

        // If not tracked yet, track it implicitly
        if (!isTracked) {
          handleTrackShow();
        } else {
          // Naive update to tracked_shows current pointer
          await db.from("tracked_shows").update({
            current_season: seasonNum,
            current_episode: episodeNum,
            updated_at: new Date().toISOString()
          }).eq("user_id", user.id).eq("tmdb_id", tmdbId);
        }
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
            alt={details.name}
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
                onClick={() => router.back()} 
                className="mb-4 text-text-muted hover:text-white flex items-center gap-2"
              >
                ← Back
              </button>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2">{details.name}</h1>
              <p className="text-text-muted text-sm sm:text-base">
                {details.seasons?.length || 0} seasons • {details.status}
              </p>
            </div>
            
            <button
              onClick={handleTrackShow}
              className={`px-5 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 group
                ${isTracked 
                  ? "bg-gray-800 text-accent-yellow border border-gray-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900" 
                  : "bg-accent-yellow text-bg-primary hover:brightness-110"
                }`}
            >
              {isTracked ? (
                <><span className="group-hover:hidden">✓ Tracked</span><span className="hidden group-hover:block">Untrack</span></>
              ) : (
                <>+ Add Show</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Tabs */}
        <div className="flex border-b border-card-surface mb-6 overflow-x-auto">
          {(["about", "episodes", "cast", "community"] as const).map((tab) => (
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
              <h2 className="text-xl font-bold mb-4">About the Show</h2>
              <div className="flex gap-4 items-start">
                {details.poster_path && (
                  <img src={posterUrl(details.poster_path)} alt="Poster" className="w-24 rounded-lg hidden sm:block" />
                )}
                <div>
                  <p className="text-text-muted text-sm mb-2">
                    {details.first_air_date ? details.first_air_date.split("-")[0] : ""} • {details.genres?.map((g: any) => g.name).join(", ")}
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
                <ReviewEditor tmdbId={tmdbId} mediaType="tv" />
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
        </div>
        )}

        {activeTab === "episodes" && (
          <div className="space-y-3">
            {details.seasons?.filter((s: any) => s.season_number > 0).map((season: any) => (
              <div key={season.season_number} className="bg-card-surface rounded-xl overflow-hidden">
                <button
                  onClick={() => handleExpandSeason(season.season_number)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">{season.name}</span>
                    <span className="text-xs text-text-muted">{season.episode_count} episodes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleMarkSeasonWatched(e, season.season_number)}
                      title="Toggle season watched status"
                      className={`w-8 h-8 rounded-full hover:text-black flex items-center justify-center transition-colors ${
                        (Array.from(watchedEpisodes).filter(id => id.startsWith(`${season.season_number}-`)).length >= season.episode_count) && season.episode_count > 0
                          ? "bg-accent-yellow text-black"
                          : "bg-white/5 hover:bg-accent-yellow text-text-muted"
                      }`}
                    >
                      ✓
                    </button>
                    <span className="text-xl text-text-muted w-8 text-center">
                      {expandedSeason === season.season_number ? "−" : "+"}
                    </span>
                  </div>
                </button>
                
                {expandedSeason === season.season_number && (
                  <div className="border-t border-white/5 divide-y divide-white/5 bg-black/20">
                    {loadingSeason && !seasonData[season.season_number] ? (
                      <div className="p-6 text-center text-text-muted text-sm">Loading episodes...</div>
                    ) : (
                      seasonData[season.season_number]?.map((ep) => {
                        const key = `${season.season_number}-${ep.episode_number}`;
                        const isWatched = watchedEpisodes.has(key);
                        
                        return (
                          <div key={ep.episode_number} className="px-5 py-3 hover:bg-white/5 transition-colors group rounded-xl">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-white transition-colors">
                                  {ep.episode_number}. {ep.name}
                                </p>
                                {ep.air_date && <p className="text-xs text-text-muted mt-1">{ep.air_date}</p>}
                                {ep.overview && <p className="text-xs text-text-muted mt-2 line-clamp-3">{ep.overview}</p>}
                              </div>
                              <button
                                onClick={() => toggleEpisode(season.season_number, ep.episode_number)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isWatched 
                                    ? "bg-accent-yellow text-black" 
                                    : "bg-white/10 hover:bg-white/20 text-transparent hover:text-white"
                                }`}
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
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
          <CommunityTab tmdbId={tmdbId} mediaType="tv" />
        )}
      </div>
      
      <BottomNav />
    </main>
  );
}
