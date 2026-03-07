import { StreamEngine } from "../engines/stream-engine";
import { openai } from "../utils/openai-client";
import { pickModel } from "../utils/pick-model";

type StreamState = "READY" | "STREAMING" | "DONE" | "ABORTED";

type StreamContext = {
  threadId: number;
  traceId: string;
  abortController: AbortController;
  state: StreamState;
};

export class StreamController {
  private static contexts = new Map<number, StreamContext>();

  private static getContext(threadId: number) {
    return this.contexts.get(threadId);
  }

  private static setContext(ctx: StreamContext) {
    this.contexts.set(ctx.threadId, ctx);
  }

  private static clearContext(threadId: number) {
    this.contexts.delete(threadId);
  }

  /* -----------------------------
     START STREAM
  ----------------------------- */

  static async start(opts: {
    threadId: number;
    prompt: string;
    apiKey?: string;
  }) {
    const { threadId, prompt, apiKey } = opts;

    if (this.contexts.has(threadId)) {
      throw new Error(`Stream already running for thread ${threadId}`);
    }

    const abortController = new AbortController();
    const traceId = `trace:${threadId}:${Date.now()}`;

    const ctx: StreamContext = {
      threadId,
      traceId,
      abortController,
      state: "READY",
    };

    this.setContext(ctx);

    // ✅ READY = stage event + topic
    await StreamEngine.publish(threadId, {
      event: "stage",
      topic: "stream.ready",
      stage: "system",
      traceId,
    });

    ctx.state = "STREAMING";

    this.runOpenAIStream({
      threadId,
      prompt,
      apiKey,
      ctx,
    }).catch(async (err) => {
      console.error("[STREAM][FATAL]", err);
      await this.abort(threadId, "internal-error");
    });
  }

  /* -----------------------------
     ABORT STREAM
  ----------------------------- */

  static async abort(threadId: number, reason = "user-stop") {
    const ctx = this.getContext(threadId);
    if (!ctx) return;
    if (ctx.state === "DONE" || ctx.state === "ABORTED") return;

    ctx.state = "ABORTED";
    ctx.abortController.abort();

    // ✅ ABORT = done + topic
    await StreamEngine.publish(threadId, {
      event: "done",
      topic: "stream.abort",
      stage: "system",
      traceId: ctx.traceId,
      internal: true,
      done: true,
      meta: { reason },
    });

    this.clearContext(threadId);
  }

  /* -----------------------------
     INTERNAL: OpenAI stream loop
  ----------------------------- */

  private static async runOpenAIStream(opts: {
    threadId: number;
    prompt: string;
    apiKey?: string;
    ctx: StreamContext;
  }) {
    const { threadId, prompt, apiKey, ctx } = opts;

    const client = openai(apiKey);
    const model = pickModel("chat");

    // ⚠️ options 인자 제거 (SSOT)
    const stream = await client.responses.stream({
      model,
      input: prompt,
      max_output_tokens: 1024,
    });

    try {
      for await (const ev of stream as AsyncIterable<any>) {
        if (ctx.abortController.signal.aborted) break;

        if (ev?.type === "response.output_text.delta") {
          const token = String(ev.delta ?? "");
          if (!token) continue;

          await StreamEngine.publish(threadId, {
            event: "token",
            token,
            stage: "answer",
            traceId: ctx.traceId,
          });
        }

        if (ev?.type === "response.completed") break;
      }

      ctx.state = "DONE";

      await StreamEngine.publish(threadId, {
        event: "done",
        stage: "system",
        traceId: ctx.traceId,
        done: true,
      });
    } catch (err) {
      if (ctx.state !== "ABORTED") {
        console.error("[STREAM][ERROR]", err);
        await this.abort(threadId, "stream-error");
      }
    } finally {
      this.clearContext(threadId);
    }
  }
}
