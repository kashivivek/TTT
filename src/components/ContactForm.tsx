"use client";

import { useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/components/AuthProvider";

export default function ContactForm() {
  const { user } = useAuth();
  const [type, setType] = useState("Feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const startedAt = useRef(Date.now());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setErrorText("");
    try {
      const res = await authFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type, message, email, website, elapsedMs: Date.now() - startedAt.current }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrorText(data.error || "Couldn't send. Please email us instead.");
      setStatus("error");
    } catch {
      setErrorText("Couldn't send. Please email us instead.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return <p className="my-6 rounded-xl bg-card-surface p-4 !text-text-primary">Thanks — your message was sent.</p>;
  }

  return (
    <form onSubmit={submit} className="my-6 space-y-3 rounded-xl bg-card-surface p-5">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-bg-primary px-3 py-2"
        aria-label="Message type"
      >
        <option value="Feedback">General feedback</option>
        <option value="Bug">Report a bug</option>
        <option value="Request">Feature request</option>
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={4000}
        minLength={user ? 1 : 15}
        required
        placeholder="How can we help? Tell us what happened or what you'd like to see."
        className="w-full rounded-xl border border-white/10 bg-bg-primary px-3 py-2 resize-none"
      />
      {!user && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email (optional, only if you'd like a reply)"
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-bg-primary px-3 py-2"
        />
      )}
      {/* Hidden from people; form-filling bots fill it in. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="flex items-center justify-between gap-3">
        {status === "error" ? (
          <span className="text-sm text-red-400">{errorText}</span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-accent-yellow px-5 py-2 font-bold text-bg-primary hover:brightness-110 disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
