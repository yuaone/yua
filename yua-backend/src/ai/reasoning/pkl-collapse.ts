// 📂 src/ai/reasoning/pkl-collapse.ts
// 🔥 PKL 3.0 — Collapse Kernel (ChatEngine 전용 경량버전)

interface CollapsePayload {
  input: string;
  output: string;
  driftScore: number;
}

/**
 * Collapse 규칙:
 * 1) Drift 높을수록 확신 완화
 * 2) 위험 문구 제거
 * 3) 톤 안정화 ("높은 가능성으로 보입니다")
 */
export function pklCollapse(payload: CollapsePayload): string {
  const { input, output, driftScore } = payload;

  let text = output;

  // 1) drift 기반 확신 완화
  if (driftScore > 0.6) {
    text = text.replace(/확실|100%|절대/gi, "높은 가능성으로 보입니다");
  }

  // 2) 위험 표현 안정화
  text = text
    .replace(/무조건/gi, "대체로")
    .replace(/단언/gi, "해석하건대")
    .replace(/확신/gi, "추정컨대");

  // 3) 기본 마무리 톤
  if (!/[.!?]$/.test(text)) text += "입니다.";

  return text.trim();
}
