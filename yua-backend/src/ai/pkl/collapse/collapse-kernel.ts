// 📂 src/ai/pkl/collapse/collapse-kernel.ts
// 🔥 PKL 3.0 Collapse Kernel — FULLY COMPATIBLE WITH pkl-engine.ts (2025.12)

export type CollapseEngineType =
  | "LITE"
  | "HPE"
  | "QUANTUM"
  | "BIZ"
  | "PATTERN"
  | "RISK"
  | "DEFAULT";

export interface CollapseInput {
  engine: CollapseEngineType;
  text: string;
  confidence: number;
}

export interface CollapseOutput {
  collapsed: string;
  finalConfidence: number;
  debug?: any;
}

/**
 * 최종 응답 선택 로직 (PKL3 핵심 알고리즘)
 */
export function runCollapseKernel(list: CollapseInput[]): CollapseOutput {
  if (!Array.isArray(list) || list.length === 0) {
    return {
      collapsed: "",
      finalConfidence: 0,
      debug: { reason: "Empty collapse input" },
    };
  }

  // 엔진별 가중치
  const weightTable: Record<CollapseEngineType, number> = {
    HPE: 1.4,
    QUANTUM: 1.25,
    LITE: 1.15,
    BIZ: 1.1,
    PATTERN: 1.0,
    RISK: 0.9,
    DEFAULT: 0.85,
  };

  const scored = list.map((item) => {
    const w = weightTable[item.engine] ?? 1.0;
    const score = item.confidence * w;

    return {
      ...item,
      weight: w,
      score,
    };
  });

  // 높은 점수 우선
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  return {
    collapsed: best.text,
    finalConfidence: best.score,
    debug: scored,
  };
}
