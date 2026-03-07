"use client";

import { useState, useCallback } from "react";

export type ShellMode = "linux" | "yua";

/**
 * YUA ONE — Terminal State Manager (SSOT 3.1)
 * - Shell mode manager
 * - SSH connection tracking
 * - instance binding (SSH / VM)
 * - input buffer isolation
 * - safe switching
 * - extensible design for future engines (C-shell, Quantum VM)
 */
export function useTerminal() {
  const [mode, setMode] = useState<ShellMode>("linux");
  const [connected, setConnected] = useState<boolean>(false);

  // 🔹 instance binding (SSH / VM / future engines)
  const [instanceId, setInstanceId] = useState<string | undefined>(undefined);

  // 입력 버퍼 (TerminalPanel에서는 별도 buffer 관리 가능)
  const [buffer, setBuffer] = useState<string>("");

  // mode switch (Linux <-> YUA)
  const switchMode = useCallback(() => {
    setMode((prev) => (prev === "linux" ? "yua" : "linux"));
    setConnected(false); // 새 모드 시작 → 연결 상태 초기화
    setBuffer(""); // 입력 버퍼 초기화
    // ⚠️ instanceId는 유지 (의도적)
  }, []);

  // set mode directly
  const changeMode = useCallback((next: ShellMode) => {
    setMode(next);
    setConnected(false);
    setBuffer("");
    // ⚠️ instanceId 유지
  }, []);

  // bind instance (SSH 연결 전)
  const bindInstance = useCallback((id: string) => {
    setInstanceId(id);
  }, []);

  // clear instance (disconnect / instance 종료)
  const clearInstance = useCallback(() => {
    setInstanceId(undefined);
    setConnected(false);
  }, []);

  // append buffer
  const append = useCallback((text: string) => {
    setBuffer((prev) => prev + text);
  }, []);

  // clear buffer
  const clearBuffer = useCallback(() => {
    setBuffer("");
  }, []);

  return {
    /** 상태 */
    mode,
    connected,
    buffer,
    instanceId,

    /** setter */
    setConnected,
    setMode: changeMode,
    switchMode,

    /** instance ops */
    bindInstance,
    clearInstance,

    /** buffer ops */
    append,
    clearBuffer,
  };
}
