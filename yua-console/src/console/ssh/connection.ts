// 📂 src/console/ssh/connection.ts

import { detectRawMode } from "./raw-detector";

export type SSHConnectionOptions = {
  instanceId: string;
  cpuTier?: string | null;
  qpuTier?: string | null;
  onData: (data: string, isRaw?: boolean) => void;
  onClose: () => void;
};

export function createSSHConnection(opts: SSHConnectionOptions): WebSocket {
  const { instanceId, cpuTier, qpuTier, onData, onClose } = opts;

  // -----------------------------
  // WebSocket URL 자동 결정
  // -----------------------------
  const base =
    process.env.NEXT_PUBLIC_WS_URL ??
    (typeof window !== "undefined"
      ? `ws://${window.location.host}`
      : "ws://localhost:3000");

  const ws = new WebSocket(`${base}/api/ws/ssh?instanceId=${instanceId}`);

  // -----------------------------
  // 성능 모드 결정 (CPU/QPU 기반)
  // -----------------------------
  const perfMode =
    qpuTier?.startsWith("qpu") ? "quantum" :
    cpuTier === "cpu-large" ? "high" :
    cpuTier === "cpu-medium" ? "medium" :
    "low";

  console.log(`[SSH] Perf Mode = ${perfMode}`);

  ws.onopen = () => {
    console.log("[SSH] Connected");
    ws.send(JSON.stringify({ type: "perf-mode", perf: perfMode }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      // raw 모드 토글 감지
      const raw = detectRawMode(msg.data);
      if (raw !== null) {
        onData(msg.data, raw.raw);
        return;
      }

      if (msg.type === "stdout") return onData(msg.data, false);
      if (msg.type === "raw") return onData(msg.data, true);

      // fallback
      onData(event.data, false);
    } catch {
      onData(event.data, false);
    }
  };

  ws.onerror = (err) => {
    console.error("[SSH] Error:", err);
  };

  ws.onclose = () => {
    console.log("[SSH] Closed");
    onClose();
  };

  return ws;
}
