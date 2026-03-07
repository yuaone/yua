"use client";

import { useTerminal } from "@/hooks/useTerminal";

export default function ShellToggle() {
  const { mode, switchMode } = useTerminal();

  const label =
    mode === "linux"
      ? "→ YUA Shell 전환"
      : "→ Linux Shell 전환";

  return (
    <button
      onClick={switchMode}
      className="
        px-3 py-1.5 rounded-lg text-xs font-medium
        bg-slate-800 border border-slate-600 text-slate-200
        hover:bg-slate-700 hover:border-slate-500
        transition-all active:scale-[0.98]
      "
    >
      {label}
    </button>
  );
}
