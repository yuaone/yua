"use client";

import { useState, useRef, useEffect } from "react";

// LEFT SIDE (Files)
import FileExplorer from "@/components/console/files/FileExplorer";

// CENTER (Editor)
import EditorPanel from "@/components/console/editor/EditorPanel";

// RIGHT BOTTOM (Terminal)
import TerminalPanel from "@/components/console/terminal/TerminalPanel";

// RIGHT BOTTOM (Logs)
import LogPanel from "@/components/console/logs/LogPanel";

// HEADER (Status)
import ShellStatus from "@/components/console/ShellStatus";
import ShellToggle from "@/components/console/ShellToggle";

export default function ConsolePage() {
  const [openedFile, setOpenedFile] = useState<string | null>(null);

  /** ============ Split Panel State ============ */
  const [editorHeight, setEditorHeight] = useState(380);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);

  /** Drag Start */
  const startDrag = () => {
    isDragging.current = true;
  };

  /** Drag Move */
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const top = containerRef.current.getBoundingClientRect().top;
    const newHeight = e.clientY - top;

    const minH = 200;
    const maxH = 700;

    if (newHeight >= minH && newHeight <= maxH) {
      setEditorHeight(newHeight);
    }
  };

  /** Drag End */
  const stopDrag = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-10 py-10">

      {/* ================================================= */}
      {/* HEADER SECTION                                    */}
      {/* ================================================= */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        {/* LEFT */}
        <div className="flex flex-col gap-2">
          <span
            className="
              rounded-full border border-black/10
              bg-white/70 backdrop-blur-xl
              px-3 py-1 text-[11px] font-medium
              uppercase tracking-[0.18em] text-black/60
            "
          >
            Developer Console
          </span>

          <h1 className="text-3xl font-bold text-black leading-tight">
            YUA ONE{" "}
            <span className="text-transparent bg-gradient-to-r from-black to-black/50 bg-clip-text">
              개발 콘솔
            </span>
          </h1>

          <p className="max-w-[520px] text-sm text-black/60">
            File Explorer · Editor · Terminal · Logs <br />
            AGI 개발 환경을 위한 통합 개발 콘솔입니다.
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col items-end gap-2 text-xs text-black/60">
          <ShellStatus />
          <ShellToggle />
        </div>
      </section>

      {/* ================================================= */}
      {/* MAIN PANEL LAYOUT                                 */}
      {/* ================================================= */}
      <section className="grid grid-cols-[260px_1fr] gap-6 w-full min-h-[720px]">

        {/* LEFT: FILE EXPLORER */}
        <div
          className="
            w-full h-full rounded-xl
            bg-white/70 backdrop-blur-xl
            border border-black/10 shadow-md overflow-hidden
          "
        >
          <div className="p-4 h-full">
            <FileExplorer onOpenFile={(name) => setOpenedFile(name)} />
          </div>
        </div>

        {/* RIGHT: EDITOR + TERMINAL (RESIZABLE) */}
        <div className="flex flex-col h-full gap-4" ref={containerRef}>

          {/* EDITOR PANEL */}
          <div
            className="
              rounded-xl bg-white/70 backdrop-blur-xl
              border border-black/10 shadow-md overflow-hidden
            "
            style={{ height: editorHeight }}
          >
            <EditorPanel fileName={openedFile} />
          </div>

          {/* DRAG BAR */}
          <div
            onMouseDown={startDrag}
            className="
              w-full h-3 cursor-row-resize
              bg-black/5 hover:bg-black/20
              transition-colors rounded-md
            "
          />

          {/* TERMINAL PANEL */}
          <div
            className="
              flex-1 min-h-[200px]
              rounded-xl bg-white/70 backdrop-blur-xl
              border border-black/10 shadow-md overflow-hidden
            "
          >
            {/* ✅ ShellMode SSOT 적용 */}
            <TerminalPanel instanceId="local" mode="yua" />
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* LOGS PANEL                                        */}
      {/* ================================================= */}
      <section className="w-full">
        <LogPanel />
      </section>
    </div>
  );
}
