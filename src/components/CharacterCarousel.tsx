"use client";

interface CharacterCarouselProps {
  characters: Array<{ name: string; profile_path: string | null }>;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function CharacterCarousel({
  characters,
  onSelect,
  onClose,
}: CharacterCarouselProps) {
  if (characters.length === 0) return null;

  return (
    <div className="slide-up fixed inset-x-0 bottom-0 z-50 bg-card-surface rounded-t-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">
          Who stood out this episode?
        </h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-white text-xl"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {characters.map((c) => (
          <button
            key={c.name}
            onClick={() => onSelect(c.name)}
            className="flex flex-col items-center gap-2 min-w-[72px]"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-primary border-2 border-transparent hover:border-accent-yellow transition-colors">
              {c.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-xl">
                  ?
                </div>
              )}
            </div>
            <span className="text-xs text-text-muted text-center leading-tight truncate w-16">
              {c.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
