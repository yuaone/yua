// 📂 src/ai/hpe/5/agent-orchestrator.ts
// 🧠 HPE 5.0 — Multi-Agent Orchestrator (ERROR-FREE FINAL)

import {
  AgentContext,
  MultiAgentResult,
  AgentTaskResult
} from "./agent-types";

import { AgentAnalyzer } from "./agent-analyzer";
import { AgentPredictor } from "./agent-predictor";
import { AgentCorrector } from "./agent-corrector";
import { AgentAuditor } from "./agent-auditor";
import { AgentSynthesizer } from "./agent-synthesizer";

// ------------------------------------------------------
// 모든 Agent 결과를 표준형으로 래핑
// ------------------------------------------------------
function wrapAgentResult(agent: string, raw: any): AgentTaskResult {
  return {
    agent,
    summary: raw.summary ?? raw.message ?? "",
    confidence: raw.confidence ?? raw.semanticScore ?? raw.stability ?? 0.8,
    raw
  };
}

export async function runHPE5Orchestrator(
  ctx: AgentContext
): Promise<MultiAgentResult> {

  const input = ctx.input;   // ⭐ 기존 agent 시그니처 유지

  // ------------------------------------------------------
  // 1) 개별 Agent 실행 (string input만 전달)
  // ------------------------------------------------------
  const analyzerRaw = AgentAnalyzer(input);
  const predictorRaw = AgentPredictor(input);
  const correctorRaw = AgentCorrector(analyzerRaw);
  const auditorRaw = AgentAuditor(input);

  const analyzer = wrapAgentResult("analyzer", analyzerRaw);
  const predictor = wrapAgentResult("predictor", predictorRaw);
  const corrector = wrapAgentResult("corrector", correctorRaw);
  const auditor = wrapAgentResult("auditor", auditorRaw);

  // ------------------------------------------------------
  // 2) Synthesizer — 모든 raw를 배열로 전달
  // ------------------------------------------------------
  const synthesizerRaw = AgentSynthesizer([
    analyzerRaw,
    predictorRaw,
    correctorRaw,
    auditorRaw
  ]);

  const synthesizer = wrapAgentResult("synthesizer", synthesizerRaw);

  // ------------------------------------------------------
  // 3) 최종 결론
  // ------------------------------------------------------
  const finalDecision = {
    output: synthesizer.summary,
    confidence: synthesizer.confidence
  };

  return {
    analyzer,
    predictor,
    corrector,
    auditor,
    synthesizer,
    finalDecision
  };
}
