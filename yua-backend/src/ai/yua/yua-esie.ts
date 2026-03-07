// src/ai/yua/yua-esie.ts

import { logger } from "../../utils/logger";

/**
 * ESIE 입력 구조 (임시)
 * - 나중에 GCP UES 스키마 작업 시 교체 예정
 */
export interface EsieInput {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * ESIE 출력 구조 (임시)
 */
export interface EsieOutput {
  refinedText: string;
  emotion: string;
  semanticTags: string[];
  confidence: number;
  meta?: Record<string, unknown>;
}

/**
 * Emotion & Semantic Interpretation Engine
 */
export class YuaEsieEngine {
  constructor() {}

  async run(input: EsieInput): Promise<EsieOutput> {
    logger.info("[YuaEsieEngine] run called", {
      hasMetadata: !!input.metadata
    });

    const emotion = this.detectEmotion(input.text);
    const tags = this.extractSemanticTags(input.text);

    return {
      refinedText: input.text,
      emotion,
      semanticTags: tags,
      confidence: Math.min(1, 0.5 + tags.length * 0.05),
      meta: {
        ...input.metadata,
        esieTimestamp: Date.now()
      }
    };
  }

  private detectEmotion(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes("angry") || lower.includes("annoy")) return "anger";
    if (lower.includes("sad") || lower.includes("down")) return "sadness";
    if (lower.includes("happy") || lower.includes("glad")) return "joy";
    if (lower.includes("worried") || lower.includes("anxious")) return "anxiety";

    return "neutral";
  }

  private extractSemanticTags(text: string): string[] {
    const tags: string[] = [];
    const lower = text.toLowerCase();

    if (lower.includes("money")) tags.push("finance");
    if (lower.includes("ai")) tags.push("technology");
    if (lower.includes("plan")) tags.push("planning");
    if (lower.includes("error")) tags.push("issue");

    return tags;
  }
}

export const yuaEsieEngine = new YuaEsieEngine();
export default yuaEsieEngine;
