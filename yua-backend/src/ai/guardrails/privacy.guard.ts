// 📂 src/ai/guardrails/privacy.guard.ts
// 🔥 PrivacyGuard — 개인정보·민감정보 보호 필터

export class PrivacyGuard {
  /**
   * 새로 추가
   */
  static check(input: string) {
    return this.validate(input);
  }

  static validate(input: string): { ok: boolean; warning?: string } {
    const lower = input.toLowerCase();

    const patterns = [
      "주민등록번호",
      "전화번호 알려줘",
      "개인정보 알려줘",
      "누구인지 맞춰봐",
      "이 사람 어디 사는지",
      "신상 밝혀",
      "주소 알려줘",
      "가족관계 알려줘",
      "얼굴 매칭",
    ];

    for (const p of patterns) {
      if (lower.includes(p)) {
        return {
          ok: false,
          warning:
            "개인정보 또는 민감한 정보는 제공할 수 없습니다. 재식별·추론 또한 허용되지 않습니다.",
        };
      }
    }

    return { ok: true };
  }
}
