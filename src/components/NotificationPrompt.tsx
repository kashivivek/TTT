"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { enablePush, loadNotificationPrefs, pushSupported, setEmailAlerts } from "@/lib/push-client";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "ttt-notif-prompt-dismissed";

export default function NotificationPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || localStorage.getItem(DISMISS_KEY)) return;
    loadNotificationPrefs(user.id)
      .then((prefs) => {
        if (!prefs || (!prefs.email_enabled && !prefs.push_enabled)) setVisible(true);
      })
      .catch(() => {});
  }, [user]);

  if (!visible || !user) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handlePush = async () => {
    setBusy(true);
    const result = await enablePush(user.id);
    setBusy(false);
    if (result === "granted") {
      track("notifications_enabled", { channel: "push" });
      dismiss();
    } else if (result === "denied") {
      setMessage("Notifications are blocked in your browser settings.");
    } else {
      setMessage("Push isn't available here — try email alerts instead.");
    }
  };

  const handleEmail = async () => {
    setBusy(true);
    await setEmailAlerts(user.id, true);
    setBusy(false);
    track("notifications_enabled", { channel: "email" });
    dismiss();
  };

  return (
    <div className="mb-6 rounded-2xl border border-accent-yellow/30 bg-accent-yellow/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="font-bold text-text-primary">🔔 Never miss a new episode</p>
        <p className="text-sm text-text-muted">
          {message || "Get a heads-up the day a show you track airs a new episode."}
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {pushSupported() && (
          <button
            onClick={handlePush}
            disabled={busy}
            className="rounded-full bg-accent-yellow px-4 py-2 text-sm font-bold text-bg-primary hover:brightness-110 disabled:opacity-60"
          >
            Push alerts
          </button>
        )}
        <button
          onClick={handleEmail}
          disabled={busy}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5 disabled:opacity-60"
        >
          Email alerts
        </button>
        <button onClick={dismiss} className="px-2 text-text-muted text-sm hover:text-white" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
