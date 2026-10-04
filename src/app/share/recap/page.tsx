import type { Metadata } from "next";
import Link from "next/link";
import { parseRecapParams, recapQuery } from "@/lib/recap";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getter(sp: Record<string, string | string[] | undefined>) {
  return (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const p = parseRecapParams(getter(await searchParams));
  const title = `${p.name}'s ${p.year} in TV`;
  const description = `${p.eps} episodes, ${p.movies} movies, ${p.hours} hours. Track yours free on TV Time Tracker.`;
  const image = `/api/og/recap?${recapQuery(p)}`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function RecapSharePage({ searchParams }: { searchParams: SearchParams }) {
  const p = parseRecapParams(getter(await searchParams));

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl bg-gradient-to-br from-card-surface to-[#2a2410] border border-accent-yellow/20 p-8">
          <p className="text-accent-yellow font-bold">TV Time Tracker</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-2">
            {p.name}&apos;s {p.year} in TV
          </h1>
          <div className="grid grid-cols-2 gap-6 mt-8">
            {[
              [p.eps.toLocaleString(), "episodes"],
              [p.movies.toLocaleString(), "movies"],
              [p.hours.toLocaleString(), "hours"],
              [String(p.streak), "day best streak"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-4xl font-extrabold text-accent-yellow">{value}</p>
                <p className="text-text-muted text-sm">{label}</p>
              </div>
            ))}
          </div>
          {p.top.length > 0 && <p className="mt-8 text-text-muted">Top shows: {p.top.join(" · ")}</p>}
        </div>

        <div className="text-center mt-8">
          <p className="text-text-muted mb-4">Track your shows, get new-episode alerts, and get your own recap.</p>
          <Link
            href="/signup"
            className="inline-block bg-accent-yellow text-bg-primary font-extrabold px-8 py-3.5 rounded-xl hover:brightness-110"
          >
            Start tracking free
          </Link>
        </div>
      </div>
    </main>
  );
}
