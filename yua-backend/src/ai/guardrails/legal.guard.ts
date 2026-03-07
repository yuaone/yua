// 📂 src/ai/guardrails/legal.guard.ts
// 🔥 LegalGuard — 법률/세무/규제 관련 금지행위 필터

export class LegalGuard {
  /**
   * 새로 추가 — GuardrailManager가 요구하는 표준 메서드
   */
  static check(input: string) {
    return this.validate(input);
  }

  static validate(input: string): { ok: boolean; warning?: string } {
    const lower = input.toLowerCase();

    const forbidden = [
      "대리 신고",
      "신고 대행",
      "소송해줘",
      "법적 책임 져줘",
      "세무 신고 대신",
      "탈세 방법",
      "불법적으로",
      "위장 전입",
      "허위 신고",
      "면세 조작",
    ];

    for (const f of forbidden) {
      if (lower.includes(f)) {
        return {
          ok: false,
          warning:
            "해당 요청은 법률·세무 대리행위 또는 불법 요소가 포함될 수 있어 처리할 수 없습니다.",
        };
      }
    }

    const judgement = ["판결", "유죄", "무죄", "법 해석", "법적으로 확실한"];

    for (const j of judgement) {
      if (lower.includes(j)) {
        return {
          ok: false,
          warning:
            "법률·세무 판단은 법적 자격을 갖춘 전문가만 할 수 있습니다.",
        };
      }
    }

    return { ok: true };
  }
}
