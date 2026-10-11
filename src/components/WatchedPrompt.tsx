"use client";

interface WatchedPromptProps {
  label: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** Shown when the user arrives from a "Finished it?" reminder. */
export default function WatchedPrompt({ label, onConfirm, onDismiss }: WatchedPromptProps) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-[90] flex justify-center px-4 slide-up">
      <div className="w-full max-w-md rounded-2xl border border-accent-yellow/40 bg-card-surface p-4 shadow-2xl">
        <p className="font-semibold">Finished {label}?</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onConfirm}
            autoFocus
            className="flex-1 rounded-xl bg-accent-yellow py-2.5 font-bold text-bg-primary hover:brightness-110"
          >
            ✓ Mark watched
          </button>
          <button onClick={onDismiss} className="flex-1 rounded-xl bg-white/10 py-2.5 font-semibold hover:bg-white/15">
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
