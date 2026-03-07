"use client";

import { useEffect, useRef } from "react";

export default function SSHTerminalWindow({
  instanceId,
}: {
  instanceId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let term: any;
    let ws: WebSocket | null = null;

    async function init() {
      if (!containerRef.current) return;

      await import("xterm/css/xterm.css");
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "monospace",
        theme: {
          background: "#0f172a",
          foreground: "#ffffff",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      const base = process.env.NEXT_PUBLIC_SSH_URL;
      if (!base) {
        term.writeln("❌ SSH URL not configured");
        return;
      }

      ws = new WebSocket(`${base}?instance=${instanceId}`);

      ws.onopen = () => {
        term.writeln(`🟢 Connected to instance ${instanceId}\r\n`);
      };

      ws.onmessage = (e) => {
        if (e.data === "__ping__") {
          ws?.send("__pong__");
          return;
        }
        term.write(String(e.data));
      };

      ws.onclose = () => {
        term.writeln("\r\n🔴 SSH Disconnected.");
      };

      // ✅ 타입 명시 (핵심 수정)
      term.onData((data: string) => {
        ws?.send(data);
      });

      window.addEventListener("resize", () => {
        fitAddon.fit();
        ws?.send(
          JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          })
        );
      });
    }

    init();

    return () => {
      try {
        ws?.close();
        term?.dispose();
      } catch {}
    };
  }, [instanceId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0f172a]"
    />
  );
}
