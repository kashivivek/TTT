"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { isNativeApp } from "@/lib/native";

const CURRENT_VERSION = "v6";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=online.tvtime.app";
const NEW_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;

export default function WhatsNewWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && !hasChecked) {
      setHasChecked(true);
      const lastSeen = user.user_metadata?.last_seen_whats_new;
      if (lastSeen === CURRENT_VERSION) return;
      // New accounts get onboarding instead of a changelog; don't stack pop-ups.
      const isNewAccount = Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_MS;
      if (isNewAccount) {
        getSupabase().auth.updateUser({ data: { last_seen_whats_new: CURRENT_VERSION } }).catch(() => {});
        return;
      }
      setIsOpen(true);
    }
  }, [user, hasChecked]);

  const handleClose = async () => {
    setIsOpen(false);
    if (user && user.user_metadata?.last_seen_whats_new !== CURRENT_VERSION) {
      try {
        await getSupabase().auth.updateUser({
          data: { last_seen_whats_new: CURRENT_VERSION }
        });
      } catch (e) {
        console.error("Failed to update what's new status", e);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 rounded-full bg-card-surface border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
        title="Recent Updates"
      >
        ✨
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={handleClose} 
          />
          <div className="relative bg-card-surface border border-accent-yellow/20 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl slide-up">
            <button 
              className="absolute top-4 right-4 text-text-muted hover:text-white" 
              onClick={handleClose}
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">🎉</span>
                      <h2 className="text-2xl font-bold">TTT is now on Google Play!</h2>
            </div>
            <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-lg text-accent-yellow mb-1">Get the Android app</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Track your shows on your phone, tablet and Android TV with the same account, and get new-episode alerts as real push notifications.
                        </p>
                        {isNativeApp() ? (
                          <p className="mt-3 text-sm text-white">You&apos;re already using it — thanks! A Play Store rating helps a lot. ⭐</p>
                        ) : (
                          <>
                            <a
                              href={PLAY_STORE_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-block"
                            >
                              <img src="/badges/google-play-badge.png" alt="Get it on Google Play" width={646} height={250} className="h-16 w-auto -ml-2" />
                            </a>
                            <p className="text-[10px] text-text-muted">Google Play and the Google Play logo are trademarks of Google LLC.</p>
                          </>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-accent-yellow mb-1">Open your streaming apps directly</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Tap Netflix, Prime Video, Disney+ and more under Where to Watch to jump straight to the title.
                        </p>
                      </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <button
                  onClick={() => setShowPrevious((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-3 text-left text-sm text-white font-semibold"
                >
                  <span>Previous Updates</span>
                  <span className="text-accent-yellow">{showPrevious ? "Hide" : "Show"}</span>
                </button>
                {showPrevious && (
                  <ul className="mt-4 text-sm text-text-muted space-y-2 list-disc list-inside">
                    <li>New episode alerts and the Upcoming calendar.</li>
                    <li>Shows with a new season return to your list automatically; undo a mis-tapped episode.</li>
                    <li>Watch streaks, badges and a shareable year-in-TV recap.</li>
                    <li>AI-powered, personalized recommendations with the ✨ Suggest me button.</li>
                    <li>Instant dashboard speed improvements and better TV Time import handling.</li>
                    <li>Movie tracking now keeps completed titles in your tracked list.</li>
                    <li>Season-level watched actions and feedback snooze support.</li>
                  </ul>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              className="mt-8 w-full bg-accent-yellow text-bg-primary font-bold py-3 rounded-xl hover:brightness-110 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
