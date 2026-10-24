"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PENDING_TERMS_KEY } from "@/components/GoogleButton";
import { MIN_AGE, TERMS_VERSION } from "@/lib/site";
import { track } from "@/lib/analytics";

const READABLE_PAGES = ["/terms", "/privacy", "/about", "/contact"];

/** Signed-in users who haven't accepted the current Terms (existing users, Google sign-ups) must accept to continue. */
export default function TermsGate() {
  const { user, loading, acceptTerms, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsAcceptance = !loading && !!user && user.user_metadata?.terms_accepted_version !== TERMS_VERSION;

  // Agreed on the sign-up page, then signed up with Google: record it without asking again
  useEffect(() => {
    if (!needsAcceptance || localStorage.getItem(PENDING_TERMS_KEY) !== TERMS_VERSION) return;
    localStorage.removeItem(PENDING_TERMS_KEY);
    acceptTerms().then((r) => !r.error && track("terms_accepted", { version: TERMS_VERSION, source: "signup_google" }));
  }, [needsAcceptance, acceptTerms]);

  if (!needsAcceptance || !user) return null;
  if (READABLE_PAGES.includes(pathname)) return null;
  if (localStorage.getItem(PENDING_TERMS_KEY) === TERMS_VERSION) return null;

  const isUpdate = Boolean(user.user_metadata?.terms_accepted_version);

  const accept = async () => {
    if (!checked) return;
    setSaving(true);
    setError("");
    const result = await acceptTerms();
    setSaving(false);
    if (result.error) setError(result.error);
    else track("terms_accepted", { version: TERMS_VERSION, update: isUpdate });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="terms-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-card-surface p-6 shadow-2xl">
        <h2 id="terms-title" className="text-xl font-bold">
          {isUpdate ? "We've updated our Terms" : "Before you continue"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Please review and accept our <Link href="/terms" className="text-accent-yellow underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-accent-yellow underline">Privacy Policy</Link> to keep using TTT. Your shows and
          history are not affected.
        </p>

        <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#FFD200]"
          />
          <span>
            I am {MIN_AGE} or older, I agree to the Terms of Service and Privacy Policy, and I understand I am solely
            responsible for the content I post and how I use the platform.
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          onClick={accept}
          disabled={!checked || saving}
          className="mt-5 w-full rounded-xl bg-accent-yellow py-3 font-bold text-bg-primary transition-all hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Accept and continue"}
        </button>
        <button
          onClick={() => signOut().then(() => router.push("/"))}
          className="mt-2 w-full py-2 text-sm text-text-muted hover:text-text-primary"
        >
          Decline and sign out
        </button>
      </div>
    </div>
  );
}
