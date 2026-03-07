"use client";

import { useTerminal } from "@/hooks/useTerminal";

export default function ShellTabs() {
  const { mode, setMode } = useTerminal();

  const tabClass = (active: boolean) =>
    `
    px-5 py-2 text-sm
    border-b-2 transition-all duration-200
    ${
      active
        ? "border-black text-black font-semibold"
        : "border-transparent text-black/40 hover:text-black hover:border-black/30"
    }
    `;

  return (
    <div
      className="
        flex 
        bg-white/70 backdrop-blur-xl
        border-b border-black/10
        text-sm select-none
      "
    >
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
        YUA Shell
      </button>
    </div>
  );
}
