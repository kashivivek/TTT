"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface ReviewData {
  rating?: string;
  comment?: string;
  emotion?: string; // only for TV shows usually
  favorite?: boolean;
}

export default function UserReviewWidget({ tmdbId, mediaType }: { tmdbId: number, mediaType: "movie" | "tv" }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchReview() {
      const db = getSupabase();
      
      const { data: ratingData } = await db.from("user_ratings")
        .select("rating_value")
        .eq("user_id", user!.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .limit(1)
        .single();
        
      const { data: commentData } = await db.from("user_comments")
        .select("comment_text")
        .eq("user_id", user!.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .limit(1)
        .single();
        
      const { data: favData } = await db.from("user_favorites")
        .select("id")
        .eq("user_id", user!.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .limit(1)
        .single();

      if (ratingData || commentData || favData) {
        setData({
          rating: ratingData?.rating_value,
          comment: commentData?.comment_text,
          favorite: !!favData
        });
      }
      setLoading(false);
    }
    
    fetchReview();
  }, [user, tmdbId, mediaType]);

  if (loading || !data) return null;

  return (
    <div className="mt-8 mb-6 p-6 rounded-2xl bg-card-surface border border-white/10 shadow-lg relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-yellow to-orange-500" />
      
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-text-primary">My Review</h3>
        {data.favorite && (
          <span className="text-red-500 text-xl ml-2 animate-bounce" title="Favorite">❤️</span>
        )}
      </div>
      
      {data.rating && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⭐</span>
          <span className="text-lg font-bold text-accent-yellow">{data.rating} <span className="text-sm text-text-muted">/ 10</span></span>
        </div>
      )}
      
      {data.comment && (
        <p className="text-text-primary italic leading-relaxed border-l-4 border-accent-yellow/50 pl-4 bg-bg-primary/30 p-3 rounded-r-lg">
          "{data.comment}"
        </p>
      )}
    </div>
  );
}
