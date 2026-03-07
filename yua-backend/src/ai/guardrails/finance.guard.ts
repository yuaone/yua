// 📂 src/ai/guardrails/finance.guard.ts
// 🔥 FinanceGuard — 금융·투자 위험 필터 (FINAL FIXED VERSION)

export class FinanceGuard {
  static validate(input: string): { ok: boolean; warning?: string } {
    const lower = input.toLowerCase();

    // 확정적 표현 금지
    const guaranteed = [
      '100% 수익',
      '무조건 오릅니다',
      '확정 수익',
      '손실 없음',
    ];

    for (const g of guaranteed) {
      if (lower.includes(g)) {
        return {
          ok: false,
          warning:
            '확정적 금융·투자 표현은 제공할 수 없습니다. 모든 투자는 변동성이 존재합니다.',
        };
      }
    }

    // 금지 투자 키워드
    const forbidden = [
      '불법 투자',
      '작전주',
      '내부 정보',
      '주가 조작',
      '대출 받아서 투자',
      '빚내서 투자',
      '급등주 추천',
      '종목 추천',
      '국내 주식 종목 추천',
    ];

    for (const f of forbidden) {
      if (lower.includes(f)) {
        return {
          ok: false,
          warning:
            '해당 요청은 금융 위험 또는 위법 요소가 있어 답변할 수 없습니다.',
        };
      }
    }

    return { ok: true };
  }
}
