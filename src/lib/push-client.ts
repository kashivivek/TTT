import { getSupabase } from "./supabase";
import { appPlatform, isNativeApp } from "./native";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
// Native push stays off per platform until Firebase/APNs is set up, e.g. "android" or "android,ios".
const NATIVE_PUSH_PLATFORMS = (process.env.NEXT_PUBLIC_NATIVE_PUSH_PLATFORMS || "").split(",").map((p) => p.trim());
const NATIVE_ENDPOINT_KEY = "ttt-native-push-endpoint";

export interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
}

function nativePushEnabled(): boolean {
  return isNativeApp() && NATIVE_PUSH_PLATFORMS.includes(appPlatform());
}

export function pushSupported(): boolean {
  if (isNativeApp()) return nativePushEnabled();
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
  if (typeof window === "undefined" || isNativeApp()) return false;
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
  if (isNativeApp()) return enableNativePush(userId);
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
        { endpoint: sub.endpoint, user_id: userId, p256dh: json.keys?.p256dh, auth: json.keys?.auth, platform: "web" },
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
    if (isNativeApp()) {
      const endpoint = localStorage.getItem(NATIVE_ENDPOINT_KEY);
      if (endpoint) await getSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
      localStorage.removeItem(NATIVE_ENDPOINT_KEY);
      if (nativePushEnabled()) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        await PushNotifications.unregister();
      }
    } else if (pushSupported()) {
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

async function registerNativeToken(): Promise<string> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Push registration timed out")), 15000);
    const handles = Promise.all([
      PushNotifications.addListener("registration", (t) => {
        clearTimeout(timer);
        resolve(t.value);
      }),
      PushNotifications.addListener("registrationError", (e) => {
        clearTimeout(timer);
        reject(new Error(e.error));
      }),
    ]);
    PushNotifications.register().catch(reject);
    // One-shot listeners: drop them once this registration settles.
    const cleanup = () => handles.then((hs) => hs.forEach((h) => h.remove()));
    setTimeout(cleanup, 16000);
  });
}

async function saveNativeToken(userId: string, token: string) {
  const platform = appPlatform();
  const endpoint = `native:${platform}:${token}`;
  const previous = localStorage.getItem(NATIVE_ENDPOINT_KEY);
  if (previous && previous !== endpoint) {
    await getSupabase().from("push_subscriptions").delete().eq("endpoint", previous);
  }
  const { error } = await getSupabase()
    .from("push_subscriptions")
    .upsert({ endpoint, user_id: userId, platform }, { onConflict: "endpoint" });
  if (error) throw error;
  localStorage.setItem(NATIVE_ENDPOINT_KEY, endpoint);
}

async function enableNativePush(userId: string): Promise<"granted" | "denied" | "error"> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return "denied";
    await saveNativeToken(userId, await registerNativeToken());
    await savePrefs(userId, { push_enabled: true });
    return "granted";
  } catch {
    return "error";
  }
}

/** Tokens can rotate; re-register on app start when the user already opted in. */
export async function refreshNativePushToken(userId: string) {
  if (!nativePushEnabled()) return;
  try {
    const prefs = await loadNotificationPrefs(userId);
    if (!prefs?.push_enabled) return;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") return;
    await saveNativeToken(userId, await registerNativeToken());
  } catch {
    // Try again next launch
  }
}

/** Opens the URL attached to a tapped notification. Returns a cleanup function. */
export async function onNativeNotificationTap(navigate: (url: string) => void): Promise<() => void> {
  if (!nativePushEnabled()) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const handle = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action.notification.data?.url;
    if (typeof url === "string" && url.startsWith("/")) navigate(url);
  });
  return () => handle.remove();
}
