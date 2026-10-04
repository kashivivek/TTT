import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tmdbServer } from "@/lib/tmdb-server";
import ShowDetailsClient from "./ShowDetailsClient";

export const revalidate = 86400;

// Pages are generated on first request and cached for a day.
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ id: string }>;

async function getShow(id: string) {
  const tmdbId = Number.parseInt(id, 10);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;
  try {
    return await tmdbServer<any>(`/tv/${tmdbId}?append_to_response=credits`, 86400);
  } catch (e) {
    // Transient TMDB errors must not be cached as a 404
    if (e instanceof Error && e.message === "TMDb 404") return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const show = await getShow(id);
  if (!show) return { title: "Show not found | TV Time Tracker" };

  const year = show.first_air_date ? ` (${show.first_air_date.slice(0, 4)})` : "";
  const title = `${show.name}${year} – Episodes, Where to Watch & Tracker`;
  const description =
    (show.overview ? `${show.overview.slice(0, 150)}… ` : "") +
    `Track every episode of ${show.name}, see where to stream it, and get notified when new episodes air.`;
  const image = show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/shows/${show.id}` },
    openGraph: { title, description, type: "video.tv_show", url: `/shows/${show.id}`, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function ShowPage({ params }: { params: Params }) {
  const { id } = await params;
  const show = await getShow(id);
  if (!show) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    description: show.overview,
    image: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
    startDate: show.first_air_date || undefined,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    genre: show.genres?.map((g: { name: string }) => g.name),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ShowDetailsClient tmdbId={show.id} initialDetails={show} />
    </>
  );
}
