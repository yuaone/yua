// 🧠 Meta Learner — Offline / Batch only (v2 Stable)
// --------------------------------------------------
// ✔ Decision 수식 변경 없음
// ✔ FailureStore 기반 비율 학습
// ✔ 작은 delta (±0.02)
// ✔ 최소 샘플 수 보장
// ✔ 1회 실행당 1개 파라미터만 조정
// ✔ TTL / Cooldown은 ControlPlaneStore에서 처리
// --------------------------------------------------

import crypto from "crypto";
import { controlPlaneStore } from "./control-plane-store";
import { JudgmentFailureStore } from "../judgment/judgment-failure-store";
import { MetaParameter } from "./meta-parameter";

export class MetaLearner {
  constructor(
    private readonly failureStore: JudgmentFailureStore
  ) {}

  learn(): void {
    const failures = this.failureStore.getRecent(100);

    // 🔒 최소 샘플 수
    if (failures.length < 30) return;

    const total = failures.length;

    // --------------------------------------------------
    // 1️⃣ Failure Type 기반 비율 계산
    // --------------------------------------------------

    const hardFailures = failures.filter(
      f => f.type === "hard"
    ).length;

    const softFailures = failures.filter(
      f => f.type === "soft"
    ).length;

    const correctionCount = failures.filter(
      f => !!f.correctedPath
    ).length;

    const hardRate = hardFailures / total;
    const softRate = softFailures / total;
    const correctionRate = correctionCount / total;

    // --------------------------------------------------
    // 2️⃣ continuationThreshold v2 학습
    // --------------------------------------------------
    // hard 실패 많으면 → threshold ↑ (보수화)
    // hard 거의 없고 soft도 낮으면 → threshold ↓ (완화)

    if (hardRate > 0.35) {
      this.adjust("THRESHOLD", "CONTINUATION", +0.02);
      return;
    }

    if (hardRate < 0.10 && softRate < 0.15) {
      this.adjust("THRESHOLD", "CONTINUATION", -0.02);
      return;
    }

    // --------------------------------------------------
    // 3️⃣ driftWeight conditional decay 학습
    // --------------------------------------------------
    // correction 많으면 → driftWeight ↑
    // correction 거의 없으면 → driftWeight ↓

    if (correctionRate > 0.30) {
      this.adjust("DRIFT_WEIGHT", "BASE", +0.02);
      return;
    }

    if (correctionRate < 0.05) {
      this.adjust("DRIFT_WEIGHT", "BASE", -0.01);
      return;
    }
  }

  // --------------------------------------------------
  // 🔧 MetaParameter 생성 (v2 safe)
  // --------------------------------------------------

  private adjust(
    target: MetaParameter["target"],
    key: string,
    delta: number
  ) {
    const param: MetaParameter = {
      id: crypto.randomUUID(),
      target,
      scope: "GLOBAL",
      key,
      delta,
      confidence: 0.6,          // 신뢰도는 고정 (v2 단순화)
      createdAt: Date.now(),
      ttlMs: 6 * 60 * 60 * 1000 // 6시간 TTL
    };

    controlPlaneStore.add(param);
  }
}