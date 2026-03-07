// 📂 src/components/instance/LogsPanel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, ChevronDown } from "lucide-react";

interface LogsPanelProps {
  instanceId: string;
}

export default function LogsPanel({ instanceId }: LogsPanelProps) {
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scrollLock, setScrollLock] = useState(true);

  const [logs, setLogs] = useState<string[]>([]);
  const eventRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const connect = () => {
    const ev = new EventSource(`/api/instance/${instanceId}/logs/stream`);
    eventRef.current = ev;

    ev.onopen = () => setConnected(true);

    ev.onmessage = (event) => {
      if (!event.data || paused) return;
      setLogs((prev) => [...prev, event.data]);
    };

    ev.onerror = () => {
      setConnected(false);
      ev.close();
      setTimeout(connect, 1500);
    };
  };

  useEffect(() => {
    connect();
    return () => eventRef.current?.close();
  }, [instanceId]);

  useEffect(() => {
    if (!scrollLock || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="glass border border-black/10 rounded-lg p-3 flex items-center justify-between">
        <div className="text-sm text-black/70 flex items-center gap-3">
          <span>Live Logs</span>
          <span className={connected ? "text-green-600" : "text-red-600"}>
            {connected ? "● Connected" : "● Reconnecting..."}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setPaused(!paused)}
            className="px-3 py-2 bg-black text-white text-xs rounded-lg hover:bg-black/80 flex items-center gap-2"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Resume" : "Pause"}
          </button>

          <label className="flex items-center gap-2 text-xs text-black/70">
            <input
              type="checkbox"
              checked={scrollLock}
              onChange={() => setScrollLock(!scrollLock)}
            />
            Scroll Lock
          </label>
        </div>
      </div>

      {/* Logs */}
      <div
        ref={containerRef}
        className="bg-[#0f172a] text-white rounded-lg border border-black/20 
          p-4 h-[500px] overflow-auto font-mono text-sm whitespace-pre-wrap"
      >
        {logs.length === 0 ? (
          <span className="text-white/50">Waiting for logs...</span>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              className={
                line.includes("ERROR")
                  ? "text-red-400"
                  : line.includes("WARN")
                  ? "text-yellow-400"
                  : "text-white"
              }
            >
              {line}
            </div>
          ))
        )}
      </div>

      {/* Scroll bottom */}
      <button
        onClick={() => {
          if (containerRef.current)
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }}
        className="mx-auto text-xs text-black/60 hover:underline flex items-center gap-1"
      >
        <ChevronDown size={14} /> Scroll Bottom
      </button>
    </div>
  );
}
