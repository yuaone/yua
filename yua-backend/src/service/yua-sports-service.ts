// 📂 src/service/yua-sports-service.ts
// -------------------------------------------------------------
// ⚽ YUA Sports Service — v2.3 Stable
// -------------------------------------------------------------

import { logEngine } from "../utils/logger"; // 경로 수정

export class YuaSportsService {
  constructor() {}

  /* -------------------------------------------------------------
   * 간단한 전술 패턴 분석
   * -----------------------------------------------------------*/
  private classifyStrategy(text: string) {
    const t = text.toLowerCase();

    if (t.includes("압박") || t.includes("전방") || t.includes("공격")) {
      return "공격 중심 전술 (Aggressive)";
    }
    if (t.includes("수비") || t.includes("라인") || t.includes("조직력")) {
      return "수비 조직 중심 전술 (Defensive)";
    }
    if (t.includes("역습") || t.includes("빠른 전환")) {
      return "전환/역습 중심 전술 (Transition)";
    }

    return "일반 전술 흐름 (General Play)";
  }

  /* -------------------------------------------------------------
   * 메인 엔트리
   * -----------------------------------------------------------*/
  async process(reply: string, input: any): Promise<string> {
    const strat = this.classifyStrategy(reply);

    logEngine({
      engine: "YUA-Sports-Service",
      action: "analyze",
      request: reply,
      response: { strategy: strat },
    });

    return (
      `⚽ 전술 분석: ${strat}\n\n` +
      `📄 경기 해석:\n${reply}\n\n` +
      "📌 참고: 본 분석은 AI 전술 해석이며 실제 경기 상황과 다를 수 있습니다."
    );
  }
}
