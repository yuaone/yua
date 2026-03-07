// 📂 src/ai/code/eval-engine.ts
// 🔥 YUA-AI EvalEngine — STATIC ANALYSIS + SEMANTICS (2025.11 FINAL)

import { runProviderAuto } from "../../service/provider-engine";
import { toStringSafe } from "../universal/utils-safe";

export interface EvalInput {
  code: string;
  language?: string;
  deep?: boolean;
}

export const EvalEngine = {
  async analyze(input: EvalInput) {
    const code = input.code?.trim() || "";
    const language = input.language || "javascript";
    const deep = input.deep ?? true;

    if (!code) return { ok: false, error: "코드를 입력해주세요." };

    const prompt = `
너는 YUA-AI EvalEngine이다.
입력 코드를 정적분석 + 의미 분석을 수행한다.

[언어]
${language}

[분석 방식]
- 문법 오류 분석
- 위험 패턴 탐지(require, fs, eval, child_process)
- 변수 스코프 오류, undefined 검사
- 타입 오류
- deep 분석: ${deep}

[출력 형식]
{
  "ok": true/false,
  "summary": "...",
  "errors": [],
  "recommend": []
}

[입력 코드]
${code}
    `.trim();

    const raw = await runProviderAuto(prompt);
    return toStringSafe(raw);
  },
};
