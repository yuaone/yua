import OpenAI from "openai";
import type { MemoryIntent } from "./memory-intent";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConfidenceResult {
  score: number;
  source: "rule" | "llm" | "hybrid";
  reason: string;
}

export async function scoreIntentConfidence(
  text: string,
  intent: MemoryIntent,
  llmEnabled: boolean
): Promise<ConfidenceResult> {
  let score = 0;
  let reason: string[] = [];

  // Rule score
  if (intent === "REMEMBER") {
    score += 0.5;
    reason.push("explicit_remember_intent");
  }

  if (/(기억|잊지마|remember|저장)/.test(text)) {
    score += 0.3;
    reason.push("explicit_keyword");
  }

  // LLM score
  if (llmEnabled) {
    try {
      const res = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `이 문장이 장기적으로 기억할 사실인가?
문장: "${text}"
0~1 사이 숫자만 출력`,
        max_output_tokens: 10,
      });

      const v = parseFloat(
        String(res.output_text).replace(/[^0-9.]/g, "")
      );

      if (!Number.isNaN(v)) {
        score = (score + v) / 2;
        reason.push("llm_judgement");
      }
    } catch {
      // LLM 실패 → rule만 사용
    }
  }

  return {
    score: Math.min(score, 1),
    source: llmEnabled ? "hybrid" : "rule",
    reason: reason.join(","),
  };
}
