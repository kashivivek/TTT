import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, getAdminClient } from "@/lib/server-auth";
import { tmdbServer } from "@/lib/tmdb-server";
import { isEndedStatus, parseAirsTitle, refreshTrackState, todayISO, type Fetcher } from "@/lib/progress";
import { sendPush, vapidConfigured } from "@/lib/webpush";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TrackedRow {
  user_id: string;
  tmdb_id: number;
  name: string;
  media_type: string;
  current_season: number;
  current_episode: number;
  episode_title: string | null;
}

interface EpisodeRef {
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
}

interface ShowDetails {
  name: string;
  status?: string;
  next_episode_to_air?: EpisodeRef | null;
  last_episode_to_air?: EpisodeRef | null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tvtime.online";

function isAfter(ep: EpisodeRef | null | undefined, season: number, episode: number) {
  if (!ep) return false;
  return ep.season_number > season || (ep.season_number === season && ep.episode_number > episode);
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length > 0) await fn(queue.shift()!);
    })
  );
}

/**
 * Daily job (see vercel.json):
 *  1. Moves awaiting/completed shows back to "watch next" when new episodes air.
 *  2. Sends email/push alerts for episodes airing today.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const today = todayISO(new Date());

  const rows: TrackedRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("tracked_shows")
      .select("user_id, tmdb_id, name, media_type, current_season, current_episode, episode_title")
      .in("media_type", ["tv", "awaiting", "completed"])
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as TrackedRow[]));
    if (data.length < 1000) break;
  }

  const memo = new Map<string, Promise<unknown>>();
  const fetcher: Fetcher = <T,>(endpoint: string) => {
    if (!memo.has(endpoint)) memo.set(endpoint, tmdbServer<T>(endpoint, 3600));
    return memo.get(endpoint) as Promise<T>;
  };

  const details = new Map<number, ShowDetails>();
  await pool(Array.from(new Set(rows.map((r) => r.tmdb_id))), 8, async (id) => {
    try {
      details.set(id, await fetcher<ShowDetails>(`/tv/${id}`));
    } catch {
      // Skip this show today
    }
  });

  // 1. Resurface shows with new episodes
  let resurfaced = 0;
  const needsRefresh = rows.filter((r) => {
    const d = details.get(r.tmdb_id);
    if (!d) return false;
    if (r.media_type === "awaiting") {
      const airs = parseAirsTitle(r.episode_title);
      if (airs) return airs.date <= today;
      return isAfter(d.last_episode_to_air, r.current_season, r.current_episode) || !!d.next_episode_to_air;
    }
    if (r.media_type === "completed") {
      return isAfter(d.last_episode_to_air, r.current_season, r.current_episode) || (!isEndedStatus(d.status) && !!d.next_episode_to_air);
    }
    return false;
  });

  await pool(needsRefresh, 6, async (row) => {
    try {
      const next = await refreshTrackState(fetcher, { ...row, episode_title: row.episode_title || "" });
      if (!next) return;
      await admin
        .from("tracked_shows")
        .update({ ...next, updated_at: new Date().toISOString() })
        .eq("user_id", row.user_id)
        .eq("tmdb_id", row.tmdb_id);
      resurfaced++;
    } catch {
      // Retry tomorrow
    }
  });

  // 2. Alerts for episodes airing today
  const airingToday = new Map<number, EpisodeRef>();
  details.forEach((d, id) => {
    const ep = [d.next_episode_to_air, d.last_episode_to_air].find((e) => e?.air_date === today);
    if (ep) airingToday.set(id, ep);
  });

  const perUser = new Map<string, string[]>();
  for (const r of rows) {
    const ep = airingToday.get(r.tmdb_id);
    if (!ep) continue;
    const label = `${details.get(r.tmdb_id)?.name || r.name} S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}${ep.name ? ` – ${ep.name}` : ""}`;
    perUser.set(r.user_id, [...(perUser.get(r.user_id) || []), label]);
  }

  let emails = 0;
  let pushes = 0;
  const userIds = Array.from(perUser.keys());
  if (userIds.length > 0) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, email_enabled, push_enabled")
      .in("user_id", userIds);

    await pool(prefs || [], 4, async (pref: { user_id: string; email_enabled: boolean; push_enabled: boolean }) => {
      const items = perUser.get(pref.user_id) || [];
      if (items.length === 0) return;
      const title = items.length === 1 ? "New episode today" : `${items.length} new episodes today`;
      const body = items.slice(0, 3).join("\n") + (items.length > 3 ? `\n+${items.length - 3} more` : "");

      if (pref.push_enabled && vapidConfigured()) {
        const { data: subs } = await admin.from("push_subscriptions").select("endpoint").eq("user_id", pref.user_id);
        for (const sub of subs || []) {
          await admin
            .from("push_subscriptions")
            .update({ last_payload: { title, body, url: "/calendar" } })
            .eq("endpoint", sub.endpoint);
          const result = await sendPush(sub.endpoint);
          if (result === "gone") await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          if (result === "ok") pushes++;
        }
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (pref.email_enabled && apiKey) {
        const { data: userData } = await admin.auth.admin.getUserById(pref.user_id);
        const to = userData?.user?.email;
        if (!to) return;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "TV Time Tracker <onboarding@resend.dev>",
            to,
            subject: `📺 ${title}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px">
                <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
                <ul style="padding-left:18px;line-height:1.6">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
                <p><a href="${SITE_URL}/calendar" style="background:#FFD200;color:#141414;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Open TV Time Tracker</a></p>
                <p style="color:#888;font-size:12px">You're getting this because email alerts are on. Turn them off anytime in <a href="${SITE_URL}/profile#notifications">your profile</a>.</p>
              </div>`,
          }),
        });
        if (res.ok) emails++;
      }
    });
  }

  return NextResponse.json({ shows: details.size, rows: rows.length, resurfaced, usersWithEpisodes: userIds.length, emails, pushes });
}
