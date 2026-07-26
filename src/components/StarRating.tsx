"use client";

interface StarRatingProps {
  rating: number;
  onChange: (value: number) => void;
  maxStars?: number;
}

export default function StarRating({ rating, onChange, maxStars = 5 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: maxStars }, (_, index) => {
        const fill = Math.min(Math.max(rating - index, 0), 1);
        const fillPercent = `${fill * 100}%`;
        const starGradient = `linear-gradient(90deg, #FBBF24 0%, #FBBF24 ${fillPercent}, #9CA3AF ${fillPercent}, #9CA3AF 100%)`;

        return (
          <div key={index} className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 shadow-sm shadow-black/10 transition hover:bg-white/10">
            <button
              type="button"
              onClick={() => onChange(index + 0.5)}
              aria-label={`${index + 0.5} stars`}
              className="absolute inset-y-0 left-0 w-1/2 z-10"
            />
            <button
              type="button"
              onClick={() => onChange(index + 1)}
              aria-label={`${index + 1} stars`}
              className="absolute inset-y-0 right-0 w-1/2 z-10"
            />
            <span
              className="text-3xl"
              style={{
                backgroundImage: starGradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              ★
            </span>
          </div>
        );
      })}
      <span className="text-sm text-text-muted ml-2">{rating === 0 ? "No rating" : `${rating.toFixed(1)} / 5`}</span>
    </div>
  );
}
