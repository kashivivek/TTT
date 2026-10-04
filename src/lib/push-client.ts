import { getSupabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!VAPID_PUBLIC_KEY &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS only allows web push once the app is added to the Home Screen. */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return isIos && !standalone;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function loadNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const { data } = await getSupabase()
    .from("notification_preferences")
    .select("email_enabled, push_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

async function savePrefs(userId: string, prefs: Partial<NotificationPrefs>) {
  await getSupabase()
    .from("notification_preferences")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

export async function setEmailAlerts(userId: string, enabled: boolean) {
  await savePrefs(userId, { email_enabled: enabled });
}

export async function enablePush(userId: string): Promise<"granted" | "denied" | "unsupported" | "error"> {
  if (!pushSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const json = sub.toJSON();
    const { error } = await getSupabase()
      .from("push_subscriptions")
      .upsert(
        { endpoint: sub.endpoint, user_id: userId, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        { onConflict: "endpoint" }
      );
    if (error) return "error";
    await savePrefs(userId, { push_enabled: true });
    return "granted";
  } catch {
    return "error";
  }
}

export async function disablePush(userId: string) {
  try {
    if (pushSupported()) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await getSupabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    }
  } finally {
    await savePrefs(userId, { push_enabled: false });
  }
}
