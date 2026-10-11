import { SITE_URL } from "./site";

/** True in the build packaged inside the Android/iOS app (`npm run build:app`). */
export const IS_APP_BUNDLE = process.env.NEXT_PUBLIC_APP_BUNDLE === "1";

// The packaged app has no server of its own, so API calls go to the website.
const API_BASE = IS_APP_BUNDLE ? process.env.NEXT_PUBLIC_API_BASE || SITE_URL : "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Link to a show/movie page. The app can't have one page per TMDB id, so it uses ?id=. */
export function mediaPath(type: string, id: number | string): string {
  const movie = type === "movie";
  if (IS_APP_BUNDLE) return `/${movie ? "movie" : "show"}?id=${id}`;
  return `/${movie ? "movies" : "shows"}/${id}`;
}

/** Maps a website path (deep link, notification, ?next=) to the route that exists in this build. */
export function appPath(path: string): string {
  if (!IS_APP_BUNDLE) return path;
  const m = path.match(/^\/(shows|movies)\/(\d+)\/?(?:\?(.*))?$/);
  if (!m) return path;
  const target = mediaPath(m[1] === "movies" ? "movie" : "tv", m[2]);
  return m[3] ? `${target}&${m[3]}` : target;
}

/** Adds query params to a path that may already have some (app routes use ?id=). */
export function withQuery(path: string, params: Record<string, string>): string {
  return `${path}${path.includes("?") ? "&" : "?"}${new URLSearchParams(params)}`;
}

/** Inverse of appPath: the website URL path for an in-app route (used in emailed links). */
export function webPath(path: string): string {
  const m = path.match(/^\/(show|movie)\?id=(\d+)/);
  return m ? `/${m[1]}s/${m[2]}` : path;
}
