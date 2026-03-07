"use client";

import { useEffect, useRef, useState } from "react";
import { highlightBash } from "@/terminal/highlighter-bash";
import { highlightQGML } from "@/terminal/highlighter-qgml";
import {
  isBashCommand,
  isQGML,
  isUnsafeBash,
  normalizeInput,
} from "@/terminal/parser-utils";

type ShellMode = "linux" | "yua";

type Props = {
  instanceId: string;
  mode: ShellMode;
  popup?: boolean;
};

export default function TerminalPanel({ instanceId, mode }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const term = useRef<any>(null);
  const fit = useRef<any>(null);
  const ws = useRef<WebSocket | null>(null);

  const buffer = useRef("");
  const history = useRef<string[]>([]);
  const historyIndex = useRef<number | null>(null);

  const [sessionExpired, setSessionExpired] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const prompt = () => (mode === "linux" ? "[linux]$ " : "yua> ");

  /*────────────────────────────────────────────
    WS CLEANUP
  ─────────────────────────────────────────────*/
  function cleanupWS() {
    try {
      ws.current?.close();
    } catch {}
    ws.current = null;
  }

  /*────────────────────────────────────────────
    INIT — Terminal 생성
  ─────────────────────────────────────────────*/
  useEffect(() => {
    let disposed = false;

    async function init() {
      if (!termRef.current) return;

      await import("xterm/css/xterm.css");
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");

      if (disposed) return;

      const t = new Terminal({
        cursorBlink: true,
        convertEol: true,
        scrollback: 5000,
        fontSize: 14,
        fontFamily: "monospace",
        theme: {
          background: "#0f172a",
          foreground: "#ffffff",
        },
      });

      const f = new FitAddon();
      t.loadAddon(f);
      t.open(termRef.current);
      f.fit();

      term.current = t;
      fit.current = f;

      t.writeln("🟢 YUA ONE Terminal");
      t.writeln("----------------------------------");
      t.writeln("Type commands below.\n");
      t.write(prompt());
    }

    init();

    return () => {
      disposed = true;
      cleanupWS();
      term.current?.dispose();
      term.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*────────────────────────────────────────────
    MODE SWITCH
  ─────────────────────────────────────────────*/
  useEffect(() => {
    const t = term.current;
    if (!t) return;

    setSessionExpired(false);

    t.clear();
    t.reset();

    cleanupWS();

    t.writeln(`🟢 Switched to: ${mode.toUpperCase()} Shell`);
    t.writeln("----------------------------------");

    if (mode === "linux") connectSSH();

    t.write(prompt());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, instanceId]);

  /*────────────────────────────────────────────
    TOKEN EXPIRED HANDLER (SSOT)
  ─────────────────────────────────────────────*/
  function markExpired(reason?: string) {
    const t = term.current;
    if (!t) return;

    setSessionExpired(true);

    try {
      // 이미 끊긴 상태면 무시
      if (!reason) {
        t.writeln("\n🔒 세션이 만료되었습니다.");
      } else {
        t.writeln(`\n🔒 세션이 만료되었습니다. (${reason})`);
      }
    } catch {}

    // WS 정리
    cleanupWS();
  }

  /*────────────────────────────────────────────
    SSH CONNECT (TOKEN BASED)
  ─────────────────────────────────────────────*/
  async function connectSSH() {
    const t = term.current;
    if (!t || connecting) return;

    setConnecting(true);
    setSessionExpired(false);

    // 기존 WS 있으면 정리
    cleanupWS();

    try {
      // 1) terminal session token 요청
      const res = await fetch("/api/terminal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });

      const json = await res.json();
      if (!json?.ok || !json?.token) {
        t.writeln("❌ Failed to create terminal session");
        setConnecting(false);
        return;
      }

      // 2) WS 연결
      const wsUrl = `${process.env.NEXT_PUBLIC_TERMINAL_WS_URL}?token=${json.token}`;
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        try {
          t.writeln("🟢 SSH Connected\n");
        } catch {}
        sendResize();
        setConnecting(false);
      };

      socket.onmessage = (e) => {
        if (typeof e.data !== "string") return;

        // ✅ (보강 1) 서버가 문자열로 INVALID 토큰을 보내는 케이스도 방어
        if (
          e.data.includes("INVALID_OR_EXPIRED_TOKEN") ||
          e.data.includes("INVALID_TOKEN") ||
          e.data.includes("TOKEN_EXPIRED") ||
          e.data.includes("TOKEN_REVOKED")
        ) {
          markExpired("INVALID_OR_EXPIRED_TOKEN");
          try {
            socket.close(1008, "INVALID_OR_EXPIRED_TOKEN");
          } catch {}
          return;
        }

        try {
          t.write(e.data);
        } catch {}
      };

      socket.onclose = (ev) => {
        // ✅ (보강 1) close code 1008: 토큰 만료/회수
        if (ev.code === 1008) {
          markExpired(ev.reason || "INVALID_OR_EXPIRED_TOKEN");
          return;
        }

        try {
          t.writeln("\n🔴 SSH Disconnected");
        } catch {}
      };

      socket.onerror = () => {
        try {
          t.writeln("\n❌ SSH connection error");
        } catch {}
      };
    } catch {
      try {
        t?.writeln("❌ Failed to connect SSH proxy.");
      } catch {}
    } finally {
      setConnecting(false);
    }
  }

  function sendResize() {
    if (ws.current?.readyState === WebSocket.OPEN && term.current) {
      try {
        ws.current.send(
          JSON.stringify({
            type: "resize",
            cols: term.current.cols,
            rows: term.current.rows,
          })
        );
      } catch {}
    }
  }

  /*────────────────────────────────────────────
    KEY INPUT
  ─────────────────────────────────────────────*/
  useEffect(() => {
    const t = term.current;
    if (!t) return;

    const handler = async (key: string) => {
      // ✅ (보강 2) 만료/연결중이면 입력 차단
      if (sessionExpired || connecting) return;

      const socket = ws.current;

      /* HISTORY ↑ */
      if (key === "\u001b[A") {
        if (!history.current.length) return;
        historyIndex.current =
          historyIndex.current === null
            ? history.current.length - 1
            : Math.max(0, historyIndex.current - 1);

        const cmd = history.current[historyIndex.current] ?? "";
        buffer.current = cmd;
        t.write(`\x1b[2K\r${prompt()}${cmd}`);
        return;
      }

      /* HISTORY ↓ */
      if (key === "\u001b[B") {
        if (historyIndex.current === null) return;

        if (historyIndex.current < history.current.length - 1) {
          historyIndex.current++;
          buffer.current = history.current[historyIndex.current] ?? "";
          t.write(`\x1b[2K\r${prompt()}${buffer.current}`);
        } else {
          historyIndex.current = null;
          buffer.current = "";
          t.write(`\x1b[2K\r${prompt()}`);
        }
        return;
      }

      /* ENTER */
      if (key === "\r") {
        const cmd = normalizeInput(buffer.current);
        t.write("\r\n");

        if (cmd) history.current.push(cmd);
        historyIndex.current = null;

        if (mode === "linux") {
          if (isUnsafeBash(cmd)) {
            t.writeln("❌ Dangerous command blocked by YUA Safety Layer.");
          } else if (socket?.readyState === WebSocket.OPEN) {
            socket.send(cmd + "\n");
          } else {
            t.writeln("🔴 SSH not connected.");
          }
        }

        buffer.current = "";
        t.write(prompt());
        return;
      }

      /* BACKSPACE */
      if (key.charCodeAt(0) === 127) {
        if (buffer.current.length > 0) {
          buffer.current = buffer.current.slice(0, -1);
          t.write("\b \b");
        }
        return;
      }

      /* NORMAL INPUT */
      buffer.current += key;
      let out = key;

      if (mode === "yua" && isQGML(buffer.current)) {
        out = highlightQGML(key);
      } else if (mode === "linux" && isBashCommand(buffer.current)) {
        out = highlightBash(key);
      }

      t.write(out);
    };

    const disposable = t.onData(handler);
    return () => disposable.dispose();
  }, [mode, sessionExpired, connecting]);

  /*────────────────────────────────────────────
    RESIZE
  ─────────────────────────────────────────────*/
  useEffect(() => {
    const resize = () => {
      try {
        fit.current?.fit();
        sendResize();
      } catch {}
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /*────────────────────────────────────────────
    UI
  ─────────────────────────────────────────────*/
  return (
    <div className="relative w-full h-full bg-[#0f172a] rounded-xl overflow-hidden">
      <div ref={termRef} className="w-full h-full" />

      {sessionExpired && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-[#020617] border border-slate-700 rounded-xl px-6 py-5 text-center">
            <p className="text-white mb-4">🔒 세션이 만료되었습니다</p>
            <button
              onClick={() => {
                // ✅ (보강 3) UX: reconnect 안내
                try {
                  term.current?.clear();
                  term.current?.writeln("🔄 Reconnecting...");
                  term.current?.write(prompt());
                } catch {}
                connectSSH();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              다시 연결
            </button>
          </div>
        </div>
      )}

      {connecting && !sessionExpired && (
        <div className="absolute right-3 top-3 text-xs text-white/70 bg-black/40 px-3 py-1 rounded-full">
          Connecting…
        </div>
      )}
    </div>
  );
}
