"use client";

import { useState } from "react";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("Bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
          setMessage("");
          setType("Bug");
        }, 2000);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-card-surface border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
        title="Send Feedback"
      >
        💬
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-12 right-0 w-72 bg-bg-primary border border-card-surface p-4 rounded-xl shadow-2xl z-50">
            <h3 className="font-bold text-sm mb-3">Send Feedback</h3>
            
            {status === "success" ? (
              <div className="text-center py-6 text-accent-yellow font-bold flex flex-col items-center gap-2">
                <span className="text-2xl">✓</span>
                Feedback sent!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-card-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent-yellow"
                >
                  <option value="Bug">Not working (Bug)</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Request">Request</option>
                </select>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full bg-card-surface border border-white/10 rounded-lg p-2 text-sm text-white min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-accent-yellow"
                  required
                />

                {status === "error" && (
                  <p className="text-xs text-red-500">Failed to send. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || !message.trim()}
                  className="w-full bg-accent-yellow text-bg-primary font-bold text-sm py-2 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === "loading" ? "Sending..." : "Submit"}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
