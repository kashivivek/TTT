"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

export default function ContactForm() {
  const [type, setType] = useState("Feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await authFetch("/api/feedback", { method: "POST", body: JSON.stringify({ type, message }) });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) setMessage("");
    } catch {
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
        required
        placeholder="Your message (include your email if you'd like a reply and aren't logged in)"
        className="w-full rounded-xl border border-white/10 bg-bg-primary px-3 py-2 resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        {status === "error" ? (
          <span className="text-sm text-red-400">Couldn&apos;t send. Please email us instead.</span>
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
