"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { useRouter } from "next/navigation";

interface FavoriteShow {
  tmdb_id: number;
  media_type: "movie" | "tv";
  name: string;
  poster_path: string | null;
}

export default function FavoritesTab({ userId }: { userId: string }) {
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data } = await getSupabase()
        .from("user_favorites")
        .select("tmdb_id, media_type")
        .eq("user_id", userId);

      if (data) {
        const enriched = await Promise.all(
          data.map(async (item) => {
            try {
              if (item.media_type === "movie") {
                const details = await getMovieDetails(item.tmdb_id);
                return {
                  tmdb_id: item.tmdb_id,
                  media_type: "movie" as const,
                  name: details.title,
                  poster_path: details.poster_path,
                };
              } else {
                const details = await getTvDetails(item.tmdb_id);
                return {
                  tmdb_id: item.tmdb_id,
                  media_type: "tv" as const,
                  name: details.name,
                  poster_path: details.poster_path,
                };
              }
            } catch (e) {
              return null;
            }
          })
        );
        setFavorites(enriched.filter((x) => x !== null) as FavoriteShow[]);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">Loading favorites...</div>;
  }

  if (favorites.length === 0) {
    return <div className="p-8 text-center text-text-muted">No favorites found.</div>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {favorites.map((show) => (
        <div
          key={`${show.media_type}_${show.tmdb_id}`}
          onClick={() => router.push(show.media_type === "movie" ? `/movies/${show.tmdb_id}` : `/shows/${show.tmdb_id}`)}
          className="aspect-[2/3] rounded-lg overflow-hidden bg-card-surface relative group cursor-pointer hover:ring-2 hover:ring-accent-yellow transition-all shadow-md"
        >
          {show.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
              alt={show.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
              {show.name}
            </div>
          )}
          <div className="absolute top-2 right-2 text-red-500 bg-bg-primary/80 rounded-full p-1 shadow-lg backdrop-blur-sm text-sm">
             ❤️
          </div>
        </div>
      ))}
    </div>
  );
}
