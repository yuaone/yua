// 📂 src/service/yua-stock-service.ts
// -------------------------------------------------------------
// ⚡ YUA Stock Service — v2.3 Stable
// -------------------------------------------------------------

import { logEngine } from "../utils/logger"; // 경로 수정

export class YuaStockService {
  constructor() {}

  /* -------------------------------------------------------------
   * 간단한 텍스트 기반 리스크 분석
   * -----------------------------------------------------------*/
  private analyzeRisk(text: string) {
    const lower = text.toLowerCase();

    const signals = {
      positive: ["모멘텀", "상승", "호재", "거래량 증가"],
      negative: ["하락", "악재", "리스크", "변동성"],
    };

    let score = 0;

    signals.positive.forEach((p) => {
      if (lower.includes(p)) score += 1;
    });

    signals.negative.forEach((n) => {
      if (lower.includes(n)) score -= 1;
    });

    return score;
  }

  /* -------------------------------------------------------------
   * 메인 서비스 함수
   * -----------------------------------------------------------*/
  async process(reply: string, input: any): Promise<string> {
    const risk = this.analyzeRisk(reply);

    logEngine({
      engine: "YUA-Stock-Service",
      action: "analyze",
      request: reply,
      response: { risk },
    });

    let advisory = "";

    if (risk > 1) {
      advisory = "📈 시장 모멘텀이 긍정적으로 보입니다.\n";
    } else if (risk < -1) {
      advisory = "📉 변동성 또는 부정적 요소가 관찰됩니다.\n";
    } else {
      advisory = "📊 중립적이며 추가 데이터 확인이 필요합니다.\n";
    }

    return (
      advisory +
      "\n" +
      "🔍 AI 분석 내용:\n" +
      reply +
      "\n\n" +
      "⚠️ 참고: 본 정보는 투자 조언이 아닌 데이터 기반 분석입니다."
    );
  }
}
