// 📂 src/ai/security/security-engine.ts
// 🔥 YUA-AI SecurityEngine — ENTERPRISE ULTRA FINAL (2025.11)
// ----------------------------------------------------------------------
// ✔ 코드/문서/요청의 보안 위험도 자동 분석
// ✔ SQL Injection / XSS / Command Injection 감지
// ✔ RBAC/정책 검증
// ✔ Vector 기반 유사 위험 패턴 검색
// ✔ GPT/Gemini/Claude ProviderAuto 기반
// ✔ undefined/null 제거
// ----------------------------------------------------------------------

import { runProviderAuto } from "../../service/provider-engine";
import { MemoryManager } from "../memory/legacy-memory-adapter";
import { VectorEngine } from "../vector/vector-engine";
import { toStringSafe } from "../universal/utils-safe";

export const SecurityEngine = {
  /**
   * @param payload
   * {
   *   input: string;    (필수)
   *   type?: "code" | "api" | "policy" | "general"
   * }
   */
  async analyze(payload: { input: string; type?: string }): Promise<string> {
    try {
      const text = payload?.input?.trim() || "";
      const type = payload?.type || "general";

      if (!text) return "분석할 대상이 없습니다.";

      // -----------------------------
      // Memory + Vector 가져오기
      // -----------------------------
      const mem = await MemoryManager.assembleMemory({
        userMessage: text,
      });

      const short = mem.short.map(m => `[${m.role}] ${m.content}`).join("\n");
      const long = Object.entries(mem.long)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      // Vector 기반 보안 패턴 검색
      const vec = await new VectorEngine().search(text, 5);
      const vecHints =
        vec.map((v: any) => v.meta?.text ?? "").filter(Boolean).join("\n") || "(none)";

      // -----------------------------
      // Security Prompt 생성
      // -----------------------------
      const prompt = `
당신은 YUA-AI SecurityEngine 이다.

[분석 타입]: ${type}

아래 입력의 보안 위험 요소를 기술적으로 분석하라.

[입력]
${text}

[Short Memory]
${short || "(empty)"}

[Long Memory]
${long || "(empty)"}

[Vector 보안 패턴]
${vecHints}

분석 규칙:
- undefined/null 절대 생성 금지
- SQL Injection, XSS, Command Injection 여부 감지
- 인증/인가 문제 여부 확인
- 보안 정책 위반 가능성 설명
- 위험 점수(0~100)
- 위험 사유 3~10개
- 개선 방안 제시
- 기술 문서처럼 명확하게 작성
`.trim();

      const raw = await runProviderAuto(prompt);
      return toStringSafe(raw) || "Security 분석 실패";

    } catch (e: any) {
      return `SecurityEngine Error: ${String(e)}`;
    }
  },
};
