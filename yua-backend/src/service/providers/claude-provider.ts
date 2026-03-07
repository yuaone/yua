// 📂 src/service/providers/claude-provider.ts
// 🟣 Claude Provider — MULTI ENGINE SAFE FINAL (2025.11)

import Anthropic from "@anthropic-ai/sdk";
import { log, logError } from "../../utils/logger";

const apiKey = process.env.CLAUDE_API_KEY || "";
const client = new Anthropic({ apiKey });

export async function ClaudeProvider(prompt: string, context: any[] = []) {
  try {
    log("🟣 Claude 실행됨");

    // ⚠ system role 제거 — Anthropic API v2는 user/assistant만 허용
    const response: any = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content:
            "You are Claude inside YUA Multi-AI Engine.\n" +
            "Follow YUA Safety and Consistency protocols.\n\n" +
            "User prompt: " + prompt
        }
      ],
    });

    const blocks: any[] = response?.content ?? [];
    const textBlock = blocks.find((b) => b?.type === "text");

    const output = textBlock?.text || "[Claude 응답 없음]";

    log("📤 Claude 출력 완료");

    return {
      provider: "claude",
      output,
      raw: response,
    };
  } catch (e: any) {
    logError("❌ Claude Provider 오류: " + e.message);

    return {
      provider: "claude",
      error: e.message,
      output: "",
    };
  }
}
