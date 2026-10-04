"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";

const CURRENT_VERSION = "v5";
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
          <div className="relative bg-card-surface border border-accent-yellow/20 rounded-2xl max-w-md w-full p-8 shadow-2xl slide-up">
            <button 
              className="absolute top-4 right-4 text-text-muted hover:text-white" 
              onClick={handleClose}
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">🗣️</span>
                      <h2 className="text-2xl font-bold">You asked, we built!</h2>
            </div>
            <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-lg text-accent-yellow mb-1">New episode alerts &amp; calendar</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          See everything airing this week in the new Upcoming tab, and turn on email or push alerts from your Profile so you never miss a new episode.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-accent-yellow mb-1">Smarter progress</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Shows that get a new season now come back to your list automatically, and you can undo a mis-tapped episode.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-accent-yellow mb-1">Streaks, badges &amp; your year in TV</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Keep your watch streak alive, earn badges, and share your recap with friends.
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
