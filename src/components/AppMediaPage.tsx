"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { tmdbFetch } from "@/lib/tmdb";
import ShowDetailsClient from "@/app/shows/[id]/ShowDetailsClient";
import MovieDetailsClient from "@/app/movies/[id]/MovieDetailsClient";

/** App-bundle version of /shows/[id] and /movies/[id]: one static page that loads the title from ?id=. */
function MediaDetails({ type }: { type: "tv" | "movie" }) {
  const id = Number.parseInt(useSearchParams().get("id") || "", 10);
  const [details, setDetails] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setFailed(true);
      return;
    }
    setDetails(null);
    setFailed(false);
    tmdbFetch<any>(`/${type}/${id}?append_to_response=credits`)
      .then(setDetails)
      .catch(() => setFailed(true));
  }, [id, type]);

  if (failed) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-text-muted">Couldn&apos;t load this title. Check your connection and try again.</p>
        <Link href="/dashboard" className="text-accent-yellow font-semibold">Back to dashboard</Link>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }
  return type === "tv" ? (
    <ShowDetailsClient key={id} tmdbId={id} initialDetails={details} />
  ) : (
    <MovieDetailsClient key={id} tmdbId={id} initialDetails={details} />
  );
}

export default function AppMediaPage({ type }: { type: "tv" | "movie" }) {
  return (
    <Suspense fallback={null}>
      <MediaDetails type={type} />
    </Suspense>
  );
}
