// 📂 src/ai/yua/yua-stability-kernel.ts
// -------------------------------------------------------------
// YUA-AI v2.2 Stability Kernel — Time-Series Aware (NON-BREAKING)
// -------------------------------------------------------------

import { computeFisherBlock } from "../../utils/math/fisher";
import { estimateCRLBTrace } from "../../utils/math/crlb";
import { jacobianNorm } from "../../utils/math/jacobian";
import { persistenceDiagram, topologyLeakageScore } from "../../utils/math/tda";
import { safeNum } from "../../utils/common/vector-utils";
import { logger } from "../../utils/logger";

import {
  StabilityMetrics as StabilityOut,
  CausalSignature,
  DiagnosticReport,
} from "./yua-types";

export class YuaStabilityKernel {
  private metrics: StabilityOut;

  private tUpdate = 30;
  private smoothing = 0.65;
  private lastUpdate = 0;

  // 🔥 internal history for time-series (kernel-local, optional)
  private lastJacobian?: number;
  private lastVelocity?: number;

  constructor() {
    this.metrics = {
      fisherTrace: 1,
      crlb: 1,
      jacobian: 0.1,
      leakage: 0,
      lambda: 0.05,
      mu: 0,
      timestamp: Date.now(),
    };
  }

  evaluateCausality(): CausalSignature {
    const conflictProb =
      this.metrics.jacobian * 0.07 +
      this.metrics.leakage * 0.12 +
      Math.max(0, 0.2 - this.metrics.fisherTrace);

    return {
      causalScore: Math.max(0, 1 - conflictProb),
      conflictProbability: Math.min(1, conflictProb),
      causalChain: ["input → fisher → jacobian → leakage → lambda → output"],
      timestamp: Date.now(),
    };
  }

  private shouldUpdate() {
    return Date.now() - this.lastUpdate >= this.tUpdate;
  }

  async refresh(x: number[][]): Promise<StabilityOut> {
    if (!this.shouldUpdate()) return this.metrics;

    this.lastUpdate = Date.now();

    try {
      const fisherBlock = await computeFisherBlock(x);
      const crlbTrace = await estimateCRLBTrace(fisherBlock);
      const jac = await jacobianNorm(x);

      const diag = persistenceDiagram(x, 0.5);
      const leakage = topologyLeakageScore(diag);

      const lambda = this.smoothLambda(jac);
      const mu = this.computeMu(fisherBlock, jac, leakage);

      // 🔥 Time-Series metrics (optional, safe)
      let velocity: number | undefined;
      let acceleration: number | undefined;

      if (this.lastJacobian !== undefined) {
        velocity = jac - this.lastJacobian;
        if (this.lastVelocity !== undefined) {
          acceleration = velocity - this.lastVelocity;
        }
      }

      this.lastJacobian = jac;
      this.lastVelocity = velocity;

      this.metrics = this.damp({
        fisherTrace: safeNum(fisherBlock),
        crlb: safeNum(crlbTrace),
        jacobian: safeNum(jac),
        leakage: safeNum(leakage),
        lambda: safeNum(lambda),
        mu: safeNum(mu),
        timeSeries: {
          velocity,
          acceleration,
        },
        timestamp: Date.now(),
      });

    } catch (err: any) {
      logger.error("❌ Stability Kernel Error:", err.message);
    }

    return this.metrics;
  }

  private smoothLambda(jac: number): number {
    const C = 1.5;
    const v = 1 / (1 + Math.exp(-(jac - C)));
    return 0.05 + v * 0.7;
  }

  private computeMu(fisher: number, jac: number, leak: number): number {
    let mu = 0;
    if (fisher < 0.1) mu += 0.5;
    if (jac > 3) mu += 0.7;
    if (leak > 0.4) mu += 0.5;
    return Math.min(1, mu);
  }

  private damp(newMetrics: StabilityOut): StabilityOut {
    const m = this.metrics;
    const lerp = (a: number, b: number) =>
      a * this.smoothing + b * (1 - this.smoothing);

    return {
      ...newMetrics,
      fisherTrace: lerp(m.fisherTrace, newMetrics.fisherTrace),
      crlb: lerp(m.crlb, newMetrics.crlb),
      jacobian: lerp(m.jacobian, newMetrics.jacobian),
      leakage: lerp(m.leakage, newMetrics.leakage),
      lambda: lerp(m.lambda, newMetrics.lambda),
      mu: lerp(m.mu, newMetrics.mu),
      timestamp: Date.now(),
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getDiagnostics(): DiagnosticReport {
    return {
      engine: "csk",
      latency: 0,
      memory: 0,
      violationCount: this.metrics.mu > 0.9 ? 1 : 0,
      timestamp: Date.now(),
    };
  }
}
