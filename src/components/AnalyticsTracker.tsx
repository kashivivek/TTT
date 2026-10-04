"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { identify, trackPageview } from "@/lib/analytics";

export default function AnalyticsTracker() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    identify(user?.id ?? null, user ? { created_at: user.created_at } : {});
  }, [user, loading]);

  useEffect(() => {
    if (loading) return;
    trackPageview();
  }, [pathname, loading]);

  return null;
}
