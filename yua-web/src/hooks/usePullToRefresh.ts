"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight pull-to-refresh for mobile browsers.
 * Attaches to a scroll container (ref) and reloads the page
 * when the user pulls down past the threshold at scrollTop === 0.
 */
export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement | null>,
  { threshold = 80, enabled = true }: { threshold?: number; enabled?: boolean } = {}
) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const indicator = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    // Only on touch devices
    const isTouchDevice = "ontouchstart" in window;
    if (!isTouchDevice) return;

    const getIndicator = () => {
      if (!indicator.current) {
        const div = document.createElement("div");
        div.style.cssText =
          "position:fixed;top:0;left:0;right:0;height:0;display:flex;align-items:center;justify-content:center;z-index:9999;overflow:hidden;transition:height 0.15s ease;pointer-events:none;";
        div.innerHTML =
          '<span style="font-size:13px;color:var(--text-secondary,#888);opacity:0.7">↓ 당겨서 새로고침</span>';
        document.body.appendChild(div);
        indicator.current = div;
      }
      return indicator.current;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        pulling.current = false;
        const ind = indicator.current;
        if (ind) ind.style.height = "0";
        return;
      }
      if (el.scrollTop > 0) {
        pulling.current = false;
        return;
      }
      const progress = Math.min(dy / threshold, 1);
      const ind = getIndicator();
      ind.style.height = `${Math.min(dy * 0.5, 48)}px`;
      const span = ind.querySelector("span") as HTMLSpanElement | null;
      if (span) {
        span.textContent = progress >= 1 ? "↑ 놓으면 새로고침" : "↓ 당겨서 새로고침";
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      const ind = indicator.current;
      if (ind) ind.style.height = "0";
      // Check final distance — if we showed the indicator, touchend fires
      // We rely on the indicator text to know if threshold was met
      const span = ind?.querySelector("span") as HTMLSpanElement | null;
      if (span?.textContent?.includes("놓으면")) {
        window.location.reload();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (indicator.current) {
        indicator.current.remove();
        indicator.current = null;
      }
    };
  }, [scrollRef, threshold, enabled]);
}
