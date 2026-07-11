import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#141414",
        "card-surface": "#1F1F1F",
        "accent-yellow": "#FFD200",
        "success-green": "#66BB6A",
        "text-primary": "#FFFFFF",
        "text-muted": "#9CA3AF",
      },
    },
  },
  plugins: [],
};

export default config;
