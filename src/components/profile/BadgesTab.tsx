"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { BADGES, badgeMeta } from "@/lib/badges";

interface Badge {
  id: string;
  badge_name: string;
  earned_at: string;
}

export default function BadgesTab({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await getSupabase()
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (data) {
        setBadges(data);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">Loading badges...</div>;
  }

  const earnedNames = new Set(badges.map((b) => b.badge_name));
  const locked = BADGES.filter((b) => !earnedNames.has(b.name));

  // Pre-defined colorful gradients for badges
  const gradients = [
    "from-purple-500 to-indigo-500",
    "from-pink-500 to-rose-500",
    "from-accent-yellow to-orange-500",
    "from-emerald-400 to-cyan-500",
    "from-blue-500 to-cyan-400",
  ];

  return (
    <div className="space-y-8">
    {badges.length === 0 && <p className="text-center text-text-muted">No badges yet — here&apos;s what you can earn.</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {badges.map((badge, i) => {
        const gradient = gradients[i % gradients.length];
        const meta = badgeMeta(badge.badge_name);
        return (
          <div
            key={badge.id}
            title={meta.description}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card-surface border border-white/5 hover:-translate-y-1 transition-transform shadow-lg"
          >
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-inner ring-4 ring-bg-primary`}>
              <span className="text-2xl drop-shadow-md">{meta.emoji}</span>
            </div>
            <h3 className="font-bold text-text-primary text-center text-sm leading-tight mb-1">
              {badge.badge_name}
            </h3>
            <span className="text-xs text-text-muted">
              {new Date(badge.earned_at).toLocaleDateString()}
            </span>
          </div>
        );
      })}
    </div>

    {locked.length > 0 && (
      <div>
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Up next</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {locked.map((b) => (
            <div key={b.name} className="flex flex-col items-center p-5 rounded-2xl bg-card-surface/50 border border-dashed border-white/10 text-center opacity-70">
              <span className="text-2xl grayscale mb-2">{b.emoji}</span>
              <p className="font-bold text-sm">{b.name}</p>
              <p className="text-xs text-text-muted mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
