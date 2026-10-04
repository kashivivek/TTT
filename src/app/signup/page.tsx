"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-redirect";
import { track } from "@/lib/analytics";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, next);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    track("sign_up", { next });
    if (result.needsConfirmation) {
      setCheckEmail(true);
      setLoading(false);
    } else {
      router.push(next);
    }
  };

  if (checkEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-extrabold mb-2">Check your email</h1>
          <p className="text-text-muted">
            We sent a confirmation link to <strong className="text-text-primary">{email}</strong>. Click it to finish
            creating your account.
          </p>
        </div>
      </main>
    );
  }

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
          Create your account
        </h1>
        <p className="text-text-muted text-center mb-8">
          Start tracking your shows in seconds
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full bg-card-surface text-text-primary rounded-xl px-4 py-3
                       border border-transparent focus:border-accent-yellow outline-none
                       placeholder:text-text-muted"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full bg-card-surface text-text-primary rounded-xl px-4 py-3
                       border border-transparent focus:border-accent-yellow outline-none
                       placeholder:text-text-muted"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-yellow text-bg-primary font-bold py-3 rounded-xl
                       hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up Free"}
          </button>
        </form>

        <p className="text-text-muted text-sm text-center mt-6">
          Already have an account?{" "}
          <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-accent-yellow hover:underline">
            Log in
          </Link>
        </p>
        <p className="text-text-muted text-xs text-center mt-4">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline hover:text-text-primary">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-text-primary">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
