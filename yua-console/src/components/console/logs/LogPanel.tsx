"use client";

import { useEffect, useRef, useState } from "react";

export default function LogPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ev = new EventSource("/api/logs/stream");

    ev.onmessage = (event) => {
      if (paused) return;

      setLogs((prev) => [...prev, event.data]);
    };

    ev.onerror = () => {
      console.error("SSE connection closed.");
      ev.close();
    };

    return () => ev.close();
  }, [paused]);

  // Auto-scroll
  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, paused]);

  return (
    <div
      className="
        w-full h-64 rounded-xl border border-black/10 
        bg-white/60 backdrop-blur-xl shadow-md overflow-y-auto p-4 flex flex-col
      "
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-black">Logs</span>

        <button
          onClick={() => setPaused((p) => !p)}
          className="px-3 py-1 text-xs border border-black/20 rounded-md bg-white/70 hover:bg-white"
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {/* Log Contents */}
      <div className="text-xs text-black/70 whitespace-pre-wrap leading-5">
        {logs.map((line, i) => (
          <div
            key={i}
            className={line.includes("ERROR") ? "text-red-600" : ""}
          >
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
