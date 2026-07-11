"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the captcha verification.");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, captchaToken);
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
          <div className="flex justify-center my-4">
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
              onVerify={(token) => setCaptchaToken(token)}
            />
          </div>
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
          <a href="/login" className="text-accent-yellow hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
