// 📂 src/ai/hpe/5/agent-types.ts

export interface AgentTaskResult {
  agent: string;
  summary: string;
  confidence: number;
  raw?: any;        // ⭐ 추가 — wrapAgentResult 오류 해결
}

export interface MultiAgentResult {
  analyzer: AgentTaskResult;
  predictor: AgentTaskResult;
  corrector: AgentTaskResult;
  auditor: AgentTaskResult;
  synthesizer: AgentTaskResult;
  finalDecision: {
    output: string;
    confidence: number;
  };
}

export interface AgentContext {
  input: string;
  context?: any[];
}
