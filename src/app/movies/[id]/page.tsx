import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tmdbServer } from "@/lib/tmdb-server";
import MovieDetailsClient from "./MovieDetailsClient";

export const revalidate = 86400;

// Pages are generated on first request and cached for a day.
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ id: string }>;

async function getMovie(id: string) {
  const tmdbId = Number.parseInt(id, 10);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;
  try {
    return await tmdbServer<any>(`/movie/${tmdbId}?append_to_response=credits`, 86400);
  } catch (e) {
    // Transient TMDB errors must not be cached as a 404
    if (e instanceof Error && e.message === "TMDb 404") return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) return { title: "Movie not found | TV Time Tracker" };

  const year = movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : "";
  const title = `${movie.title}${year} – Where to Watch, Reviews & Tracker`;
  const description =
    (movie.overview ? `${movie.overview.slice(0, 150)}… ` : "") +
    `See where to stream ${movie.title}, rate it, and add it to your watchlist.`;
  const image = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/movies/${movie.id}` },
    openGraph: { title, description, type: "video.movie", url: `/movies/${movie.id}`, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function MoviePage({ params }: { params: Params }) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    datePublished: movie.release_date || undefined,
    genre: movie.genres?.map((g: { name: string }) => g.name),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <MovieDetailsClient tmdbId={movie.id} initialDetails={movie} />
    </>
  );
}
