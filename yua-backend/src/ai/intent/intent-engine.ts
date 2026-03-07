// 📂 src/ai/intent/intent-engine.ts
// 🔥 YA-ENGINE Intent Engine — FINAL ENTERPRISE VERSION
// ------------------------------------------------------
// ✔ ChatEngine / Workflow / DeveloperConsole 전부 호환
// ✔ 의미 기반 Intent 식별 (질문 / 명령 / 감정 / 기타)
// ✔ 정규식 + Soft Semantic Rule
// ------------------------------------------------------

import { log } from "../../utils/logger";

export class IntentEngine {
  static async detect(text: string): Promise<string> {
    log("🧭 Intent 분석 실행");

    if (!text?.trim()) return "unknown";

    const t = text.toLowerCase();

    if (/어떻게|방법|how|what should/i.test(t)) return "question";
    if (/해줘|줘|요청|please|can you/i.test(t)) return "command";
    if (/고마워|감사|좋아|love|great/i.test(t)) return "positive";
    if (/싫어|불편|문제|hate|bad/i.test(t)) return "negative";

    return "unknown";
  }
}

export { IntentEngine as default };
