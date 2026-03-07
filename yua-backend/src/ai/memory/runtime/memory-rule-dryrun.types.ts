// 📂 src/ai/memory/runtime/memory-rule-dryrun.types.ts

export interface MemoryRuleDryRunResult {
  affectedMemories: number;
  expectedFreezeCount: number;
  confidenceShiftAvg: number;
  riskScore: number;
}
