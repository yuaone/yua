// 📂 src/ai/yua/yua-memory-engine.ts
// -------------------------------------------------------------
// YUA-AI v2.2 Memory Engine — Stability + Time-Series Aware
// (NON-BREAKING EXTENSION)
// -------------------------------------------------------------

import { embedVector } from "../../utils/math/embedding";
import { cosineSim, normalize } from "../../utils/common/vector-utils";

import { YuaStabilityKernel } from "./yua-stability-kernel";
import { logWarn } from "../../utils/logger";

export interface MemoryEntry {
  id: string;
  text: string;
  vector: number[];
  meta: any;
  score?: number;
  createdAt: number;
  updatedAt: number;
}

export class YuaMemoryEngine {
  private kernel = new YuaStabilityKernel();

  private shortTerm: MemoryEntry[] = [];
  private longTerm: MemoryEntry[] = [];

  private similarityThreshold = 0.92;
  private maxShort = 50;
  private maxLong = 500;

  constructor() {}

  // ---------------------------------------------------------
  // 1) Stability Filter (unchanged)
  // ---------------------------------------------------------
  private canStore(metrics: any): boolean {
    const mu = metrics.mu ?? metrics.stabilityScore ?? 0;
    const jac = metrics.jacobianNorm ?? 0;
    const leakage = metrics.tdaSignature ? metrics.tdaSignature.length / 100 : 0;

    if (mu >= 0.7) return false;
    if (leakage > 0.6) return false;
    if (jac > 5.0) return false;

    return true;
  }

  // ---------------------------------------------------------
  // 2) Semantic Compression (unchanged)
  // ---------------------------------------------------------
  private async semanticCompress(vec: number[], text: string) {
    const all = [...this.shortTerm, ...this.longTerm];

    for (const mem of all) {
      const sim = cosineSim(vec, mem.vector);
      if (sim >= this.similarityThreshold) {
        mem.text = text;
        mem.updatedAt = Date.now();
        mem.meta.version = (mem.meta.version ?? 1) + 1;
        return mem;
      }
    }
    return null;
  }

  // ---------------------------------------------------------
  // 3) Aging (unchanged)
  // ---------------------------------------------------------
  private applyAging(mem: MemoryEntry[]) {
    const now = Date.now();
    return mem
      .map((m) => {
        const days = (now - m.updatedAt) / (1000 * 60 * 60 * 24);
        const weight = days > 30 ? 0.2 : 1.0;
        return { ...m, score: (m.score ?? 1) * weight };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // ---------------------------------------------------------
  // 4) Store (🔥 Time-Series meta ADD ONLY)
  // ---------------------------------------------------------
  async store(id: string, text: string, meta: any = {}) {
    const vec = normalize(await embedVector(text));

    const metrics = await this.kernel.refresh([vec]);
    if (!this.canStore(metrics)) {
      logWarn("❌ Memory blocked by Stability", {
        tags: ["memory", "blocked"],
        request: { id, text },
      });
      return { ok: false, reason: "stability_fail" };
    }

    const replaced = await this.semanticCompress(vec, text);
    if (replaced) return { ok: true, type: "updated", id: replaced.id };

    // 🔥 Time-Series Δ calculation (NO type dependency)
    const prev =
      this.shortTerm[this.shortTerm.length - 1] ??
      this.longTerm[this.longTerm.length - 1];

    let deltaNorm: number | undefined;
    let index = 0;

    if (prev) {
      const delta = vec.map((v, i) => v - prev.vector[i]);
      deltaNorm = Math.sqrt(delta.reduce((s, d) => s + d * d, 0));
      index = (prev.meta?.index ?? 0) + 1;
    }

    const entry: MemoryEntry = {
      id,
      text,
      vector: vec,
      meta: {
        ...meta,
        version: 1,
        index,
        deltaNorm,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (this.shortTerm.length < this.maxShort) {
      this.shortTerm.push(entry);
    } else {
      this.longTerm.push(entry);
    }

    this.shortTerm = this.applyAging(this.shortTerm).slice(0, this.maxShort);
    this.longTerm = this.applyAging(this.longTerm).slice(0, this.maxLong);

    return { ok: true, type: "stored", id };
  }

  // ---------------------------------------------------------
  // 5) Search (unchanged)
  // ---------------------------------------------------------
  async search(query: string, limit = 5) {
    const vec = normalize(await embedVector(query));
    const metrics = await this.kernel.refresh([vec]);

    const all = [...this.shortTerm, ...this.longTerm];

    const results = all
      .map((m) => ({
        ...m,
        score: cosineSim(vec, m.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { metrics, results };
  }

  // ---------------------------------------------------------
  // 6) Delete (unchanged)
  // ---------------------------------------------------------
  delete(id: string) {
    this.shortTerm = this.shortTerm.filter((m) => m.id !== id);
    this.longTerm = this.longTerm.filter((m) => m.id !== id);
  }
}
