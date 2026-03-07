// 📂 src/ai/code/code-engine.ts
// 🔥 YUA-AI CodeEngine — FINAL ENTERPRISE VERSION (2025.11)

import { runProviderAuto } from "../../service/provider-engine";
import { toStringSafe } from "../universal/utils-safe";
import { SandboxExec } from "./sandbox-exec";

export interface CodeEngineInput {
  code: string;
  language?: string;
  task?: "review" | "refactor" | "debug" | "test" | "explain";
}

export const CodeEngine = {
  async run(input: CodeEngineInput) {
    const code = input.code?.trim() || "";
    const language = input.language || "javascript";
    const task = input.task || "review";

    if (!code) return "코드를 입력해줘.";

    const prompt = `
너는 YUA-AI CodeEngine이다.

[언어]
${language}

[요청 작업]
${task}

[분석 규칙]
- 오류 분석 시 line 번호 포함
- 리팩터링 시 전체 코드 반환
- 테스트 생성 시 Jest 또는 기본 테스트 케이스 생성
- undefined/null 절대 생성하지 말 것
- 기존 스타일 보존
- 코드 설명 시 과한 구조화 금지

[입력 코드]
${code}

[AI 작업 시작]
    `.trim();

    const raw = await runProviderAuto(prompt);
    return toStringSafe(raw);
  },
};
