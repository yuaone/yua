"use client";

import { useTerminal } from "@/hooks/useTerminal";

export default function ShellStatus() {
  const { mode, connected } = useTerminal();

  const modeLabel =
    mode === "linux" ? "Linux Shell" : "YUA Shell";

  return (
    <div className="flex flex-col items-end text-xs text-slate-400 leading-tight">

      {/* MODE 상태 */}
      <span>
        Mode:{" "}
        <span className="text-emerald-300 font-semibold">
          {modeLabel}
        </span>
      </span>

      {/* SSH 상태는 Linux 모드에서만 표시 */}
      {mode === "linux" && (
        <span className="flex items-center gap-1">
          SSH:{" "}
          <span
            className={
              connected
                ? "text-emerald-300 font-medium"
                : "text-red-400 font-medium"
            }
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </span>
      )}
    </div>
  );
}
