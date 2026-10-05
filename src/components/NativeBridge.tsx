"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { appPlatform, isNativeApp } from "@/lib/native";
import { onNativeNotificationTap, refreshNativePushToken } from "@/lib/push-client";

/** Wires native app behaviour (Android/iOS shell). Does nothing in a normal browser. */
export default function NativeBridge() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add("native-app");
    const cleanups: Array<() => void> = [];

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
      const open = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const u = new URL(url);
          if (u.hostname === "tvtime.online" || u.hostname === "www.tvtime.online") {
            router.push(`${u.pathname}${u.search}${u.hash}`);
          }
        } catch {
          // Ignore malformed links
        }
      });
      cleanups.push(() => back.remove(), () => open.remove());
      cleanups.push(await onNativeNotificationTap((path) => router.push(path)));
    })();

    return () => cleanups.forEach((fn) => fn());
  }, [router]);

  useEffect(() => {
    if (user && isNativeApp()) refreshNativePushToken(user.id);
  }, [user]);

  return null;
}
