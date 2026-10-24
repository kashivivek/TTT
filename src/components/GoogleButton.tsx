"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { track } from "@/lib/analytics";
import { TERMS_VERSION } from "@/lib/site";

/** Set before a sign-up via Google so TermsGate records the acceptance after the redirect. */
export const PENDING_TERMS_KEY = "ttt-terms-agreed";

interface GoogleButtonProps {
  next?: string;
  label?: string;
  disabled?: boolean;
  /** Shown instead of starting sign-in when disabled (e.g. terms not accepted yet). */
  onBlocked?: () => void;
  /** The user ticked the Terms/age checkbox on the sign-up page. */
  agreedToTerms?: boolean;
}

export default function GoogleButton({ next, label = "Continue with Google", disabled, onBlocked, agreedToTerms }: GoogleButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onClick = async () => {
    if (disabled) {
      onBlocked?.();
      return;
    }
    setBusy(true);
    setError("");
    track("google_sign_in_start");
    if (agreedToTerms) localStorage.setItem(PENDING_TERMS_KEY, TERMS_VERSION);
    const result = await signInWithGoogle(next);
    if (result.error) setError(result.error);
    setBusy(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-disabled={disabled}
        className={`w-full flex items-center justify-center gap-3 rounded-xl bg-white py-3 font-semibold text-[#1f1f1f] transition-all hover:bg-gray-100 disabled:opacity-60 ${disabled ? "opacity-60" : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {busy ? "Opening Google..." : label}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
