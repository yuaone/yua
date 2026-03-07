// 📂 src/ai/guardrails/safety.guard.ts
// 🔥 SafetyGuard — 자해·타해·범죄·위험행동 필터

export class SafetyGuard {
  /**
   * 새로 추가
   */
  static check(input: string) {
    return this.validate(input);
  }

  static validate(input: string): { ok: boolean; warning?: string } {
    const lower = input.toLowerCase();

const harmfulPatterns = [
  /죽고\s*싶/,
  /자살/,
  /해치고\s*싶/,
  /폭탄/,
  /무기\s*만드는\s*법/,
  /독극물/,
  /방화/,
  /폭력/,
  /살인/,
  /강도/,
  /성폭력/,
  /도둑질/,
  /해킹\s*(하는\s*법)?/,
  /디도스/,
];

 for (const pattern of harmfulPatterns) {
   if (pattern.test(lower)) {
        return {
          ok: false,
          warning:
            "해당 요청은 안전과 관련된 심각한 위험이 있어 답변할 수 없습니다. 필요한 경우 주변의 도움을 요청해주세요.",
        };
      }
    }

    return { ok: true };
  }
}
