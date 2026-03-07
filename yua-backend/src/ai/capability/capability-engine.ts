// src/ai/capability/capability-engine.ts

export interface CapabilityMeta {
  engine: string;

  // 🔒 SSOT: capability stage name
  stage: string;

  latencyMs: number;
  success: boolean;
}

export interface CapabilityResult<O> {
  output: O;
  confidence: number;
  meta: CapabilityMeta;
}

export interface CapabilityEngine<I, O> {
  execute(input: I): Promise<CapabilityResult<O>>;
}
