// 📂 src/ai/context/context-merger.ts
// 🔥 YUA Context Merger — SSOT v2 (2025.12)

import { isOfficialDocSource } from "../search/allowed-search-engine";
import type { SearchResult } from "../search/allowed-search-engine";

export type MemoryChunk = {
  content: string;
  scope: "summary" | "personal" | "domain" | "public" | "general_knowledge";
  sensitivity?: "normal" | "restricted";
};

export type ContextCarryLevel =
  | "RAW"
  | "SEMANTIC"
  | "ENTITY";

export type PendingContext = {
  baseQuestion: string;
  note?: string;
};

export type MergedContext = {
  trustedFacts: string;
  userContext?: string;
  researchContext?: string;
  conversationState?: string;
  contextCarryLevel?: ContextCarryLevel;
  pendingContext?: PendingContext;
  constraints?: string[];
};

export const ContextMerger = {
  merge(args: {
    searchResults: SearchResult[];
    memoryChunks?: MemoryChunk[];
    conversationState?: string;
    researchContext?: string;
    contextCarryLevel?: ContextCarryLevel;
    pendingContext?: PendingContext;
    constraints?: string[];
    designMode?: boolean;
  }): MergedContext {
    const {
      searchResults,
      memoryChunks,
      conversationState,
      researchContext,
      pendingContext,
      contextCarryLevel,
      constraints,
    } = args;

    /* 1️⃣ Trusted Facts — sorted by relevance then trust */
    const trustedFacts = searchResults
      .filter((r) => isOfficialDocSource(r.source))
      .sort((a, b) => {
        const scoreA = (a.relevance ?? 0) * 0.6 + (a.trust / 5) * 0.4;
        const scoreB = (b.relevance ?? 0) * 0.6 + (b.trust / 5) * 0.4;
        return scoreB - scoreA;
      })
      .map(
        (r, i) =>
          `(${i + 1}) ${r.snippet}\nSource: ${r.source}`
      )
      .join("\n\n");

    /* 2️⃣ User Context */
    let contextParts: string[] = [];

    if (memoryChunks?.length) {
      const safeChunks = memoryChunks.filter(
        (m) => m.sensitivity !== "restricted"
      );

      // 🔒 SSOT: Context Carry Compression
      // 🔥 GPT-style weighted merge (SSOT)
      const weighted = safeChunks
        .map((m) => {
          const weight =
            m.scope === "summary"
              ? 3
              : m.scope === "general_knowledge"
              ? 2
              : m.scope === "domain" || m.scope === "personal"
              ? 1.5
              : 1;

          return { ...m, weight };
        })
        .sort((a, b) => b.weight - a.weight);

      const baseLimit =
        contextCarryLevel === "ENTITY"
          ? 6
          : contextCarryLevel === "SEMANTIC"
          ? 8
          : 12;
      const limit =
        args.designMode === true
          ? Math.min(baseLimit + 2, 10)
          : baseLimit;

      contextParts = weighted
        .slice(0, limit)
        .map((m) => `• ${m.content}`);
    }

    if (pendingContext) {
      contextParts.push(
        `[PENDING QUESTION]\n${pendingContext.baseQuestion}`
      );
      if (pendingContext.note) {
        contextParts.push(
          `[USER PROVIDED DETAIL]\n${pendingContext.note}`
        );
      }
    }

    return {
      trustedFacts,
      userContext:
        [
          contextCarryLevel ? `[CONTEXT LEVEL]\n${contextCarryLevel}` : null,
          conversationState
      ? `[CONVERSATION STATE]\n${conversationState}`
            : null,
          contextParts.length > 0
            ? contextParts.join("\n")
            : null,
        ]
          .filter(Boolean)
          .join("\n\n") || undefined,
      researchContext,
      pendingContext,
      constraints,
    };
  },
};
