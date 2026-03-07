import * as Y from "yjs";
import { Observable } from "lib0/observable";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

export type YjsProviderStatus = "connecting" | "connected" | "disconnected";

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
  destroy: () => void;
};

/**
 * Custom Y.js WebSocket provider that connects to our existing
 * workspace-docs-ws backend endpoint.
 *
 * Protocol:
 *   Client -> Server: { type: "yjs_update", update: base64 }
 *   Client -> Server: { type: "yjs_sync", stateVector: base64 }
 *   Client -> Server: { type: "awareness", data: base64 }
 *   Server -> Client: same types, relayed from other clients
 */
export class YjsProvider extends Observable<string> {
  doc: Y.Doc;
  wsUrl: string;
  awareness: Awareness | null = null;
  status: YjsProviderStatus = "disconnected";

  private ws: WebSocket | null = null;
  private shouldConnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(wsUrl: string, doc: Y.Doc, awareness?: Awareness) {
    super();
    this.doc = doc;
    this.wsUrl = wsUrl;
    this.awareness = awareness ?? null;

    // Listen for local doc changes -> send to server
    this.doc.on("update", this.onDocUpdate);

    this.connect();
  }

  connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;

    this.shouldConnect = true;
    this.setStatus("connecting");

    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      this.setStatus("connected");

      // Send initial sync (state vector)
      const sv = Y.encodeStateVector(this.doc);
      this.sendJson({
        type: "yjs_sync",
        data: bufToBase64(sv),
      });

      // Heartbeat
      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 15000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(
          typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)
        );
        this.handleMessage(msg);
      } catch {
        // ignore non-JSON
      }
    };

    ws.onclose = () => {
      this.cleanup();
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
    this.setStatus("disconnected");
  }

  destroy() {
    this.disconnect();
    this.doc.off("update", this.onDocUpdate);
    this.awareness?.destroy();
    super.destroy();
  }

  private handleMessage(msg: any) {
    if (!msg?.type) return;

    switch (msg.type) {
      case "yjs_update": {
        // Remote update — apply to local doc
        if (msg.data) {
          const update = base64ToBuf(msg.data);
          Y.applyUpdate(this.doc, update, "remote");
        }
        break;
      }
      case "yjs_sync": {
        // Another client's sync data — apply as update
        if (msg.data) {
          try {
            Y.applyUpdate(this.doc, base64ToBuf(msg.data), "remote");
          } catch {
            // May be a state vector — respond with our diff
            const diff = Y.encodeStateAsUpdate(this.doc, base64ToBuf(msg.data));
            this.sendJson({ type: "yjs_update", data: bufToBase64(diff) });
          }
        }
        break;
      }
      case "awareness": {
        // Awareness update from another client
        // TODO: integrate with y-prosemirror awareness when cursor sharing is added
        break;
      }
      case "snapshot_request": {
        // Server is asking us to snapshot — send full doc state
        const fullState = Y.encodeStateAsUpdate(this.doc);
        this.sendJson({
          type: "snapshot_response",
          data: bufToBase64(fullState),
        });
        break;
      }
      // Ignore hello, doc_ack, presence_snapshot, cursor, error (handled by page)
    }
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return; // Don't re-broadcast remote updates
    this.sendJson({
      type: "yjs_update",
      data: bufToBase64(update),
    });
  };

  private sendJson(obj: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (!this.shouldConnect) return;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2000);
  }

  private setStatus(status: YjsProviderStatus) {
    if (this.status === status) return;
    this.status = status;
    this.emit("status", [{ status }]);
  }
}

function bufToBase64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}
