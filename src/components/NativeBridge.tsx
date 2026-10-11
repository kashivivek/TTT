"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { appPlatform, isNativeApp } from "@/lib/native";
import { onNativeNotificationTap, refreshNativePushToken } from "@/lib/push-client";
import { IS_APP_BUNDLE, appPath } from "@/lib/app-routes";
import { applyPendingUpdate, checkForLiveUpdate, markAppReady } from "@/lib/live-update";
import { getSupabase } from "@/lib/supabase";

/** Wires native app behaviour (Android/iOS shell). Does nothing in a normal browser. */
export default function NativeBridge() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add("native-app");
    const cleanups: Array<() => void> = [];
    markAppReady();
    checkForLiveUpdate();

    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (appPlatform() === "android") StatusBar.setBackgroundColor({ color: "#141414" }).catch(() => {});
      SplashScreen.hide().catch(() => {});

      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
      const open = await App.addListener("appUrlOpen", async ({ url }) => {
        try {
          const u = new URL(url);
          if (u.hostname !== "tvtime.online" && u.hostname !== "www.tvtime.online") return;

          // Emailed sign-up / password-reset links carry the session in the hash
          const hash = new URLSearchParams(u.hash.slice(1));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            await getSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }

          if (IS_APP_BUNDLE && u.pathname.startsWith("/share/")) {
            window.open(url, "_blank");
            return;
          }
          router.push(appPath(`${u.pathname}${u.search}`));
        } catch {
          // Ignore malformed links
        }
      });
      const state = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) checkForLiveUpdate();
        else applyPendingUpdate();
      });
      cleanups.push(() => back.remove(), () => open.remove(), () => state.remove());
      cleanups.push(await onNativeNotificationTap((path) => router.push(appPath(path))));
    })();

    return () => cleanups.forEach((fn) => fn());
  }, [router]);

  useEffect(() => {
    if (user && isNativeApp()) refreshNativePushToken(user.id);
  }, [user]);

  return null;
}
