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
      
      const { data: reviewData } = await db.from("user_ratings")
        .select("rating_value, review_text")
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

      if (reviewData || favData) {
        setData({
          rating: reviewData?.rating_value,
          comment: reviewData?.review_text,
          favorite: !!favData
        });
      }
      setLoading(false);
    }
    
    fetchReview();
  }, [user, tmdbId, mediaType]);

  if (loading || !data) return null;

  const ratingNumber = data.rating ? Number(data.rating) : 0;
  const effectiveRating = Math.min(5, ratingNumber);
  const filledStars = Math.round(effectiveRating);
  const emptyStars = 5 - filledStars;

  return (
    <div className="mt-8 mb-6 p-6 rounded-2xl bg-card-surface border border-white/10 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-yellow to-orange-500" />
      
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-text-primary">My Review</h3>
        {data.favorite && (
          <span className="text-red-500 text-xl ml-2 animate-bounce" title="Favorite">❤️</span>
        )}
      </div>
      
      {data.rating && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_, index) => {
              const fill = Math.min(Math.max(ratingNumber - index, 0), 1);

              return (
                <div key={index} className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-text-muted shadow-sm shadow-black/10">
                  <span className="text-3xl">★</span>
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden text-3xl text-accent-yellow"
                    style={{ width: `${fill * 100}%` }}
                  >
                    ★
                  </span>
                </div>
              );
            })}
          </div>
          <span className="text-lg font-bold text-accent-yellow">{effectiveRating.toFixed(1)} <span className="text-sm text-text-muted">/ 5</span></span>
        </div>
      )}
      
      {data.comment && (
        <div className="rounded-2xl border border-white/10 bg-bg-primary/30 p-4">
          <p className="text-text-primary italic leading-relaxed">{data.comment}</p>
        </div>
      )}
    </div>
  );
}
