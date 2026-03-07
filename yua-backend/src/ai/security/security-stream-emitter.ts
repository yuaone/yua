// 📂 src/ai/security/security-stream-emitter.ts
// 🚨 StreamEmitter — ENTERPRISE FINAL VERSION (2025.11 FIXED)

import { StreamBus } from "./security-stream-server";
import { SecurityMemory } from "./security-memory";

export interface SecurityEventPayload {
  type: string;
  risk?: number;
  time?: string;
  [key: string]: any;
}

type Subscriber = (event: SecurityEventPayload) => void;

export const StreamEmitter = {
  fallbackQueue: [] as SecurityEventPayload[],
  subscribers: new Set<Subscriber>(),

  validate(event: unknown): event is SecurityEventPayload {
    if (!event || typeof event !== "object") return false;
    if (!(event as any).type) return false;
    return true;
  },

  // ----------------------------------------------------
  // 🔥 subscribe
  // ----------------------------------------------------
  subscribe(fn: Subscriber) {
    this.subscribers.add(fn);

    return {
      unsubscribe: () => {
        this.subscribers.delete(fn);
      },
    };
  },

  // ----------------------------------------------------
  // 🔥 push — SSE + WSR + Memory
  // ----------------------------------------------------
  push(event: unknown, riskLevel = 0) {
    if (!this.validate(event)) {
      console.error("[StreamEmitter] Invalid event:", event);
      return;
    }

    const payload: SecurityEventPayload = {
      ...event,
      risk: riskLevel,
      time: new Date().toISOString(),
    };

    try {
      // SSE Broadcast
      StreamBus.emit("security_event", payload);

      // WebSocket Subscribers
      for (const sub of this.subscribers) {
        sub(payload);
      }

      // Memory 기록
      SecurityMemory.recordEvent({
        type: payload.type,
        detail: payload,
        risk: riskLevel,
      });

    } catch (err) {
      console.warn("[StreamEmitter] StreamBus down. Queued (fallback).");
      this.fallbackQueue.push(payload);
    }
  },

  // ----------------------------------------------------
  // 🔥 fallback 재전송
  // ----------------------------------------------------
  flushFallback() {
    const queue = [...this.fallbackQueue];
    for (const evt of queue) {
      try {
        StreamBus.emit("security_event", evt);
        for (const sub of this.subscribers) sub(evt);
      } catch {
        return;
      }
    }
    this.fallbackQueue = [];
  },
};

// ----------------------------------------------------
// ⭐ 핵심 FIX: SensorHub와 호환을 위한 alias export
// ----------------------------------------------------
export const SecurityStreamEmitter = StreamEmitter;
