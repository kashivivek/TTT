import Link from "next/link";
import { tmdbServer } from "@/lib/tmdb-server";
import { mediaPath } from "@/lib/app-routes";
import LandingGate from "@/components/LandingGate";
import PlayStoreBadge from "@/components/PlayStoreBadge";
import AdBanner from "@/components/AdBanner";
import SiteFooter from "@/components/SiteFooter";

interface TrendingItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average?: number;
}

const POSTER = "https://image.tmdb.org/t/p/w342";

async function getTrending(): Promise<TrendingItem[]> {
  try {
    const data = await tmdbServer<{ results: TrendingItem[] }>("/trending/all/week", 86400);
    return data.results.filter((r) => (r.media_type === "tv" || r.media_type === "movie") && r.poster_path);
  } catch {
    // Landing page still renders without posters
    return [];
  }
}

const NEW_FEATURES = [
  {
    title: "Straight to the title",
    desc: "Tap Netflix, Hulu, Disney+, Prime Video and more — we open the app right on the show or movie. No more searching.",
  },
  {
    title: "Up next on your Google TV",
    desc: "Your next episodes appear in the Continue watching row on your TV's home screen. Pick one and press play.",
  },
  {
    title: "\u201cFinished it?\u201d reminders",
    desc: "Start an episode from TTT and we'll nudge you when it's over. One tap marks it watched.",
  },
  {
    title: "Never miss a new episode",
    desc: "Push and email alerts the day new episodes drop, plus a calendar of everything airing this week.",
  },
];

const MORE_FEATURES = [
  { title: "AI picks for tonight", desc: "Describe a mood or let us suggest something based on what you love." },
  { title: "Where to watch, in your country", desc: "Streaming, rent and buy options for your region, always up to date." },
  { title: "Streaks, badges & your year in TV", desc: "Keep your streak alive and share a recap of everything you watched." },
  { title: "Ratings & reviews", desc: "Rate what you watch and see what other fans think, episode by episode." },
];

const STEPS = [
  { n: "1", title: "Add your shows", desc: "Search anything and tap + to start tracking. Movies go on your watchlist." },
  { n: "2", title: "Watch anywhere", desc: "Open your streaming app from TTT on your phone, tablet or TV." },
  { n: "3", title: "We keep your place", desc: "Mark episodes in a tap — TTT knows what's next and when it airs." },
];

export default async function HomePage() {
  const trending = await getTrending();

  return (
    <LandingGate>
      <main className="min-h-screen overflow-x-hidden">
        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg object-cover" />
            <span className="text-accent-yellow font-extrabold text-xl tracking-tight">TTT</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-text-muted hover:text-text-primary transition-colors text-sm px-4 py-2">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-accent-yellow text-bg-primary font-bold px-5 py-2 rounded-xl hover:brightness-110 transition-all text-sm"
            >
              Sign up free
            </Link>
          </div>
        </nav>

        {/* Hero with poster wall */}
        <section className="relative -mt-[72px] pt-[72px] min-h-[640px] flex items-center">
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            <img
              src="/images/hero-posters.jpg"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover scale-110 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/50 via-bg-primary/60 to-bg-primary" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,20,20,0.35)_0%,rgba(20,20,20,0.5)_70%)]" />
          </div>

          <div className="relative z-10 w-full px-5 py-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-yellow/40 bg-black/40 px-4 py-1.5 text-xs font-semibold text-accent-yellow backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-pulse" />
              New: now on Google Play &amp; Google TV
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight max-w-3xl mx-auto">
              Never lose your place in a show <span className="text-accent-yellow">again.</span>
            </h1>
            <p className="mt-5 text-text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              TTT tracks every episode and movie you watch, tells you the moment new episodes drop, and opens Netflix,
              Hulu, Disney+ and more right on the title.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="bg-accent-yellow text-bg-primary font-extrabold px-8 py-4 rounded-2xl hover:brightness-110 transition-all text-lg shadow-[0_10px_40px_-10px_rgba(255,210,0,0.6)]"
              >
                Start tracking — it&apos;s free
              </Link>
              <PlayStoreBadge source="home_hero" className="h-[60px]" />
            </div>
            <p className="mt-5 text-xs text-text-muted">Web · Android phones &amp; tablets · Google TV &amp; Android TV</p>
          </div>
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="px-5 pb-16">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-2xl font-extrabold">Trending this week</h2>
              <Link href="/signup" className="text-sm text-accent-yellow font-semibold hover:underline">
                Track them →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 snap-x">
              {trending.slice(0, 16).map((item) => {
                const title = item.title || item.name || "";
                return (
                  <Link
                    key={`${item.media_type}-${item.id}`}
                    href={mediaPath(item.media_type, item.id)}
                    className="group w-32 sm:w-40 shrink-0 snap-start"
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={`${POSTER}${item.poster_path}`}
                        alt={title}
                        loading="lazy"
                        className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {item.vote_average ? (
                        <span className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-accent-yellow">
                          ★ {item.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold line-clamp-1">{title}</p>
                    <p className="text-xs text-text-muted">{item.media_type === "tv" ? "Series" : "Movie"}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* What's new */}
        <section className="px-5 pb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-yellow">Just shipped</p>
          <h2 className="mt-2 text-3xl font-extrabold">Less searching. More watching.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {NEW_FEATURES.map((f) => (
              <div
                key={f.title}
                className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-card-surface to-black/40 p-6 hover:border-accent-yellow/40 transition-colors"
              >
                <span className="absolute top-4 right-4 rounded-full bg-accent-yellow/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent-yellow">
                  New
                </span>
                <h3 className="pr-12 text-lg font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="px-5 pb-16">
          <h2 className="text-3xl font-extrabold text-center">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-card-surface p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-yellow text-lg font-extrabold text-bg-primary">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold text-lg">{s.title}</h3>
                <p className="mt-1 text-sm text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Get the app */}
        <section className="px-5 pb-16">
          <div className="relative overflow-hidden rounded-3xl border border-accent-yellow/20 bg-gradient-to-br from-[#2a2410] via-card-surface to-bg-primary p-8 sm:p-12">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl font-extrabold">Take TTT everywhere</h2>
              <p className="mt-3 text-text-muted leading-relaxed">
                The Android app works on phones, tablets and Google TV with the same account. Real push alerts, your next
                episodes on your TV&apos;s home screen, and one-tap &ldquo;watched&rdquo; reminders.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <PlayStoreBadge source="home_app_section" className="h-[60px]" />
                <Link href="/signup" className="text-sm font-semibold text-accent-yellow hover:underline">
                  or use it on the web →
                </Link>
              </div>
              <p className="mt-3 text-[10px] text-text-muted">Google Play and the Google Play logo are trademarks of Google LLC.</p>
            </div>
            {trending.length > 3 && (
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 gap-3 sm:flex">
                {trending.slice(3, 6).map((item, i) => (
                  <img
                    key={item.id}
                    src={`${POSTER}${item.poster_path}`}
                    alt=""
                    loading="lazy"
                    className={`w-32 aspect-[2/3] rounded-xl object-cover shadow-2xl ${i === 1 ? "-translate-y-6" : "translate-y-6 opacity-70"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* More features */}
        <section className="px-5 pb-16">
          <h2 className="text-2xl font-extrabold">Everything else you&apos;d expect</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MORE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border-l-2 border-accent-yellow/60 bg-card-surface p-5">
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">What are you watching next?</h2>
          <p className="mt-3 text-text-muted">Free to use. Takes 30 seconds to start.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-accent-yellow text-bg-primary font-extrabold px-8 py-4 rounded-2xl hover:brightness-110 transition-all text-lg"
            >
              Create your free account
            </Link>
            <Link href="/login" className="text-text-muted hover:text-text-primary text-sm">
              I already have an account
            </Link>
          </div>
        </section>

        <div className="px-5">
          <AdBanner />
        </div>

        <SiteFooter />
      </main>
    </LandingGate>
  );
}
