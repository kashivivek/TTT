import { track as vercelTrack } from "@vercel/analytics";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type Props = Record<string, string | number | boolean | null | undefined>;

let currentUserId: string | null = null;

function anonId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("ttt-anon-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ttt-anon-id", id);
  }
  return id;
}

function distinctId(): string {
  return currentUserId || anonId();
}

function sendPosthog(event: string, distinct_id: string, properties: Props) {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    // text/plain avoids a CORS preflight, which keepalive requests can't always make
    headers: { "Content-Type": "text/plain" },
    keepalive: true,
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        $screen_width: window.innerWidth,
        standalone: window.matchMedia?.("(display-mode: standalone)").matches ?? false,
      },
    }),
  }).catch(() => {});
}

export function identify(userId: string | null, properties: Props = {}) {
  if (userId === currentUserId) return;
  if (userId) {
    sendPosthog("$identify", userId, { $anon_distinct_id: anonId(), ...properties });
  }
  currentUserId = userId;
}

export function track(event: string, properties: Props = {}) {
  try {
    const clean: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(properties)) if (v !== undefined) clean[k] = v;
    vercelTrack(event, clean);
  } catch {
    // Custom events need a Vercel plan that supports them; ignore otherwise
  }
  sendPosthog(event, distinctId(), properties);
}

export function trackPageview() {
  sendPosthog("$pageview", distinctId(), {});
}
