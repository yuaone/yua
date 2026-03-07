"use client";

import { useState } from "react";
import TerminalPanel from "./TerminalPanel";

type TerminalMode = "linux" | "yua";

type Props = {
  instanceId: string;
  popup?: boolean;
};

export default function TerminalLayout({ instanceId, popup }: Props) {
  const [mode, setMode] = useState<TerminalMode>("linux");

  const tabClass = (active: boolean) =>
    `
      px-5 py-2 text-sm select-none
      transition-all duration-200 border-b-2
      ${
        active
          ? "border-black text-black font-semibold"
          : "border-transparent text-black/40 hover:text-black hover:border-black/30"
      }
    `;

  return (
    <div className="flex flex-col w-full h-full bg-white/70 backdrop-blur-xl">
      {/* Tabs */}
      <div className="flex border-b border-black/10 bg-white/60 backdrop-blur-xl">
        <button
          className={tabClass(mode === "linux")}
          onClick={() => setMode("linux")}
        >
          Linux Shell
        </button>

        <button
          className={tabClass(mode === "yua")}
          onClick={() => setMode("yua")}
        >
          YUA Shell ⚛️
        </button>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 min-h-0">
        <TerminalPanel
          instanceId={instanceId}
          mode={mode}
          popup={popup}
        />
      </div>
    </div>
  );
}
