"use client";

import { useState } from "react";

interface CheckCircleProps {
  checked: boolean;
  onCheck: () => void;
}

export default function CheckCircle({ checked, onCheck }: CheckCircleProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (checked) return;
    setAnimating(true);
    onCheck();
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={checked ? "Marked as watched" : "Mark as watched"}
      className={`
        flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-300 ease-in-out cursor-pointer
        ${
          checked
            ? "bg-success-green scale-110"
            : "border-2 border-gray-400 hover:border-accent-yellow"
        }
        ${animating ? "scale-125" : ""}
      `}
    >
      {checked && (
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}
