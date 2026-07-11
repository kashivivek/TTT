"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a
          href="/"
          className="text-accent-yellow text-sm hover:underline mb-8 block text-center"
        >
          ← Back to home
        </a>
        <h1 className="text-3xl font-extrabold text-text-primary text-center mb-2">
          Welcome back
        </h1>
        <p className="text-text-muted text-center mb-8">
          Log in to continue tracking your shows
        </p>

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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
            className="w-full bg-card-surface text-text-primary rounded-xl px-4 py-3
                       border border-transparent focus:border-accent-yellow outline-none
                       placeholder:text-text-muted"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-yellow text-bg-primary font-bold py-3 rounded-xl
                       hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-text-muted text-sm text-center mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-accent-yellow hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
