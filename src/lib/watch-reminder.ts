import { mediaPath, withQuery } from "./app-routes";
import { isNativeApp } from "./native";

export interface ReminderTarget {
  type: "tv" | "movie";
  id: number;
  title: string;
  /** Next episode to watch, for shows. */
  season?: number;
  episode?: number;
  /** Movie runtime in minutes, to time the reminder after it ends. */
  runtime?: number;
}

const EPISODE_DELAY_MIN = 60;

// One pending reminder per title: opening it again just moves the reminder.
function reminderId(type: "tv" | "movie", id: number): number {
  return (type === "movie" ? 1_000_000_000 : 0) + (id % 1_000_000_000);
}

/** In the app: "Finished X?" notification after the user opens a streaming app; tapping it lets them mark it watched. */
export async function scheduleWatchReminder(t: ReminderTarget): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if ((await LocalNotifications.checkPermissions()).display !== "granted") return;

    const id = reminderId(t.type, t.id);
    const hasEpisode = t.type === "tv" && t.season != null && t.episode != null;
    const label = hasEpisode ? ` S${t.season}E${t.episode}` : "";
    const delayMin = t.type === "movie" ? (t.runtime || 120) + 15 : EPISODE_DELAY_MIN;
    const url = withQuery(mediaPath(t.type, t.id), { watched: hasEpisode ? `${t.season}-${t.episode}` : "1" });

    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: `Finished ${t.title}${label}?`,
          body: "Tap to mark it watched in TTT.",
          schedule: { at: new Date(Date.now() + delayMin * 60_000), allowWhileIdle: true },
          extra: { url },
        },
      ],
    });
  } catch {
    // Plugin missing in older app builds
  }
}

/** Opens the page attached to a tapped reminder. Returns a cleanup function. */
export async function onReminderTap(navigate: (url: string) => void): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const handle = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const url = action.notification.extra?.url;
      if (typeof url === "string" && url.startsWith("/")) navigate(url);
    });
    return () => handle.remove();
  } catch {
    return () => {};
  }
}

/** Reads and clears ?watched= (set by a tapped reminder). "1" for movies, "S-E" for episodes. */
export function takeWatchedParam(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get("watched");
  if (!value) return null;
  url.searchParams.delete("watched");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  return value;
}
