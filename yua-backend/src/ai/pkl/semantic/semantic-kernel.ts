// 📂 src/ai/pkl/semantic/semantic-kernel.ts
// 🔥 PKL 3.0 — Semantic Safety Kernel (2025.11 FINAL BUILD-PASS)

export interface SemanticKernelResult {
  safe: boolean;
  reason: string;
  cleaned: string;
}

const forbiddenPatterns: RegExp[] = [
  /욕설/gi,
  /죽여/gi,
  /자살/gi,
  /테러/gi,
  /살해/gi,
  /delete\s*user/gi,
  /drop\s+table/gi,
  /union\s+select/gi,
];

export function runSemanticKernel(input: string): SemanticKernelResult {
  try {
    let risk = 0;

    for (const p of forbiddenPatterns) {
      if (p.test(input)) risk += 0.3;
    }

    const safe = risk < 0.7;
    const reason = safe ? "" : "금지된 표현 또는 위험 단어가 포함되었습니다.";

    // 민감 데이터 마스킹
    const cleaned = String(input ?? "")
      .replace(/(\d{3})-(\d{4})-(\d{4})/g, "***-****-****")
      .replace(/password|passwd|비밀번호/gi, "[MASKED]");

    return {
      safe,
      reason,
      cleaned,
    };
  } catch (err: any) {
    return {
      safe: false,
      reason: `SemanticKernel Error: ${err?.message ?? err}`,
      cleaned: "",
    };
  }
}
