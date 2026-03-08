import React, { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { desktop, isDesktop, isMac } from "@/lib/desktop-bridge";

/**
 * Custom TitleBar for frameless Electron window.
 *
 * macOS  — OS-rendered traffic lights (left), centered "YUA" title, draggable region.
 * Windows — "YUA" title left-aligned, custom minimize/maximize/close buttons right-aligned.
 *
 * Height: 48px (h-12). Uses `-webkit-app-region: drag` for window dragging.
 */
export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;

    // Check initial maximized state
    desktop!.isMaximized().then(setMaximized);

    // Subscribe to maximize/unmaximize events
    const unsub = desktop!.onWindowMaximized((val) => setMaximized(val));
    return unsub;
  }, []);

  return (
    <div
      className="
        flex items-center h-12 select-none shrink-0
        bg-[var(--surface-main)]
        border-b border-black/[0.04] dark:border-white/[0.06]
      "
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {isMac ? (
        /* ── macOS Layout ── */
        <>
          {/* Reserve space for OS-rendered traffic lights (close/minimize/zoom) */}
          <div className="w-[80px] shrink-0" />

          {/* Centered title */}
          <div className="flex-1 text-center text-[13px] font-semibold text-[var(--text-muted)] tracking-wide truncate">
            YUA
          </div>

          {/* Balance the traffic-light spacer so the title stays centered */}
          <div className="w-[80px] shrink-0" />
        </>
      ) : (
        /* ── Windows / Linux Layout ── */
        <>
          {/* Left: app title */}
          <div className="flex items-center gap-2 pl-4 shrink-0">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              YUA
            </span>
          </div>

          {/* Spacer — draggable */}
          <div className="flex-1" />

          {/* Right: window control buttons */}
          <div
            className="flex items-center h-full"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {/* Minimize */}
            <button
              onClick={() => desktop?.minimize()}
              className="
                w-11 h-full flex items-center justify-center
                hover:bg-black/[0.06] dark:hover:bg-white/[0.08]
                transition-all duration-150
              "
              aria-label="Minimize"
            >
              <Minus className="w-[14px] h-[14px] text-[var(--text-muted)]" />
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={() => desktop?.maximize()}
              className="
                w-11 h-full flex items-center justify-center
                hover:bg-black/[0.06] dark:hover:bg-white/[0.08]
                transition-all duration-150
              "
              aria-label={maximized ? "Restore" : "Maximize"}
            >
              {maximized ? (
                <Copy className="w-[13px] h-[13px] text-[var(--text-muted)] rotate-90" />
              ) : (
                <Square className="w-[12px] h-[12px] text-[var(--text-muted)]" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={() => desktop?.close()}
              className="
                w-11 h-full flex items-center justify-center
                hover:bg-red-500/90 dark:hover:bg-red-500/80
                transition-all duration-150 group
              "
              aria-label="Close"
            >
              <X className="w-[14px] h-[14px] text-[var(--text-muted)] group-hover:text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
