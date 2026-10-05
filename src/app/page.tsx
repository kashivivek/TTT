"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AdBanner from "@/components/AdBanner";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

const FEATURES = [
  {
    icon: "📥",
    title: "Import from TV Time",
    desc: "Bring your full watch history, ratings and badges over from a TV Time data export in minutes.",
  },
  {
    icon: "🔔",
    title: "New Episode Alerts",
    desc: "Get an email or push notification the day a show you track airs a new episode.",
  },
  {
    icon: "🗓️",
    title: "Upcoming Calendar",
    desc: "See everything airing this week across all your shows, plus what you missed.",
  },
  {
    icon: "✨",
    title: "AI Recommendations",
    desc: "Ask for a mood, genre, or vibe — or let us suggest picks based on what you've watched.",
  },
  {
    icon: "📺",
    title: "Where to Watch",
    desc: "See streaming providers for your country so you can find the best place to watch instantly.",
  },
  {
    icon: "🔥",
    title: "Streaks, Badges & Recaps",
    desc: "Keep your watch streak alive, earn badges, and share your year in TV with friends.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Render the landing page during the auth check so crawlers and first-time visitors see content
  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-accent-yellow font-extrabold text-xl">TTT</span>
        <div className="flex gap-3">
          {user ? (
            <a
              href="/dashboard"
              className="bg-accent-yellow text-bg-primary font-bold px-5 py-2 rounded-xl
                         hover:brightness-110 transition-all text-sm"
            >
              Dashboard
            </a>
          ) : (
            <>
              <Link
                href="/login"
                className="text-text-muted hover:text-text-primary transition-colors text-sm px-4 py-2"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-accent-yellow text-bg-primary font-bold px-5 py-2 rounded-xl
                           hover:brightness-110 transition-all text-sm"
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-20">
        <div className="text-6xl mb-6">📺</div>
        <div className="flex items-center justify-center gap-4 mb-4">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-text-primary leading-tight">
            TV Time Tracker
          </h1>
        </div>
        <p className="text-text-muted text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
          The free TV Time alternative. Track every episode, get alerts when new
          ones air, and import your full TV Time history.
        </p>
        <div className="flex gap-4">
          {user ? (
            <a
              href="/dashboard"
              className="bg-accent-yellow text-bg-primary font-extrabold px-8 py-3.5 rounded-xl
                         hover:brightness-110 transition-all text-lg"
            >
              Go to Dashboard →
            </a>
          ) : (
            <>
              <Link
                href="/signup"
                className="bg-accent-yellow text-bg-primary font-extrabold px-8 py-3.5 rounded-xl
                           hover:brightness-110 transition-all text-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="border border-gray-600 text-text-primary font-bold px-8 py-3.5 rounded-xl
                           hover:border-accent-yellow transition-all text-lg"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-extrabold text-text-primary text-center mb-10">
          Everything you need to stay on track
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-card-surface rounded-xl p-6 hover:ring-1 hover:ring-accent-yellow/30 transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-text-primary font-bold text-lg mb-1">
                {f.title}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4">
        <AdBanner />
      </div>

      <SiteFooter />
    </main>
  );
}
