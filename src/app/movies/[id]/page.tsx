"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getMovieDetails, backdropUrl, posterUrl } from "@/lib/tmdb";
import { getSupabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import UserReviewWidget from "@/components/UserReviewWidget";

type Tab = "about" | "cast";

export default function MovieDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const tmdbId = parseInt(params.id, 10);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [details, setDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isTracked, setIsTracked] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    getMovieDetails(tmdbId).then(setDetails).catch(console.error);
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

  const handleTrackShow = async () => {
    if (!user || isTracked || !details) return;
    
    try {
      // We just insert. We already checked isTracked at the top, 
      // but to be absolutely safe from constraints without onConflict, we can just insert.
      await getSupabase().from("tracked_shows").insert({
        user_id: user.id,
        tmdb_id: tmdbId,
        name: details.title,
        media_type: "movie",
        backdrop_path: details.backdrop_path,
        current_season: 0,
        current_episode: 0,
        episode_title: "",
        updated_at: new Date().toISOString(),
      });
      setIsTracked(true);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleWatched = async () => {
    if (!user) return;
    
    const db = getSupabase();
    
    try {
      if (isWatched) {
        // Unwatch
        await db.from("watch_history")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_id", tmdbId)
          .eq("media_type", "movie");
          
        setIsWatched(false);
      } else {
        // Watch
        await db.from("watch_history").insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: "movie",
        });
        
        setIsWatched(true);

        if (isTracked) {
          // If it was tracked, update its media_type to completed_movie
          await db.from("tracked_shows")
            .update({
              media_type: "completed_movie",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id)
            .eq("tmdb_id", tmdbId);
        } else {
          // If it wasn't tracked, insert it as completed_movie so it shows in Completed
          await db.from("tracked_shows").insert({
            user_id: user.id,
            tmdb_id: tmdbId,
            name: details.title,
            media_type: "completed_movie",
            backdrop_path: details.backdrop_path,
            current_season: 0,
            current_episode: 0,
            episode_title: "",
            updated_at: new Date().toISOString(),
          });
          setIsTracked(true);
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
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2">{details.title}</h1>
              <p className="text-text-muted text-sm sm:text-base">
                {details.status}
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
                <>+ Add Movie</>
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
          <UserReviewWidget tmdbId={tmdbId} mediaType="movie" />
          
          <div className="bg-card-surface p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Movie Info</h2>
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
      </div>
      
      <BottomNav />
    </main>
  );
}
