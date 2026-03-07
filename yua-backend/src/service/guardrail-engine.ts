// 📂 src/service/guardrail-engine.ts
// 🔥 YA-ENGINE Guardrail Engine — FINAL (2025.11)

import { log } from "../utils/logger";

export async function runGuardrail(text: string): Promise<string> {
  if (!text) return "";

  log("🛡 Guardrail 검사 실행");

  const banned = [
    /욕설|씨발|좆|개새끼/i,
    /폭력|살인|테러/i,
    /마약|불법/i,
    /주민등록번호/i,
    /계좌번호/i,
  ];

  for (const rule of banned) {
    if (rule.test(text)) {
      return "⚠️ Guardrail: 부적절한 내용이 감지되어 안전하게 수정되었습니다.";
    }
  }

  return text;
}
