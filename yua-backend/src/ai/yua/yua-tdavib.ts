// 📂 src/ai/yua/yua-tdavib.ts
import { logger, logWarn } from "../../utils/logger";
import { persistenceDiagram } from "../../utils/math/tda";

export interface TDAVIBInput {
  embedding: number[];
  vibKL: number;
  vibCompression: number;
}

export interface TDAVIBOutput {
  tda: {
    betti0: number;
    betti1: number;
    betti2: number;
    persistenceEnergy: number;
  };
  vib: {
    KL: number;
    compression: number;
  };
  stabilityScore: number;
}

export class YuaTDAVIB {
  constructor() {}

  private computeTDA(vec: number[]) {
    try {
      const pts = vec.map((v) => [v]);
      const diag = persistenceDiagram(pts, 0.25);

      let betti0 = 0;
      let betti1 = 0;
      let energy = 0;

      for (const p of diag) {
        if (p.dim === 0) betti0++;
        if (p.dim === 1) betti1++;
        energy += Math.abs(p.death - p.birth);
      }

      return {
        betti0,
        betti1,
        betti2: 0,
        persistenceEnergy: energy,
      };

    } catch (err: any) {
      // ✅ FIX — LoggingPayload 완전호환
      logWarn("TDA compute failed, fallback", {
        error: String(err?.message || err),
      });

      return {
        betti0: 1,
        betti1: 0,
        betti2: 0,
        persistenceEnergy: 0,
      };
    }
  }

  private tdaScore(t: TDAVIBOutput["tda"]) {
    const s1 = t.betti0 === 1 ? 1 : 0.7 / (t.betti0 + 1);
    const s2 = Math.exp(-t.betti1);
    const s3 = 1 / (1 + Math.abs(t.persistenceEnergy));
    return (s1 + s2 + s3) / 3;
  }

  private vibScore(v: TDAVIBOutput["vib"]) {
    const s1 = Math.exp(-v.KL);
    const s2 = v.compression > 1 ? 1 / v.compression : v.compression;
    return (s1 + s2) / 2;
  }

  private fuse(t: number, v: number) {
    return Math.min(1, Math.max(0, 0.5 * t + 0.5 * v));
  }

  compute(input: TDAVIBInput): TDAVIBOutput {
    const tda = this.computeTDA(input.embedding);
    const tScore = this.tdaScore(tda);
    const vScore = this.vibScore({
      KL: input.vibKL,
      compression: input.vibCompression,
    });

    return {
      tda,
      vib: { KL: input.vibKL, compression: input.vibCompression },
      stabilityScore: this.fuse(tScore, vScore),
    };
  }

  smooth(text: string): string {
    try {
      if (!text || typeof text !== "string") return "";

      let out = text.trim();
      if (!/[.!?]$/.test(out)) out += ".";

      if (out.length < 5) {
        return "추가 정보가 필요합니다.";
      }

      return out;

    } catch (err: any) {
      // ✅ FIX — LoggingPayload 완전호환
      logWarn("TDA-VIB smoothing failed", {
        error: String(err?.message || err),
      });
      return text;
    }
  }
}
