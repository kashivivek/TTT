"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AdBanner from "@/components/AdBanner";

const FEATURES = [
  {
    icon: "📺",
    title: "Track Your Shows",
    desc: "Keep up with every episode across all your TV shows. Never forget where you left off.",
  },
  {
    icon: "📥",
    title: "Import History",
    desc: "Bring your existing watch data from TV Time and other platforms with a simple zip upload.",
  },
  {
    icon: "😊",
    title: "React & Feel",
    desc: "Log your emotional reactions to each episode. See how a show made you feel over time.",
  },
  {
    icon: "☁️",
    title: "Cloud Synced",
    desc: "Your data is saved to your account. Access it from anywhere, on any device.",
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

  // Show nothing while checking auth (prevents flash)
  if (loading || user) {
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
              <a
                href="/login"
                className="text-text-muted hover:text-text-primary transition-colors text-sm px-4 py-2"
              >
                Log In
              </a>
              <a
                href="/signup"
                className="bg-accent-yellow text-bg-primary font-bold px-5 py-2 rounded-xl
                           hover:brightness-110 transition-all text-sm"
              >
                Sign Up Free
              </a>
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
          Track every episode. React with emotions. Never lose your watch
          history. The modern tracker for binge watchers.
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
              <a
                href="/signup"
                className="bg-accent-yellow text-bg-primary font-extrabold px-8 py-3.5 rounded-xl
                           hover:brightness-110 transition-all text-lg"
              >
                Get Started Free
              </a>
              <a
                href="/login"
                className="border border-gray-600 text-text-primary font-bold px-8 py-3.5 rounded-xl
                           hover:border-accent-yellow transition-all text-lg"
              >
                Log In
              </a>
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

      {/* Footer */}
      <footer className="border-t border-card-surface mt-10">
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-between">
          <span className="text-text-muted text-xs">
            TV Time Tracker &copy; {new Date().getFullYear()}
          </span>
          <span className="text-text-muted text-xs">
            Powered by{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-yellow hover:underline"
            >
              TMDb
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
