// 📂 src/ai/yua/yua-omega-lite.ts
// -------------------------------------------------------------
// ⚡ YUA-AI Omega-Lite v2.3 — 5-Engine Arbitration Layer (FINAL)
// -------------------------------------------------------------

import { logWarn } from "../../utils/logger";
import { YuaContextualBandit } from "./yua-contextual-bandit";

// -------------------------------------------------------------
// UnifiedEngineOutput
// -------------------------------------------------------------
export interface UnifiedEngineOutput {
  engine: string;
  text: string;
  confidence: number;
  meta?: any;
}

// -------------------------------------------------------------
// RESULT TYPE
// -------------------------------------------------------------
export interface OmegaResult {
  finalText: string;
  weights: Record<string, number>;
  ds: any;
  chosenEngine: string;
  failSafe: boolean;
  debug: any;
}

// -------------------------------------------------------------
// Mass Function Interface
// -------------------------------------------------------------
interface Mass {
  belief: number;
  uncertainty: number;
  text: string;
  engine: string;
  K: number;
}

// -------------------------------------------------------------
// MAIN CLASS
// -------------------------------------------------------------
export class YuaOmegaLite {
  private bandit = new YuaContextualBandit();

  constructor() {}

  private toMass(out: UnifiedEngineOutput): Mass {
    const c = out.confidence ?? 0.5;
    return {
      belief: c,
      uncertainty: 1 - c,
      K: 0,
      text: out.text ?? "",
      engine: out.engine,
    };
  }

  private fuse(m1: Mass, m2: Mass): Mass {
    const K = m1.belief * m2.uncertainty + m2.belief * m1.uncertainty;

    const belief = (m1.belief * m2.belief) / (1 - K + 1e-9);
    const unc = (m1.uncertainty * m2.uncertainty) / (1 - K + 1e-9);

    return {
      belief,
      uncertainty: unc,
      K,
      text: m1.text,
      engine: `${m1.engine}+${m2.engine}`,
    };
  }

  private softGate(metaList: Record<string, any>[]) {
    const μ = metaList.reduce((a, m) => a + (m?.stability?.mu ?? 0), 0) / metaList.length;
    const drift = metaList.reduce((a, m) => a + (m?.drift ?? 0), 0) / metaList.length;
    const causal = metaList.reduce((a, m) => a + (m?.causalRisk ?? 0), 0) / metaList.length;

    const risk = μ * 0.5 + drift * 0.3 + causal * 0.2;

    if (risk > 0.9) return "FAIL";
    if (risk > 0.7) return "REARB";
    return "OK";
  }

  private weightedFusion(list: UnifiedEngineOutput[], α: Record<string, number>) {
    let best = list[0];
    let score = α[list[0].engine] ?? 0;

    for (const item of list) {
      const sc = α[item.engine] ?? 0;
      if (sc > score) {
        best = item;
        score = sc;
      }
    }
    return best.text;
  }

  async run(outputs: UnifiedEngineOutput[]): Promise<OmegaResult> {
    if (!outputs.length) {
      return {
        finalText: "",
        chosenEngine: "NONE",
        failSafe: true,
        weights: {},
        ds: {},
        debug: { reason: "no outputs" },
      };
    }

    const masses = outputs.map((x) => this.toMass(x));

    let fused = masses[0];
    for (let i = 1; i < masses.length; i++) {
      fused = this.fuse(fused, masses[i]);
    }

    const meta0 = outputs[0]?.meta ?? {};
        const mathVerified =
      outputs.find(
        (o) =>
          o.engine.toLowerCase().includes("math") &&
          typeof o.meta?.verified === "boolean"
      )?.meta?.verified ?? null;
      const mathType =
      outputs.find(
        (o) =>
          o.engine.toLowerCase().includes("math") &&
          typeof o.meta?.mathType === "string"
      )?.meta?.mathType ?? "UNKNOWN";


    const state = {
      jsDivergence: 1 - fused.belief,
      dsConflict: fused.K,
      stabilityMu: meta0?.stability?.mu ?? 0,
      jacobian: meta0?.stability?.jacobian ?? 0,
      fisherTrace: meta0?.stability?.fisherTrace ?? 1,
      gen59Confidence: outputs.find((x) => x.engine === "GEN59")?.confidence ?? 0.5,
      mathVerified,
      mathType,
    };

    const bandit = await this.bandit.run(state);
    const α = bandit.weights;

     // ---------------------------------------------------------
     // 🔥 Math Failure → Confidence Soft-Cut
     // ---------------------------------------------------------
    let adjustedOutputs = outputs;
    if (mathVerified === false) {
      adjustedOutputs = outputs.map((o) => {
        if (
          o.engine.toLowerCase().includes("math") ||
          o.engine === "GEN59" ||
          o.engine === "HPE_LITE" ||
          o.engine === "QUANTUM"
        ) {
          return {
            ...o,
            confidence: o.confidence * 0.2, // soft kill
            meta: {
              ...o.meta,
              mathPenaltyApplied: true,
            },
          };
        }
        return o;
      });
    }

        const gate = this.softGate(
      adjustedOutputs.map((o) => ({
        ...o.meta,
        mathVerified,
        mathType,
      }))
    );

    if (gate === "FAIL") {
      logWarn("⚠ FAIL-SAFE ACTIVATED");
      return {
         finalText: adjustedOutputs.find((o) => o.engine === "GEN59")?.text ?? "",
        chosenEngine: "GEN59",
        failSafe: true,
        weights: α,
        ds: fused,
        debug: { state, bandit },
      };
    }

    if (gate === "REARB") {
      logWarn("🔁 RE-ARBITRATION TRIGGERED");

      const fallback =
        state.jsDivergence > 0.3
          ? adjustedOutputs.find((o) => o.engine === "GEN59")?.text
          : adjustedOutputs.find((o) => o.engine === "HPE_LITE")?.text;

      return {
        finalText: fallback ?? "",
        chosenEngine: "REARB",
        failSafe: false,
        weights: α,
        ds: fused,
        debug: { state, bandit },
      };
    }

    const bestText = this.weightedFusion(adjustedOutputs, α);

    // ---------------------------------------------------------
    // ⭐ FINAL FIX — TypeScript strict key typing
    // ---------------------------------------------------------
    const keys = Object.keys(α) as (keyof typeof α)[];

    const chosen = keys.reduce((a, b) =>
      α[a] > α[b] ? a : b
    );

    return {
      finalText: bestText,
      chosenEngine: chosen,
      failSafe: false,
      weights: α,
            ds: fused,
      debug: {
        state,
        bandit,
        mathVerified,
        mathConfidenceCut: mathVerified === false,
      },
    };
  }
}
