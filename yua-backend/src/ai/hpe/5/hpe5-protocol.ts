// 📂 src/ai/hpe/5/hpe5-protocol.ts
// 🔥 HPE 5.0 — Multi-Agent Protocol (FINAL 2025.11)

// -----------------------------------------------------
// AgentResult
// 모든 에이전트가 반드시 반환해야 하는 최소 구조
// -----------------------------------------------------
export interface AgentResult {
  role: string;     // agent 이름
  [key: string]: any;  // agent-specific payload
}

// -----------------------------------------------------
// HPE5Output
// runHPE5() → 최종 반환 구조
// -----------------------------------------------------
export interface HPE5Output {
  ok: boolean;
  agents: AgentResult[];  // analyzer, predictor, corrector, auditor, align
  final: AgentResult;     // Synthesizer 결과 (최종 결론)
}
