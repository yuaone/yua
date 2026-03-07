// 📂 src/ai/utils/pick-model.ts
// 🔥 YUA-AI Model Router — MASTER FINAL (FIXED)

import { TierType } from "../../types/tier-types";

export type ModelType =
  | "chat"
  | "expert"
  | "report"
  | "quantum"
  | "match";

type EngineId =
  | "gen59"
  | "hpe-lite"
  | "hpe7"
  | "omega-lite"
  | "stability"
  | "memory"
  | "quantum-v2";

export interface BillingBreakdown {
  [engineId: string]: number;
}

export interface BillingPlan {
  tier: TierType;
  quantumAllowed: boolean;
  estimatedCostUnit: number;
  breakdown: BillingBreakdown;
}

export interface EnginePlan {
  type: ModelType;
  tier: TierType;
  model: string;
  engines: EngineId[];
  billing: BillingPlan;
}

function shouldUseQuantum(): boolean {
  return (process.env.YUA_Q2 ?? "off") === "on";
}

function getTier(): TierType {
  const raw = process.env.YUA_AI_TIER ?? "free";

  if (raw === "enterprise" || raw === "business" || raw === "pro" || raw === "free") {
    return raw;
  }
  return "free";
}

function tierModel(target: ModelType): string {
  const tier = getTier();

  const table: Record<TierType, Record<ModelType, string>> = {
    enterprise: {
      chat: "gpt-4.1",
      expert: "gpt-4.1",
      report: "gpt-4.1",
      quantum: "yua-q2",
      match: "gpt-4.1",
    },
    business: {
      chat: "gpt-4.1-preview",
      expert: "gpt-4.1-preview",
      report: "gpt-4.1-preview",
      quantum: "yua-q2",
      match: "gpt-4.1-preview",
    },
    pro: {
      chat: "gpt-4.1-mini",
      expert: "gpt-4.1-mini",
      report: "gpt-4.1-mini",
      quantum: "yua-q2",
      match: "gpt-4.1-mini",
    },
    free: {
      chat: "gpt-4.1-mini",
      expert: "gpt-4.1-mini",
      report: "gpt-4.1-mini",
      quantum: "yua-q2",
      match: "gpt-4.1-mini",
    },
  };

  return table[tier][target];
}

const ENGINE_COST_UNIT: Record<EngineId, number> = {
  gen59: 1,
  "hpe-lite": 1.5,
  hpe7: 2.5,
  "omega-lite": 0.5,
  stability: 0.3,
  memory: 0.2,
  "quantum-v2": 10,
};

function estimateCost(tier: TierType, engines: EngineId[], quantumAllowed: boolean): BillingPlan {
  let estimatedCostUnit = 0;
  const breakdown: BillingBreakdown = {};

  for (const engine of engines) {
    if (engine === "quantum-v2" && (!quantumAllowed || tier === "free")) {
      breakdown[engine] = 0;
      continue;
    }

    const unit = ENGINE_COST_UNIT[engine] ?? 0;
    breakdown[engine] = unit;
    estimatedCostUnit += unit;
  }

  return {
    tier,
    quantumAllowed,
    estimatedCostUnit,
    breakdown,
  };
}

export const pickEnginePlan = (type: ModelType): EnginePlan => {
  const tier = getTier();
  const quantumAllowed = tier !== "free" && shouldUseQuantum();

  const modelId = type === "quantum" ? "yua-q2" : tierModel(type);

  const engines: EngineId[] = [];

  // 기본 엔진
  engines.push("stability", "memory");

  if (type === "chat" || type === "expert" || type === "report") {
    engines.push("gen59", "hpe-lite", "omega-lite");
    if (quantumAllowed) engines.push("quantum-v2");

    if (type === "report" || type === "expert") {
      if (tier === "enterprise" || tier === "business" || tier === "pro") {
        engines.push("hpe7");
      }
    }
  } else if (type === "quantum") {
    engines.push("gen59", "omega-lite");
    if (quantumAllowed) engines.push("quantum-v2");
  } else if (type === "match") {
    engines.push("gen59", "hpe-lite", "omega-lite");
  }

  const billing = estimateCost(tier, engines, quantumAllowed);

  return {
    type,
    tier,
    model: modelId,
    engines,
    billing,
  };
};

/* --------------------------------------------------------
 * 🔥 핵심 오류 수정된 부분
 * - 기존: chat && shouldUseQuantum() → yua-q2
 * - 수정: chat은 tierModel() 결과만 사용 (OpenAI 모델 호출 정상화)
 * -------------------------------------------------------- */
export const pickModel = (type: ModelType): string => {
  if (type === "quantum") return "yua-q2";
  return tierModel(type); // ⭐ chat-stream은 이제 여기서 정상 모델 반환됨
};

