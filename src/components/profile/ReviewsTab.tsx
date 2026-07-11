"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { useRouter } from "next/navigation";

interface ReviewItem {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  comment_text?: string;
  rating_value?: string;
  created_at: string;
  name: string;
  poster_path: string | null;
}

export default function ReviewsTab({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      
      const { data: comments } = await supabase
        .from("user_comments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
        
      const { data: ratings } = await supabase
        .from("user_ratings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const rawItems = [...(comments || []), ...(ratings || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const enriched = await Promise.all(
        rawItems.map(async (item) => {
          try {
            if (item.media_type === "movie") {
              const details = await getMovieDetails(item.tmdb_id);
              return {
                ...item,
                name: details.title,
                poster_path: details.poster_path,
              };
            } else {
              const details = await getTvDetails(item.tmdb_id);
              return {
                ...item,
                name: details.name,
                poster_path: details.poster_path,
              };
            }
          } catch (e) {
            return null;
          }
        })
      );
      
      // Deduplicate by tmdb_id just for UI presentation (merging rating + comment)
      const merged = new Map<string, ReviewItem>();
      for (const item of enriched.filter(x => x !== null) as ReviewItem[]) {
          const key = `${item.media_type}_${item.tmdb_id}`;
          if (merged.has(key)) {
              const existing = merged.get(key)!;
              if (item.comment_text) existing.comment_text = item.comment_text;
              if (item.rating_value) existing.rating_value = item.rating_value;
          } else {
              merged.set(key, item);
          }
      }

      setReviews(Array.from(merged.values()));
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return <div className="p-8 text-center text-text-muted">No reviews or ratings found.</div>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={`${review.media_type}_${review.tmdb_id}`}
          onClick={() => router.push(review.media_type === "movie" ? `/movies/${review.tmdb_id}` : `/shows/${review.tmdb_id}`)}
          className="flex gap-4 p-4 rounded-xl bg-card-surface border border-white/5 cursor-pointer hover:bg-card-surface/80 transition-colors shadow-sm backdrop-blur-md"
        >
          {review.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w200${review.poster_path}`}
              alt={review.name}
              className="w-16 h-24 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-24 rounded bg-bg-primary flex-shrink-0 flex items-center justify-center text-xs text-text-muted text-center p-1">
              {review.name}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-primary text-lg truncate">{review.name}</h3>
            {review.rating_value && (
              <div className="text-accent-yellow font-medium mt-1 mb-2">
                ⭐ {review.rating_value}/10
              </div>
            )}
            {review.comment_text && (
              <p className="text-text-muted text-sm line-clamp-3 bg-bg-primary/50 p-2 rounded-lg italic">
                "{review.comment_text}"
              </p>
            )}
            {!review.comment_text && !review.rating_value && (
                <p className="text-text-muted text-sm italic">Rated</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
