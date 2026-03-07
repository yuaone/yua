// 📂 src/ai/yua/yua-router.ts
// -------------------------------------------------------------
// ⚡ YUA-AI Router v2.3 — Multi-Engine Final Decision Layer
// -------------------------------------------------------------

import { logWarn } from "../../utils/logger";

import { YuaStabilityKernel } from "./yua-stability-kernel";
import { YuaGen59Lite } from "./yua-gen59-lite";

import { hpeLite } from "../lite/hpe-lite";
import { runHPE7 } from "../hpe/hpe7/hpe7-engine";

import { runQuantumEngine } from "../quantum/quantum-engine";
import { runQuantumEngineV2 } from "../quantum/quantum-engine-v2";

import { YuaMemoryEngine } from "./yua-memory-engine";
import { YuaOmegaLite, UnifiedEngineOutput } from "./yua-omega-lite";

import { YuaStockService } from "../../service/yua-stock-service";
import { YuaSportsService } from "../../service/yua-sports-service";

export interface RouterInput {
  userId?: string;
  message: string;
  timestamp?: number;
}

export interface RouterOutput {
  reply: string;
  service: "stock" | "sports" | "default";
  safety: {
    mu: number;
    blocked: boolean;
    reason?: string;
  };
  reasoning: any[];
}

export class YuaRouter {
  private stability = new YuaStabilityKernel();
  private memory = new YuaMemoryEngine();
  private gen59 = new YuaGen59Lite();
  private omega = new YuaOmegaLite();

  private stock = new YuaStockService();
  private sports = new YuaSportsService();

  constructor() {}

  // -------------------------------------------------------------
  // 서비스 선택
  // -------------------------------------------------------------
  private detectService(text: string): "stock" | "sports" | "default" {
    const t = text.toLowerCase();

    if (t.includes("주가") || t.includes("종목") || t.includes("stock"))
      return "stock";
    if (t.includes("경기") || t.includes("스포츠") || t.includes("운동"))
      return "sports";

    return "default";
  }

  // -------------------------------------------------------------
  // RUN
  // -------------------------------------------------------------
  async run(input: RouterInput): Promise<RouterOutput> {
    const userText = input.message ?? "";

    // ---------------------------------------------------------
    // 1) Stability Kernel
    // ---------------------------------------------------------
    const metrics = await this.stability.refresh([[0.5, 0.1, 0.9]]);

    // 🔥 FIXED: StabilityMetrics.stabilityScore → metrics.mu
    const mu = metrics.mu;

    const safety = {
      mu,
      blocked: mu >= 0.9,
      reason: mu >= 0.9 ? "High μ-safety risk" : undefined,
    };

    // ---------------------------------------------------------
    // 2) Memory Update
    // ---------------------------------------------------------
    const memoryResult = await this.memory.store(
      `mem_${Date.now()}`,
      userText
    );

    // ---------------------------------------------------------
    // 3) Gen59
    // ---------------------------------------------------------
    const g = await this.gen59.run(userText);

    // ---------------------------------------------------------
    // 4) HPE Lite
    // ---------------------------------------------------------
    const h = hpeLite(userText);

    // ---------------------------------------------------------
    // 5) HPE 7
    // ---------------------------------------------------------
    const h7 = await runHPE7({
      text: userText,
    });

    // ---------------------------------------------------------
    // 6) Quantum v1
    // ---------------------------------------------------------
    const q1 = await runQuantumEngine(userText);

    // ---------------------------------------------------------
    // 7) Quantum v2
    // ---------------------------------------------------------
    const q2 = await runQuantumEngineV2(userText);

    // ---------------------------------------------------------
    // 8) UnifiedEngineOutput
    // ---------------------------------------------------------
    const engines: UnifiedEngineOutput[] = [
      {
        engine: "GEN59",
        text: g.text,
        confidence: g.confidence,
        meta: {
          stability: metrics,
          memory: memoryResult,
          causalRisk: 0,
        },
      },
      {
        engine: "HPE_LITE",
        text: h.stabilized,
        confidence: h.confidence,
        meta: {
          stability: metrics,
          causalRisk: 0,
        },
      },
      {
        engine: "HPE7",
        text: h7.event.output,
        confidence: 0.75,
        meta: {
          stability: metrics,
          causalRisk: 0,
        },
      },
      {
        engine: "QUANTUM_V1",
        text: q1.collapsed,
        confidence: Math.max(0.1, 1 - q1.drift),
        meta: {
          drift: q1.drift,
          stability: metrics,
          causalRisk: 0,
        },
      },
      {
        engine: "QUANTUM_V2",
        text: q2.token,
        confidence: q2.confidence ?? 0.85,
        meta: {
          drift: q2.working?.real?.length ?? 0,
          stability: metrics,
          causalRisk: 0,
        },
      },
    ];

    // ---------------------------------------------------------
    // 9) Fail-safe
    // ---------------------------------------------------------
    if (safety.blocked) {
      return {
        reply: "⚠️ 안정성을 위해 간단히만 답변할게요.\n" + g.text,
        service: "default",
        safety,
        reasoning: ["fail-safe(μ-safety)", metrics],
      };
    }

    // ---------------------------------------------------------
    // 10) Omega-Lite Arbitration
    // ---------------------------------------------------------
    const arb = await this.omega.run(engines);
    let finalText = arb.finalText;

    // ---------------------------------------------------------
    // 11) 서비스 라우팅
    // ---------------------------------------------------------
    const service = this.detectService(userText);

    if (service === "stock") {
      finalText = await this.stock.process(finalText, input);
    } else if (service === "sports") {
      finalText = await this.sports.process(finalText, input);
    }

    // ---------------------------------------------------------
    // 12) OUTPUT
    // ---------------------------------------------------------
    return {
      reply: finalText,
      service,
      safety,
      reasoning: [
        { stability: metrics },
        { memory: memoryResult },
        { omega: arb },
      ],
    };
  }
}
