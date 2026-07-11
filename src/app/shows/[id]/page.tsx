"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getTvDetails, getSeasonEpisodes, backdropUrl, posterUrl } from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import UserReviewWidget from "@/components/UserReviewWidget";

type Tab = "about" | "episodes" | "cast";

interface Episode {
  episode_number: number;
  name: string;
  still_path: string | null;
  air_date: string | null;
}

export default function ShowDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const tmdbId = parseInt(params.id, 10);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [details, setDetails] = useState<any>(null);
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
  }, [tmdbId]);

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

  const handleTrackShow = async () => {
    if (!user || isTracked || !details) return;
    
    try {
      const firstSeason = details.seasons?.find((s: any) => s.season_number >= 1)?.season_number ?? 1;
      // We just insert. We already checked isTracked at the top.
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
              disabled={isTracked}
              className={`px-5 py-2.5 rounded-full font-bold transition-all flex items-center gap-2
                ${isTracked 
                  ? "bg-gray-800 text-accent-yellow border border-gray-700 opacity-80 cursor-default" 
                  : "bg-accent-yellow text-bg-primary hover:brightness-110"
                }`}
            >
              {isTracked ? (
                <>✓ Tracked</>
              ) : (
                <>+ Add Show</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Tabs */}
        <div className="flex border-b border-card-surface mb-6">
          <button
            onClick={() => setActiveTab("about")}
            className={`pb-3 px-6 font-bold text-sm tracking-wide transition-colors ${
              activeTab === "about" ? "border-b-2 border-accent-yellow text-white" : "text-text-muted hover:text-white"
            }`}
          >
            ABOUT
          </button>
          <button
            onClick={() => setActiveTab("episodes")}
            className={`pb-3 px-6 font-bold text-sm tracking-wide transition-colors ${
              activeTab === "episodes" ? "border-b-2 border-accent-yellow text-white" : "text-text-muted hover:text-white"
            }`}
          >
            EPISODES
          </button>
          <button
            onClick={() => setActiveTab("cast")}
            className={`pb-3 px-6 font-bold text-sm tracking-wide transition-colors ${
              activeTab === "cast" ? "border-b-2 border-accent-yellow text-white" : "text-text-muted hover:text-white"
            }`}
          >
            CAST
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "about" && (
        <div className="space-y-6">
          <UserReviewWidget tmdbId={tmdbId} mediaType="tv" />
          
          <div className="bg-card-surface p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Show Info</h2>
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
                  <span className="text-xl text-text-muted">
                    {expandedSeason === season.season_number ? "−" : "+"}
                  </span>
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
                          <div key={ep.episode_number} className="flex items-center px-5 py-3 hover:bg-white/5 transition-colors group">
                            <div className="flex-1">
                              <p className="font-semibold text-sm group-hover:text-white transition-colors">
                                {ep.episode_number}. {ep.name}
                              </p>
                              {ep.air_date && <p className="text-xs text-text-muted mt-1">{ep.air_date}</p>}
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
      </div>
      
      <BottomNav />
    </main>
  );
}
