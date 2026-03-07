import { pgPool } from "../../../db/postgres";
import OpenAI from "openai";
import type { CrossMemoryType } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildEmbeddingText(params: {
  type: CrossMemoryType;
  scope: "GLOBAL" | "PROJECT";
  summary: string;
  facts?: Record<string, any>;
}): string {
  const parts: string[] = [];

  parts.push("[CROSS_THREAD_MEMORY]");
  parts.push(`type: ${params.type}`);
  parts.push(`scope: ${params.scope}`);
  parts.push("summary:");
  parts.push(params.summary);

  if (params.facts) {
    parts.push("facts:");
    parts.push(JSON.stringify(params.facts));
  }

  return parts.join("\n");
}

export const CrossMemoryWriter = {
  async insert(params: {
    workspaceId: string;
    userId: number;
    type: CrossMemoryType;
    summary: string;
    facts?: Record<string, any>;
    scope: "GLOBAL" | "PROJECT";
    sourceThreadId?: number;
  }): Promise<void> {
    const {
      workspaceId,
      userId,
      type,
      summary,
      facts,
      scope,
      sourceThreadId,
    } = params;

    // 🔒 1) embedding 생성 (SSOT: writer 책임)
    const embeddingInput = buildEmbeddingText({
      type,
      scope,
      summary,
      facts,
    });

    const embeddingResult = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: embeddingInput,
    });

    const vector = embeddingResult.data[0].embedding;
    const vectorLiteral = `[${vector.join(",")}]`;

    // 🔒 2) INSERT (atomic)
    await pgPool.query(
      `
      INSERT INTO cross_thread_memory (
        workspace_id,
        user_id,
        type,
        summary,
        facts,
        scope,
        source_thread_id,
        embedding
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector)
      ON CONFLICT DO NOTHING
      `,
      [
        workspaceId,
        userId,
        type,
        summary,
        facts ?? null,
        scope,
        sourceThreadId ?? null,
        vectorLiteral,
      ]
    );
  },
};
