export interface RecapParams {
  name: string;
  year: string;
  eps: number;
  movies: number;
  hours: number;
  streak: number;
  top: string[];
}

const num = (v: string | null | undefined) => {
  const n = Number.parseInt(v || "0", 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000) : 0;
};

/** Values come from the share URL, so everything is clamped and length-limited. */
export function parseRecapParams(get: (key: string) => string | null | undefined): RecapParams {
  const year = (get("year") || "").match(/^\d{4}$/) ? (get("year") as string) : String(new Date().getFullYear());
  return {
    name: (get("name") || "A TTT viewer").slice(0, 30),
    year,
    eps: num(get("eps")),
    movies: num(get("movies")),
    hours: num(get("hours")),
    streak: num(get("streak")),
    top: (get("top") || "")
      .split("|")
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 3),
  };
}

export function recapQuery(p: RecapParams): string {
  return new URLSearchParams({
    name: p.name,
    year: p.year,
    eps: String(p.eps),
    movies: String(p.movies),
    hours: String(p.hours),
    streak: String(p.streak),
    top: p.top.join("|"),
  }).toString();
}
