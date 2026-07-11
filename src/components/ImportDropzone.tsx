"use client";

import { useCallback, useState, useRef } from "react";

interface ImportDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function ImportDropzone({
  onFileSelected,
  disabled,
}: ImportDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".zip")) {
        onFileSelected(file);
      }
    },
    [onFileSelected, disabled]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
        transition-all duration-200
        ${
          dragging
            ? "border-accent-yellow bg-accent-yellow/10 scale-[1.02]"
            : "border-gray-600 hover:border-gray-400"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-12 h-12 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-text-primary font-semibold">
          Drop your data export here
        </p>
        <p className="text-text-muted text-sm">
          Drag &amp; drop your .zip export file, or click to browse
        </p>
      </div>
    </div>
  );
}
