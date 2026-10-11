"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { IS_APP_BUNDLE, appPath } from "@/lib/app-routes";

/** Landing page is for signed-out visitors (and crawlers); signed-in users go to their dashboard. */
export default function LandingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    const pending = IS_APP_BUNDLE ? sessionStorage.getItem("ttt-path") : null;
    if (pending) {
      restored.current = true;
      sessionStorage.removeItem("ttt-path");
      router.replace(appPath(pending));
      return;
    }
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (user) return null;
  return <>{children}</>;
}
