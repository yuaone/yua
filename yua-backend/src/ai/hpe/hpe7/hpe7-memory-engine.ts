// 📂 src/ai/hpe/hpe7/hpe7-memory-engine.ts
// ------------------------------------------------------
// HPE 7.0 — Memory OS (FINAL CLEAN VERSION)
// ------------------------------------------------------

import { runHPE6 } from "../hpe6/hpe6-engine";
import { MemoryLoader } from "./mem-loader";
import { MemoryReasoner } from "./mem-reasoner";
import { extractTags } from "./memory-utils";

export async function runHPE7Memory(input: string) {
  const safeInput = String(input ?? "");

  // ---------------------------------------------------------
  // 1) HPE6 실행
  // ---------------------------------------------------------
  const hpe6 = await runHPE6(safeInput, "memory-source.ts");

  const issues = Array.isArray(hpe6?.issues) ? hpe6.issues : [];
  const patches = Array.isArray(hpe6?.patches) ? hpe6.patches : [];

  // ---------------------------------------------------------
  // 2) MemoryLoader 기록 (HPE7: 단일 인자만 허용)
  // ---------------------------------------------------------
  MemoryLoader.recordInteraction(safeInput, "");
  // ---------------------------------------------------------
  // 3) 메모리 기반 Reasoning
  // ---------------------------------------------------------
  const recentSummary = MemoryReasoner.summarizeRecent(24);
  const patterns = MemoryReasoner.detectPatterns();

  // ---------------------------------------------------------
  // 4) 인사이트 생성 (nodes / keywords 제거)
  // ---------------------------------------------------------
  const insight = {
    sampleCount: recentSummary.total,
    topKeywords: Array.isArray(patterns)
      ? patterns
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : []
  };

  // ---------------------------------------------------------
  // 5) 최종 결과
  // ---------------------------------------------------------
  return {
    ok: true,
    version: "HPE-7.0",
    hpe6,
    memory: {
      recentSummary,
      patterns,
      insight
    }
  };
}
