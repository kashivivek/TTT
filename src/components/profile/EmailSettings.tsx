"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Account email with a self-service "Change" flow (confirmed by email link). */
export default function EmailSettings() {
  const { user, updateEmail } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Confirmation links land on /profile with a status message in the URL hash
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const message = hash.get("message");
    const errorDescription = hash.get("error_description");
    if (message || errorDescription) {
      if (message) setNotice(message);
      if (errorDescription) setError(errorDescription);
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!user) return null;
  const pendingEmail = user.new_email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    setError("");
    setNotice("");
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (email === user.email?.toLowerCase()) {
      setError("That's already your email address.");
      return;
    }
    if (email !== confirmEmail.trim().toLowerCase()) {
      setError("The two email addresses don't match.");
      return;
    }
    setSaving(true);
    // Re-check the password so a borrowed, logged-in device can't take over the account
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email: user.email!, password });
    if (authError) {
      setSaving(false);
      setError("Your current password is incorrect.");
      return;
    }
    const result = await updateEmail(email);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    track("email_change_requested", { immediate: Boolean(result.changed) });
    setEditing(false);
    setNewEmail("");
    setConfirmEmail("");
    setPassword("");
    setNotice(
      result.changed
        ? `Done! Your email is now ${email}. Use it next time you sign in. Your shows and history are unchanged.`
        : `We sent a confirmation link to ${email}. You may also get one at ${user.email}. Open the link(s) to finish; your shows and history stay on your account.`
    );
  };

  return (
    <div className="bg-card-surface rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text-muted text-xs mb-1">Email</p>
          <p className="text-text-primary text-sm break-all">{user.email}</p>
          {pendingEmail && (
            <p className="mt-1 text-xs text-accent-yellow break-all">
              Waiting for confirmation: {pendingEmail}
            </p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => {
              setEditing(true);
              setError("");
              setNotice("");
            }}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white/15"
          >
            Change
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-text-muted text-xs mb-1 block">New email address</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-text-primary focus:border-accent-yellow focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-text-muted text-xs mb-1 block">Confirm new email address</span>
            <input
              type="email"
              autoComplete="off"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-text-primary focus:border-accent-yellow focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-text-muted text-xs mb-1 block">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-text-primary focus:border-accent-yellow focus:outline-none"
            />
          </label>
          <p className="text-xs text-text-muted">
            Your shows, movies and history stay on your account. You&apos;ll sign in with the new address afterwards.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-accent-yellow py-2.5 text-sm font-bold text-bg-primary hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Change email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/15"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {notice && <p className="mt-3 text-xs text-green-400">{notice}</p>}
    </div>
  );
}
