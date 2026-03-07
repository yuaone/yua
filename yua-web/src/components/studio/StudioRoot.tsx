"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStudioContext } from "@/store/useStudioContext";
import StudioImageOverlay from "./StudioImageOverlay";

/**
 * StudioRoot (SSOT)
 *
 * 책임:
 * - Studio 실행 여부 판단
 * - overlay vs page 분기
 */
export default function StudioRoot() {
  const { active, entry, closeStudio, clear } = useStudioContext();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const didNavigate = useRef(false);

  // Auto-clear persisted studio state when NOT on a studio route
  useEffect(() => {
    if (!active) return;
    const isStudioRoute = pathname.startsWith("/studio");
    if (!isStudioRoute && entry?.mode !== "image") {
      // persisted state is stale — user navigated away from studio
      clear();
    }
  }, [active, pathname, entry?.mode, clear]);

  // ESC 전역 처리 (overlay 전용)
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeStudio();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () =>
      window.removeEventListener("keydown", onKeyDown);
  }, [active, closeStudio]);

  // document / video → page routing (must be in useEffect, not render body)
  useEffect(() => {
    if (!active || !entry) return;
    if (entry.mode === "image") return;

    // Only navigate if we're not already on the target studio route
    const targetPath = `/studio/${entry.mode}`;
    if (pathname.startsWith(targetPath)) return;

    // Prevent repeated navigation
    if (didNavigate.current) return;
    didNavigate.current = true;

    router.replace(targetPath);
  }, [active, entry, router, pathname]);

  // Reset navigation guard when studio closes
  useEffect(() => {
    if (!active) {
      didNavigate.current = false;
    }
  }, [active]);

  if (!active || !entry) return null;

  if (entry.mode === "image") return <StudioImageOverlay />;

  // Page-based modes navigate via useEffect above
  return null;
}
