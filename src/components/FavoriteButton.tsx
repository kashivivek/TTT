"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

interface FavoriteButtonProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  onRequireAuth: () => boolean;
}

export default function FavoriteButton({ tmdbId, mediaType, onRequireAuth }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .limit(1)
      .then(({ data }) => setIsFavorite(!!data && data.length > 0));
  }, [user, tmdbId, mediaType]);

  const toggle = async () => {
    if (!onRequireAuth() || !user || busy) return;
    setBusy(true);
    const db = getSupabase();
    const next = !isFavorite;
    setIsFavorite(next);
    const { error } = next
      ? await db.from("user_favorites").insert({ user_id: user.id, tmdb_id: tmdbId, media_type: mediaType })
      : await db.from("user_favorites").delete().eq("user_id", user.id).eq("tmdb_id", tmdbId).eq("media_type", mediaType);
    if (error) setIsFavorite(!next);
    else if (next) track("favorite", { media_type: mediaType });
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={isFavorite}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border transition-colors ${
        isFavorite ? "bg-red-500/20 border-red-500/50" : "bg-gray-800 border-gray-700 hover:border-red-500/50"
      }`}
    >
      {isFavorite ? "❤️" : "🤍"}
    </button>
  );
}
