"use client";

import { useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  loadNotificationPrefs,
  needsHomeScreenInstall,
  pushSupported,
  setEmailAlerts,
} from "@/lib/push-client";
import { track } from "@/lib/analytics";
import { isNativeApp } from "@/lib/native";
import { authFetch } from "@/lib/auth-fetch";

export default function NotificationSettings({ userId }: { userId: string }) {
  const [email, setEmail] = useState(false);
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [supported, setSupported] = useState(false);
  const [iosInstall, setIosInstall] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNote, setTestNote] = useState("");

  const sendTest = async () => {
    setTesting(true);
    setTestNote("");
    try {
      const res = await authFetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setTestNote(res.ok ? "Sent! It should arrive in a few seconds." : data.error || "Couldn't send a test notification.");
    } catch {
      setTestNote("Couldn't reach the server.");
    }
    setTesting(false);
  };

  useEffect(() => {
    setSupported(pushSupported());
    setIosInstall(needsHomeScreenInstall());
    setInApp(isNativeApp());
    loadNotificationPrefs(userId)
      .then((prefs) => {
        setEmail(!!prefs?.email_enabled);
        setPush(!!prefs?.push_enabled);
      })
      .catch(() => {});
  }, [userId]);

  const toggleEmail = async () => {
    setBusy(true);
    await setEmailAlerts(userId, !email);
    if (!email) track("notifications_enabled", { channel: "email" });
    setEmail(!email);
    setBusy(false);
  };

  const togglePush = async () => {
    setBusy(true);
    setNote("");
    if (push) {
      await disablePush(userId);
      setPush(false);
    } else {
      const result = await enablePush(userId);
      if (result === "granted") {
        setPush(true);
        track("notifications_enabled", { channel: "push" });
      } else if (result === "denied") {
        setNote("Notifications are blocked in your browser settings.");
      } else {
        setNote("Couldn't enable push on this device.");
      }
    }
    setBusy(false);
  };

  return (
    <section id="notifications" className="mt-6 bg-card-surface rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">New episode alerts</h2>
        <p className="text-text-muted text-sm">We&apos;ll let you know the day a show you track airs a new episode.</p>
      </div>

      <Toggle label="Email digest" description="One email on days your shows air" checked={email} disabled={busy} onChange={toggleEmail} />

      {supported ? (
        <Toggle label="Push notifications" description="Alerts on this device" checked={push} disabled={busy} onChange={togglePush} />
      ) : (
        <p className="text-xs text-text-muted">
          {inApp
            ? "Push notifications in the app are coming soon. Email alerts work today."
            : iosInstall
            ? "On iPhone, tap Share → Add to Home Screen, then open TTT from your Home Screen to turn on push alerts."
            : "Push notifications aren't supported in this browser."}
        </p>
      )}
      {supported && push && (
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="text-xs text-text-muted">{testNote || "Check that alerts reach this device."}</p>
          <button
            onClick={sendTest}
            disabled={testing}
            className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-60"
          >
            {testing ? "Sending…" : "Send test notification"}
          </button>
        </div>
      )}
      {note && <p className="text-xs text-red-400">{note}</p>}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        disabled={disabled}
        className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${checked ? "bg-accent-yellow" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
