"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { detectTvMode, moveFocus, type Direction } from "@/lib/tv";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Keyboard and TV-remote support:
 *  - Clickable cards (.cursor-pointer) become focusable and open with Enter/OK, everywhere.
 *  - In TV mode, arrow keys move focus spatially and focus gets a large highlight.
 */
export default function FocusNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    const tv = detectTvMode();
    if (tv) document.documentElement.classList.add("tv-mode");

    const enhance = () => {
      document
        .querySelectorAll<HTMLElement>(".cursor-pointer:not(a):not(button):not(input):not([tabindex])")
        .forEach((el) => {
          el.tabIndex = 0;
          if (!el.getAttribute("role")) el.setAttribute("role", "button");
        });
    };
    enhance();
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(enhance);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;

      if ((e.key === "Enter" || e.key === " ") && target.getAttribute("role") === "button" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        target.click();
        return;
      }

      if (!tv || !(e.key in ARROWS)) return;
      const dir = ARROWS[e.key];
      // Let text fields keep left/right for the cursor, and selects/textareas keep all arrows.
      if (tag === "TEXTAREA" || tag === "SELECT") return;
      if (tag === "INPUT" && (dir === "left" || dir === "right")) return;
      if (moveFocus(dir)) e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // On TV, land focus inside the new page so the remote works immediately.
  useEffect(() => {
    if (!document.documentElement.classList.contains("tv-mode")) return;
    const timer = setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      moveFocus("down");
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
