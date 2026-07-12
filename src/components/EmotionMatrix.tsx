"use client";

import { EMOTIONS } from "@/lib/types";

interface EmotionMatrixProps {
  onSelect: (emotion: string) => void;
  onClose: () => void;
  onSnooze?: () => void;
}

export default function EmotionMatrix({ onSelect, onClose, onSnooze }: EmotionMatrixProps) {
  return (
    <div className="slide-up fixed inset-x-0 bottom-[60px] z-50 pointer-events-none pb-4">
      <div className="bg-card-surface/95 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl max-w-2xl mx-auto pointer-events-auto mx-4 sm:mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">
            How did this episode make you feel?
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {EMOTIONS.map((e) => (
            <button
              key={e.label}
              onClick={() => onSelect(e.label)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105 transition-all"
            >
              <span className="text-3xl sm:text-4xl">{e.emoji}</span>
              <span className="text-xs sm:text-sm font-medium text-text-muted">{e.label}</span>
            </button>
          ))}
        </div>
        {onSnooze && (
          <div className="mt-6 flex justify-center">
            <button 
              onClick={onSnooze}
              className="text-xs text-text-muted hover:text-white underline decoration-white/30 hover:decoration-white transition-all"
            >
              Snooze for 1 week
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
