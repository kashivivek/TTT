import { appPlatform, isNativeApp } from "./native";

const OVERRIDE_KEY = "ttt-tv-mode";

/**
 * TV mode = the Android app running on a TV (no touchscreen), or forced with ?tv=1 for testing
 * in a desktop browser (?tv=0 turns it off again).
 */
export function detectTvMode(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("tv");
  if (param === "1") localStorage.setItem(OVERRIDE_KEY, "1");
  if (param === "0") localStorage.removeItem(OVERRIDE_KEY);
  if (localStorage.getItem(OVERRIDE_KEY) === "1") return true;
  return isNativeApp() && appPlatform() === "android" && navigator.maxTouchPoints === 0;
}

export function isTvMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("tv-mode");
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.closest("[aria-hidden='true'], [inert]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
}

export type Direction = "up" | "down" | "left" | "right";

/** Moves focus to the nearest focusable element in a direction (D-pad navigation). */
export function moveFocus(dir: Direction): boolean {
  const current = document.activeElement as HTMLElement | null;
  const items = visibleFocusables();
  if (!current || current === document.body || !items.includes(current)) {
    const first = items.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight;
    });
    first?.focus();
    return !!first;
  }

  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of items) {
    // Nested targets are allowed so a card's inner button (e.g. the watched check) is reachable.
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const sameRow = r.top < from.bottom && r.bottom > from.top;
    let primary: number;
    let cross: number;
    // Left/right only move within the same row, like TV launchers.
    if (dir === "right") {
      if (cx <= fx + 1 || !sameRow) continue;
      primary = Math.max(0, r.left - from.right);
      cross = Math.abs(cy - fy) * 0.1;
    } else if (dir === "left") {
      if (cx >= fx - 1 || !sameRow) continue;
      primary = Math.max(0, from.left - r.right);
      cross = Math.abs(cy - fy) * 0.1;
    } else if (dir === "down") {
      if (cy <= fy + 1) continue;
      primary = Math.max(0, r.top - from.bottom);
      cross = Math.max(0, Math.max(r.left, from.left) - Math.min(r.right, from.right)) || Math.abs(cx - fx) * 0.1;
    } else {
      if (cy >= fy - 1) continue;
      primary = Math.max(0, from.top - r.bottom);
      cross = Math.max(0, Math.max(r.left, from.left) - Math.min(r.right, from.right)) || Math.abs(cx - fx) * 0.1;
    }
    const score = primary + cross * 1.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (!best) return false;
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  return true;
}
