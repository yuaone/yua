/**
 * Linux Shell – WebSocket Connection Factory
 */

export interface LinuxConnection {
  ws: WebSocket | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: string | Uint8Array) => void;
}

export function createLinuxConnection(
  url: string,
  onMessage: (msg: string) => void,
  onClose?: () => void
): LinuxConnection {
  let ws: WebSocket | null = null;

  const connect = () => {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("[LinuxShell] Connected");
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        onMessage(ev.data);
      } else if (ev.data instanceof Blob) {
        ev.data.text().then((text) => onMessage(text));
      }
    };

    ws.onclose = () => {
      console.log("[LinuxShell] Disconnected");
      if (onClose) onClose();
    };

    ws.onerror = (err) => {
      console.error("[LinuxShell] WS error:", err);
    };
  };

  const disconnect = () => {
    ws?.close();
  };

  const send = (data: string | Uint8Array) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  };

  return { ws, connect, disconnect, send };
}
