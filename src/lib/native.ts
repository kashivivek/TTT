import { Capacitor } from "@capacitor/core";

export type AppPlatform = "ios" | "android" | "web";

/** True inside the Android/iOS app shell (the site is loaded in a native WebView). */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function appPlatform(): AppPlatform {
  if (typeof window === "undefined") return "web";
  return Capacitor.getPlatform() as AppPlatform;
}
