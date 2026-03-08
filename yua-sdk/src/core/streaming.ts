import type { ChatCompletion, ChatCompletionChunk, ActivityItem, SuggestionItem, MemoryPayload, ReasoningBlock } from "../types/chat";

type EventHandler<T> = (data: T) => void;

/**
 * Stream<T> — AsyncIterable + .on() event handlers + convenience methods.
 *
 * Backend stream lifecycle:
 *   READY → STREAMING (tokens) → FINAL (logical end) → DONE (transport close)
 *
 * FINAL = no more tokens, UI can stop cursor
 * DONE  = SSE connection closed, cleanup
 *
 * Events are ordered by monotonic `eventId` assigned by StreamEngine.
 */
export class Stream<T = ChatCompletionChunk>
  implements AsyncIterable<T>
{
  private readonly body: ReadableStream<Uint8Array>;
  private readonly controller: AbortController;
  private readonly parse: (raw: SSEFrame) => T | null;

  private listeners: Map<string, EventHandler<any>[]> = new Map();

  // eventId reorder buffer (backend assigns monotonic eventId per session)
  private lastEventId = -1;
  private pendingFrames: Map<number, SSEFrame> = new Map();

  // Aggregated YUA data for finalMessage()
  private _activities: ActivityItem[] = [];
  private _suggestions: SuggestionItem[] = [];
  private _memoryOps: MemoryPayload[] = [];
  private _reasoningBlocks: ReasoningBlock[] = [];

  constructor(
    body: ReadableStream<Uint8Array>,
    controller: AbortController,
    parse: (raw: SSEFrame) => T | null,
  ) {
    this.body = body;
    this.controller = controller;
    this.parse = parse;
  }

  on(event: "stage", handler: EventHandler<{ stage: string }>): this;
  on(event: "activity", handler: EventHandler<{ activity: any }>): this;
  on(event: "reasoning_block", handler: EventHandler<{ block: ReasoningBlock }>): this;
  on(event: "reasoning_done", handler: EventHandler<void>): this;
  on(event: "suggestion", handler: EventHandler<{ suggestions: SuggestionItem[] }>): this;
  on(event: "memory", handler: EventHandler<{ memory: MemoryPayload }>): this;
  on(event: "answer_unlocked", handler: EventHandler<void>): this;
  on(event: "done", handler: EventHandler<void>): this;
  on(event: string, handler: EventHandler<any>): this {
    const list = this.listeners.get(event) ?? [];
    list.push(handler);
    this.listeners.set(event, list);
    return this;
  }

  private emit(event: string, data: unknown): void {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const handler of list) {
      try {
        handler(data);
      } catch {
        // swallow listener errors
      }
    }
  }

  abort(): void {
    this.controller.abort();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for await (const frame of parseSSE(this.body)) {
      // eventId-based ordering: if out of order, buffer and replay
      const eventId = frame.json?.eventId;
      if (typeof eventId === "number") {
        if (eventId <= this.lastEventId) continue; // dedup

        if (eventId !== this.lastEventId + 1 && this.lastEventId >= 0) {
          // Out of order — buffer it
          this.pendingFrames.set(eventId, frame);
          continue;
        }

        this.lastEventId = eventId;
      }

      const result = this.processFrame(frame);
      if (result) yield result;

      // Flush any buffered frames that are now in order
      while (this.pendingFrames.has(this.lastEventId + 1)) {
        const next = this.pendingFrames.get(this.lastEventId + 1)!;
        this.pendingFrames.delete(this.lastEventId + 1);
        this.lastEventId++;
        const r = this.processFrame(next);
        if (r) yield r;
      }
    }

    this.emit("done", undefined);
  }

  private processFrame(frame: SSEFrame): T | null {
    const parsed = this.parse(frame);
    if (!parsed) return null;

    // Aggregate YUA extension data + emit events
    const chunk = parsed as any;
    if (chunk.yua_event) {
      const { type, data } = chunk.yua_event;
      this.emit(type, data);

      // Aggregate for finalMessage()
      if (type === "activity" && data?.activity?.item) {
        const { op, item } = data.activity;
        if (op === "ADD") this._activities.push(item);
        else if (op === "PATCH") {
          const idx = this._activities.findIndex((a) => a.id === item.id);
          if (idx >= 0) Object.assign(this._activities[idx], item);
        }
      }
      if (type === "suggestion" && data?.suggestions) {
        this._suggestions = data.suggestions;
      }
      if (type === "memory" && data?.memory) {
        this._memoryOps.push(data.memory);
      }
      if (type === "reasoning_block" && data?.block) {
        this._reasoningBlocks.push(data.block);
      }
    }

    return parsed;
  }

  async textContent(): Promise<string> {
    let text = "";
    for await (const chunk of this) {
      const c = chunk as any;
      const delta = c.choices?.[0]?.delta?.content;
      if (typeof delta === "string") {
        text += delta;
      }
    }
    return text;
  }

  async finalMessage(): Promise<ChatCompletion> {
    let lastId = "";
    let fullText = "";
    let model = "";
    let finishReason = "stop";
    let thinkingProfile: string | undefined;

    for await (const chunk of this) {
      const c = chunk as any;
      if (c.id) lastId = c.id;
      if (c.model) model = c.model;
      const delta = c.choices?.[0]?.delta?.content;
      if (typeof delta === "string") fullText += delta;
      const fr = c.choices?.[0]?.finish_reason;
      if (fr) finishReason = fr;
      // Extract thinking profile from meta
      if (c.yua_event?.type === "stage" && !thinkingProfile) {
        thinkingProfile = c.meta?.thinkingProfile;
      }
    }

    return {
      id: lastId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: fullText },
          finish_reason: finishReason as any,
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      yua: {
        thinking_profile: (thinkingProfile as any) ?? undefined,
        activities: this._activities,
        suggestions: this._suggestions,
        memory_ops: this._memoryOps,
        reasoning_blocks: this._reasoningBlocks,
      },
    };
  }
}

// --- SSE Parser (from legacy yua-one-node, battle-tested) ---

export interface SSEFrame {
  event?: string;
  data: string;
  json?: any;
}

async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const lines = rawEvent.split("\n");
        let eventType: string | undefined;
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (!dataLines.length) continue;
        const data = dataLines.join("\n");

        // Skip heartbeat / keep-alive (backend sends 15s ping)
        if (data === "[heartbeat]" || data === "" || data.startsWith(":")) continue;
        // SSE end signal
        if (data === "[DONE]") return;

        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          // not JSON — skip
          continue;
        }

        // done=true means transport close — stop parsing
        if (json.done === true) return;

        yield { event: eventType, data, json };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
