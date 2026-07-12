"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";

const CURRENT_VERSION = "v2";

export default function WhatsNewWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

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
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-2">Instant Dashboard & TV Time Imports</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  We've completely rewritten our syncing engine! Your dashboard will now load instantaneously without any API lag. Plus, TV Time zip imports now intelligently advance all your shows behind the scenes and accurately track future air dates for Upcoming Episodes.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-2">Movie Tracking Fixes</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Finished movies now correctly stay in your tracked list under the "Completed" section instead of disappearing when marked as watched.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg text-accent-yellow mb-2">Season-Level Watching & Snooze</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  You can still mark an entire season as watched with a single click, and snooze the feedback popup for a week directly from the window!
                </p>
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
