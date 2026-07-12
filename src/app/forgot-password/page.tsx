"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a
          href="/login"
          className="text-accent-yellow text-sm hover:underline mb-8 block text-center"
        >
          ← Back to login
        </a>
        <h1 className="text-3xl font-extrabold text-text-primary text-center mb-2">
          Reset Password
        </h1>
        <p className="text-text-muted text-center mb-8">
          Enter your email to receive a password reset link
        </p>

        {success ? (
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-6 text-center">
            <h3 className="font-bold text-green-400 mb-2">Check your email</h3>
            <p className="text-sm text-green-200">
              We've sent a password reset link to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-card-surface text-text-primary rounded-xl px-4 py-3
                         border border-transparent focus:border-accent-yellow outline-none
                         placeholder:text-text-muted"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-accent-yellow text-bg-primary font-bold py-3 rounded-xl
                         hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
