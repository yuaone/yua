import EventEmitter from "events";
import WebSocket from "ws";

export type RealtimeServerEvent = Record<string, any>;
export type RealtimeClientEvent = Record<string, any>;

export class OpenAIRealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;

  constructor(
    private args: {
      apiKey: string;
      model: string; // e.g. "gpt-realtime-mini"
    }
  ) {
    super();
  }

  connect() {
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
      this.args.model
    )}`;

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.args.apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    this.ws.on("open", () => this.emit("open"));
    this.ws.on("close", (code, reason) =>
      this.emit("close", code, reason?.toString?.() ?? "")
    );
    this.ws.on("error", (err) => this.emit("error", err));

    this.ws.on("message", (data) => {
      try {
        const text = typeof data === "string" ? data : data.toString("utf8");
        const ev = JSON.parse(text) as RealtimeServerEvent;
        this.emit("event", ev);
        if (typeof ev?.type === "string") this.emit(ev.type, ev);
      } catch (e) {
        this.emit("error", e);
      }
    });
  }

  send(ev: RealtimeClientEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(ev));
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
  }
}