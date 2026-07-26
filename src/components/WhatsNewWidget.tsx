"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";

const CURRENT_VERSION = "v3";

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
      const lastSeen = user.user_metadata?.last_seen_whats_new;
      if (lastSeen !== CURRENT_VERSION) {
        setIsOpen(true);
      }
      setHasChecked(true);
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
                <h3 className="font-bold text-lg text-accent-yellow mb-1">AI-powered suggestions</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Get personalized movie and TV recommendations powered by AI. Just describe what you're in the mood for!
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-1">Where to watch</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your preferred streaming providers show up instantly in the title view.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-1">Episode info</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Episode details and upcoming air dates now appear more reliably with improved TV Time sync.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-1">Reviews & ratings</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your reviews and ratings save together and stay visible immediately after submitting.
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
