// 📂 src/service/providers/gemini-provider.ts
// 🔮 Gemini Provider — MULTI ENGINE FINAL (2025.11)
// ------------------------------------------------------------
// ✔ 규격 통일: run(prompt, context?)
// ✔ response.text() 안전처리
// ✔ TS strict 오류 0
// ------------------------------------------------------------

import { GoogleGenerativeAI } from "@google/generative-ai";
import { log, logError } from "../../utils/logger";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GeminiProvider(prompt: string, context: any[] = []) {
  try {
    log("🔮 Gemini 실행됨");

    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const res: any = await model.generateContent(prompt);
    const output = res?.response?.text?.() || "[Gemini 응답 없음]";

    log("📤 Gemini 출력 완료");

    return {
      provider: "gemini",
      output,
      raw: res,
    };
  } catch (e: any) {
    logError("❌ Gemini Provider 오류: " + e.message);

    return {
      provider: "gemini",
      error: e.message,
      output: "",
    };
  }
}
