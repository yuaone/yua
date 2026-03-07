"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";

import { createSSHConnection } from "@/console/ssh/connection";
import { runSSHCommand } from "@/console/ssh/command-runner";
import { runYuaShellCommand } from "@/console/yua-shell/supervisor";
import { sendResize } from "@/console/ssh/resize";
import { detectRawMode } from "@/console/ssh/raw-detector";
import { mapKeyInput } from "@/console/ssh/keymap";

import { highlightBash } from "@/terminal/highlighter-bash";
import { highlightQGML } from "@/terminal/highlighter-qgml";
import { isQGML, isBashCommand, normalizeInput } from "@/terminal/parser-utils";

export default function Terminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const termObj = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const inputBuffer = useRef("");
  const history = useRef<string[]>([]);
  const historyIndex = useRef<number | null>(null);
  const rawMode = useRef(false);

  const terminal = useTerminal();
  const { mode, setConnected } = terminal;
  const instanceId =
    "instanceId" in terminal ? terminal.instanceId : undefined;

  const getPrompt = () => (mode === "linux" ? "[yua@linux]$ " : "yua> ");

  const writePrompt = () => {
    if (!rawMode.current && termObj.current) {
      termObj.current.write(getPrompt());
    }
  };

  /* -------------------------------------------------------------
   * INIT TERMINAL
   * ------------------------------------------------------------- */
  async function initTerminal() {
    if (!termRef.current) return;

    const cssID = "xterm-css";
    if (!document.getElementById(cssID)) {
      const link = document.createElement("link");
      link.id = cssID;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/xterm/css/xterm.css";
      document.head.appendChild(link);
    }

    const { Terminal: XTerm } = await import("xterm");
    const { FitAddon } = await import("xterm-addon-fit");

    const term = new XTerm({
      fontSize: 13,
      fontFamily: "monospace",
      cursorBlink: true,
      convertEol: true,
      scrollback: 5000,
      disableStdin: false,
      theme: {
        background: "#0f172a",
        foreground: "#e2e8f0",
      },
    });

    const fit = new FitAddon();

    term.loadAddon(fit);
    term.open(termRef.current);
    setTimeout(() => fit.fit(), 10);

    termObj.current = term;
    fitAddon.current = fit;

    term.writeln("🟢 YUA ONE Developer Console");
    term.writeln(`Active Shell: ${mode}`);
    term.writeln("----------------------------------------");
    writePrompt();
  }

  useEffect(() => {
    initTerminal();
  }, []);

  /* -------------------------------------------------------------
   * MODE SWITCH
   * ------------------------------------------------------------- */
  useEffect(() => {
    if (!termObj.current) return;
    const term = termObj.current;

    term.clear();
    term.reset();
    term.writeln(`🟢 Switched to ${mode.toUpperCase()} Shell\n`);
    writePrompt();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mode === "linux") {
      if (!instanceId) {
        console.warn("SSH skipped: instanceId missing");
        setConnected(false);
        return;
      }

      const ws = createSSHConnection({
        instanceId,
        onData: (data: string) => {
          const auto = detectRawMode(data ?? "");
          if (auto?.raw === true) rawMode.current = true;
          if (auto?.raw === false) rawMode.current = false;

          if (data) term.write(data);
        },
        onClose: () => {
          term.writeln("\n🔴 SSH disconnected");
          rawMode.current = false;
          wsRef.current = null;
          setConnected(false);
        },
      });

      ws.onopen = () => {
        setConnected(true);
        term.writeln("\n🟢 SSH connected\n");
        writePrompt();

        try {
          sendResize(ws, term.cols, term.rows);
        } catch {}
      };

      wsRef.current = ws;
    } else {
      setConnected(false);
    }
  }, [mode, instanceId]);

  /* -------------------------------------------------------------
   * KEY INPUT
   * ------------------------------------------------------------- */
  useEffect(() => {
    if (!termObj.current) return;
    const term = termObj.current;

    const handler = (data: string) => {
      if (rawMode.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "input", data: mapKeyInput(data) })
        );
        return;
      }

      if (data === "\x1b[A") {
        if (!history.current.length) return;

        if (historyIndex.current === null) {
          historyIndex.current = history.current.length - 1;
        } else if (historyIndex.current > 0) {
          historyIndex.current -= 1;
        }

        const val = history.current[historyIndex.current];
        inputBuffer.current = val;
        term.write("\x1b[2K\r" + getPrompt() + val);
        return;
      }

      if (data === "\x1b[B") {
        if (historyIndex.current === null) return;

        if (historyIndex.current < history.current.length - 1) {
          historyIndex.current += 1;
        } else {
          historyIndex.current = null;
          inputBuffer.current = "";
        }

        const val =
          historyIndex.current === null
            ? ""
            : history.current[historyIndex.current];

        inputBuffer.current = val;
        term.write("\x1b[2K\r" + getPrompt() + val);
        return;
      }

      if (data === "\r") {
        term.write("\r\n");

        const cmd = normalizeInput(inputBuffer.current);
        if (cmd) history.current.push(cmd);

        if (mode === "linux") {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            runSSHCommand(wsRef.current, cmd);
          } else {
            term.writeln("🔴 SSH not connected");
          }
        } else {
          term.writeln(runYuaShellCommand(cmd));
        }

        inputBuffer.current = "";
        historyIndex.current = null;
        writePrompt();
        return;
      }

      if (data.charCodeAt(0) === 127) {
        if (inputBuffer.current.length) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }

      inputBuffer.current += data;

      let render = data;
      if (mode === "yua" && isQGML(inputBuffer.current)) {
        render = highlightQGML(data);
      } else if (mode === "linux" && isBashCommand(inputBuffer.current)) {
        render = highlightBash(data);
      }

      term.write(render);
    };

    const disp = term.onData(handler);
    return () => disp.dispose();
  }, [mode]);

  /* -------------------------------------------------------------
   * WINDOW RESIZE
   * ------------------------------------------------------------- */
  useEffect(() => {
    const onResize = () => {
      if (fitAddon.current && termObj.current) {
        try {
          fitAddon.current.fit();
        } catch {}
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={termRef}
      className="w-full h-full rounded-xl overflow-hidden bg-[#0b0e12]"
    />
  );
}
