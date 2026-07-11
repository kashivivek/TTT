"use client";

import { useState, useEffect } from "react";
import CheckCircle from "./CheckCircle";
import { useRouter } from "next/navigation";
import { backdropUrl } from "@/lib/tmdb";

interface ShowCardProps {
  tmdbId: number;
  name: string;
  backdropPath: string | null;
  currentSeason: number;
  currentEpisode: number;
  episodeTitle: string;
  mediaType?: string;
  onWatched: (tmdbId: number, season: number, episode: number, mediaType?: string) => void;
}

export default function ShowCard({
  tmdbId,
  name,
  backdropPath,
  currentSeason,
  currentEpisode,
  episodeTitle,
  mediaType = "tv",
  onWatched,
}: ShowCardProps) {
  const [checked, setChecked] = useState(false);
  const [exiting, setExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setChecked(false);
    setExiting(false);
  }, [currentSeason, currentEpisode]);

  const handleCheck = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setChecked(true);
    onWatched(tmdbId, currentSeason, currentEpisode, mediaType);
    setTimeout(() => setExiting(true), 600);
  };

  return (
    <div
      onClick={() => router.push(mediaType === "movie" ? `/movies/${tmdbId}` : `/shows/${tmdbId}`)}
      className={`
        relative w-full h-36 sm:h-44 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-yellow/50 transition-all
        ${exiting ? "card-exit" : ""}
      `}
    >
      {/* Backdrop image */}
      {backdropPath && (
        <img
          src={backdropUrl(backdropPath)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(20,20,20,0.95), rgba(20,20,20,0.4))",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between h-full px-5">
        {/* Left: show info */}
        <div className="flex flex-col gap-1 max-w-[70%]">
          {mediaType === "movie" ? (
            <span className="text-accent-yellow font-bold text-sm tracking-wide">
              Movie
            </span>
          ) : (
            <span className="text-accent-yellow font-bold text-sm tracking-wide">
              S{String(currentSeason).padStart(2, "0")} | E{String(currentEpisode).padStart(2, "0")}
            </span>
          )}
          <h2 className="text-white font-bold text-lg leading-tight truncate">
            {name}
          </h2>
          {mediaType !== "movie" && episodeTitle && (
            <p className="text-text-muted text-xs truncate mt-1">
              {episodeTitle}
            </p>
          )}
        </div>

        {/* Right: check circle */}
        <CheckCircle checked={checked} onCheck={handleCheck} />
      </div>
    </div>
  );
}
