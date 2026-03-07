// 📂 src/service/providers/gpt-provider.ts
// 🤖 GPT Provider — MULTI ENGINE FINAL (2025.11)
// ------------------------------------------------------------
// ✔ GPT-4.1-mini (2025 최신 버전)
// ✔ 출력 형식 Claude/Gemini와 100% 통일
// ------------------------------------------------------------

import OpenAI from "openai";
import { log, logError } from "../../utils/logger";

const apiKey = process.env.OPENAI_API_KEY || "";
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function GPTProvider(prompt: string, context: any[] = []) {
  try {
    if (!client) throw new Error("GPT Client 초기화 실패 (API KEY 없음)");

    log("🤖 GPT 실행됨");

    const res = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are GPT inside YUA Multi-AI Engine." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const output =
      res?.choices?.[0]?.message?.content || "[GPT 응답 없음]";

    log("📤 GPT 출력 완료");

    return {
      provider: "gpt",
      output,
      raw: res,
    };
  } catch (e: any) {
    logError("❌ GPT Provider 오류: " + e.message);

    return {
      provider: "gpt",
      error: e.message,
      output: "",
    };
  }
}
