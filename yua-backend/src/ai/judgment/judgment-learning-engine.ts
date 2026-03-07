// src/ai/judgment/judgment-learning-engine.ts
// 🔒 SSOT: Judgment Learning Engine (Batch / Offline)

import { JudgmentFailureStore } from "./judgment-failure-store";
import { generateRuleCandidates } from "./judgment-rule-generator";
import { promoteRules } from "./judgment-rule-promoter";
import {
  judgmentRegistry,
  judgmentTPUEngine,
} from "./judgment-singletons";

import { saveJudgmentRules } from "./judgment-persistence";

export class JudgmentLearningEngine {
  constructor(private failureStore: JudgmentFailureStore) {}

  async learn(): Promise<void> {
    // --------------------------------------------------
    // 0️⃣ Failure density check (노이즈 방지)
    // --------------------------------------------------
    const recentFailures = this.failureStore.getRecent(30);

   if (recentFailures.length < 3) {
  saveJudgmentRules(); // 안정 상태라도 스냅샷 유지
  return;
}

    // --------------------------------------------------
    // 1️⃣ failure → rule 후보 생성
    // --------------------------------------------------
    const candidates = generateRuleCandidates(this.failureStore);

    if (candidates.length === 0) return;

    // --------------------------------------------------
    // 2️⃣ Rule confidence 보정 (폭주 방지)
    // --------------------------------------------------
    const stabilizedCandidates = candidates.map(rule => {
      const cappedConfidence =
        rule.confidence > 0.85 ? 0.85 : rule.confidence;

      return {
        ...rule,
        confidence: cappedConfidence,
      };
    });

    // --------------------------------------------------
    // 3️⃣ Registry 승격 (기존 로직 유지)
    // --------------------------------------------------
    promoteRules(judgmentRegistry, stabilizedCandidates);

    // --------------------------------------------------
    // 4️⃣ ⚡ TPU confidence reinforcement (선별 실행)
    // --------------------------------------------------
    for (const rule of judgmentRegistry.getActive()) {
      // 너무 약한 rule은 TPU 학습 제외
      if (rule.confidence < 0.4) continue;

      try {
        await judgmentTPUEngine.accelerate({
          inputEmbedding: [], // PHASE 3 placeholder
          domain: "learning",
          difficulty:
            rule.type === "block"
              ? 0.8
              : rule.type === "defer"
              ? 0.6
              : 0.5,
          pathHint: "NORMAL",
        });
      } catch {
        // TPU 실패는 학습 실패로 간주하지 않음 (SSOT)
        continue;
      }
    }
  }
}
