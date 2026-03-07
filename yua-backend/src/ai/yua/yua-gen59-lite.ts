// 📂 src/ai/yua/yua-gen59-lite.ts
// ⚡ YUA-AI Gen5.9-Lite Engine — v2.3 FIXED (2026)

import { openai } from "../utils/openai-client";

import { YuaStabilityKernel } from "./yua-stability-kernel";
import { YuaMemoryEngine } from "./yua-memory-engine";
import { YuaTDAVIB } from "./yua-tdavib";

import { safeNormalize } from "../../utils/common/vector-utils";
import { logger } from "../../utils/logger";

import { StabilityMetrics } from "./yua-types";

export interface Gen59Output {
  text: string;
  confidence: number;
  stability: StabilityMetrics;
  memoryUsed: boolean;
}

export class YuaGen59Lite {
  private kernel = new YuaStabilityKernel();
  private memory = new YuaMemoryEngine();
  private tdavib = new YuaTDAVIB();

  private model = "gpt-4o-mini";
  private lambda = 0;

  constructor() {}

  // -------------------------------------------------------------
  // 1) Memory Context
  // -------------------------------------------------------------
  private async fetchContext(query: string) {
    const search = await this.memory.search(query, 3);

    if (!search.results.length) {
      return { ctx: "", mergedVec: null };
    }

    const ctx = search.results.map((r) => r.text).join("\n");

    const base = new Array(search.results[0].vector.length).fill(0);
    const sum = search.results.reduce(
      (acc, r) => acc.map((x, i) => x + r.vector[i]),
      base
    );

    return {
      ctx,
      mergedVec: safeNormalize(sum),
    };
  }

  // -------------------------------------------------------------
  // 2) λ 계산 (StabilityMetrics 최신 필드 기준)
  // -------------------------------------------------------------
  private computeLambda(m: StabilityMetrics): number {
    const jac = m.jacobian;
    const crlb = m.crlb;
    const stab = 1 / (1 + crlb);

    let λ = 0;
    if (jac > 3) λ += 0.2;
    if (jac > 5) λ += 0.3;
    if (crlb > 3) λ += 0.1;
    if (stab < 0.3) λ += 0.2;

    return Math.min(0.6, λ);
  }

  // -------------------------------------------------------------
  // 3) GPT forward
  // -------------------------------------------------------------
  private async forward(query: string, ctx: string) {
    try {
      const client = openai();

      const res = await client.responses.create({
        model: this.model,
        input: `
[Context]
${ctx}

[Query]
${query}

[Instruction]
- 안정성 규칙: 과추론 금지
- λ=${this.lambda}
- 불확실 시 "추가 정보 필요"
        `.trim(),
      });

      const out =
        (res as any)?.output?.[0]?.content ??
        (res as any)?.response_output?.[0]?.content ??
        "";

      return typeof out === "string" ? out : JSON.stringify(out);
    } catch (err: any) {
      logger.error("Gen59 forward error:", err.message);
      return "오류가 발생했습니다.";
    }
  }

  // -------------------------------------------------------------
  // 4) Confidence (최신 StabilityMetrics 호환)
  // -------------------------------------------------------------
  private computeConfidence(text: string, m: StabilityMetrics) {
    const jac = m.jacobian;
    const stab = 1 / (1 + m.crlb);
    const smooth = m.lambda;

    let c = 0.75;

    if (jac > 5) c -= 0.2;
    if (stab < 0.3) c -= 0.3;
    if (smooth < 0.15) c -= 0.2;
    if (text.length < 10) c -= 0.25;

    return Math.max(0.05, Math.min(0.99, c));
  }

  // -------------------------------------------------------------
  // 5) RUN
  // -------------------------------------------------------------
  async run(query: string): Promise<Gen59Output> {
    const { ctx, mergedVec } = await this.fetchContext(query);

    const metrics = await this.kernel.refresh(
      mergedVec ? [mergedVec] : []
    );

    this.lambda = this.computeLambda(metrics);

    let text = await this.forward(query, ctx);

    // 🔥 TDA-VIB 안정화 후처리
    text = this.tdavib.smooth(text);

    const confidence = this.computeConfidence(text, metrics);

    await this.memory.store("mem_" + Date.now(), `${query} => ${text}`);
    
    
    return {
      text,
      confidence,
      stability: metrics,
      memoryUsed: ctx.length > 0,
    };
  }
}

export default YuaGen59Lite;
