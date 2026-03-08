import type { APIClient } from "../../core/api-client";
import { Stream } from "../../core/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from "../../types/chat";

export class Completions {
  private readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async create(
    params: ChatCompletionCreateParams & { stream: true },
  ): Promise<Stream<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionCreateParams & { stream?: false },
  ): Promise<ChatCompletion>;
  async create(
    params: ChatCompletionCreateParams,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionCreateParams,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    // 1. Ensure thread exists
    const threadId = params.yua_options?.thread_id ?? (await this.createThread());

    // 2. Send user message
    const userMsg = params.messages[params.messages.length - 1];
    if (userMsg) {
      await this.client.post("/api/chat/message", {
        threadId,
        role: userMsg.role,
        content: userMsg.content,
      });
    }

    if (params.stream) {
      return this.createStream(threadId, params);
    }

    return this.createNonStream(threadId, params);
  }

  private async createThread(): Promise<number> {
    const res = await this.client.post<{ ok: boolean; threadId: number }>(
      "/api/chat/thread",
      {},
    );
    return res.threadId;
  }

  private async createStream(
    threadId: number,
    params: ChatCompletionCreateParams,
  ): Promise<Stream<ChatCompletionChunk>> {
    const controller = new AbortController();
    const body = await this.client.fetchSSE(
      `/api/stream/stream?threadId=${threadId}`,
      controller.signal,
    );

    return new Stream<ChatCompletionChunk>(
      body,
      controller,
      (frame) => mapSSEToChunk(frame.json, params.model, threadId),
    );
  }

  private async createNonStream(
    threadId: number,
    params: ChatCompletionCreateParams,
  ): Promise<ChatCompletion> {
    const stream = await this.createStream(threadId, params);
    return stream.finalMessage();
  }
}

// --- SSE event → ChatCompletionChunk mapper ---

function mapSSEToChunk(
  json: any,
  model: string,
  threadId: number,
): ChatCompletionChunk | null {
  if (!json) return null;

  const event = json.event;
  const traceId = json.traceId ?? `thread_${threadId}`;

  // Token event → delta content
  // Backend may send token without explicit event field, or with event="token"
  if ((event === "token" || (!event && typeof json.token === "string")) && typeof json.token === "string") {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: { content: json.token },
          finish_reason: null,
        },
      ],
    };
  }

  // Final event → finish_reason: stop (logical end, no more tokens)
  // Backend may also provide finalText with the complete response
  if (event === "final" || json.final === true) {
    const chunk: ChatCompletionChunk = {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: json.finalText ? { content: json.finalText } : {},
          finish_reason: "stop",
        },
      ],
    };
    return chunk;
  }

  // Done event → skip (transport-level)
  if (event === "done" || json.done === true) {
    return null;
  }

  // Stage event → yua_event
  if (event === "stage" && json.stage) {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "stage", data: { stage: json.stage } },
    };
  }

  // Activity event → yua_event
  if (event === "activity" && json.activity) {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "activity", data: { activity: json.activity } },
    };
  }

  // Reasoning block → yua_event
  if (event === "reasoning_block" && json.block) {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "reasoning_block", data: { block: json.block } },
    };
  }

  // Reasoning done
  if (event === "reasoning_done") {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "reasoning_done", data: {} },
    };
  }

  // Suggestion → yua_event
  if (event === "suggestion" && json.suggestion) {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: {
        type: "suggestion",
        data: { suggestions: json.suggestion.items ?? [] },
      },
    };
  }

  // Memory → yua_event
  if (event === "memory" && json.memory) {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "memory", data: { memory: json.memory } },
    };
  }

  // Answer unlocked
  if (event === "answer_unlocked") {
    return {
      id: traceId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: {}, finish_reason: null }],
      yua_event: { type: "answer_unlocked", data: {} },
    };
  }

  // Unknown events → skip
  return null;
}
