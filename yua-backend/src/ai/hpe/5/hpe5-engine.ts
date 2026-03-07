// 📂 src/ai/hpe/5/hpe5-engine.ts
// 🔥 HPE 5.0 — Multi-Agent Brain Engine (FINAL 2025.11)

import { AgentAnalyzer } from "./agent-analyzer";
import { AgentPredictor } from "./agent-predictor";
import { AgentCorrector } from "./agent-corrector";
import { AgentAuditor } from "./agent-auditor";
import { AgentAlign } from "./agent-align";
import { AgentSynthesizer } from "./agent-synthesizer";

import { HPE5Output, AgentResult } from "./hpe5-protocol";

/**
 * HPE 5.0 — Multi-Agent Brain
 * ---------------------------------------------
 * Analyzer → Predictor → Corrector → Auditor → Align → Synthesizer
 * ---------------------------------------------
 */
export async function runHPE5(input: string): Promise<HPE5Output> {
  // 1) 개별 에이전트 실행 (함수 호출 방식)
  const analyzer: AgentResult = await AgentAnalyzer(input);
  const predictor: AgentResult = await AgentPredictor(input);
  const corrector: AgentResult = await AgentCorrector(analyzer);
  const auditor: AgentResult = await AgentAuditor(input);
  const align: AgentResult = await AgentAlign(input);

  const agents: AgentResult[] = [
    analyzer,
    predictor,
    corrector,
    auditor,
    align
  ];

  // 2) Synthesizer가 전체 agent들의 의견을 종합
  const final = await AgentSynthesizer(agents);

  // 3) 최종 구조 반환
  return {
    ok: true,
    agents,
    final
  };
}
