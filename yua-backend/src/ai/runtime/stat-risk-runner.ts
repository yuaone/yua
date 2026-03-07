// 🔒 PHASE 9-5 STAT Risk Runner (SSOT)
// - Snapshot → RiskFrame 생성
// - Registry 저장은 허용(스냅샷), 판단/조치 ❌

import type { RuntimeFeatureSnapshot } from "./feature-snapshot.types";
import type { StatRiskFrame } from "./stat-risk.types";
import { StatRiskModel, DEFAULT_STAT_RISK_CONFIG } from "./stat-risk-model";
import { PathRiskRegistry } from "./path-risk-registry";

export class StatRiskRunner {
  static run(snapshot: RuntimeFeatureSnapshot): StatRiskFrame {
    const frame = StatRiskModel.compute(snapshot, DEFAULT_STAT_RISK_CONFIG);

    // 🔒 snapshot 저장(관측)만. runtime 영향 주면 SSOT 위반.
    PathRiskRegistry.update(frame.path, frame.pathRiskScore);

    return frame;
  }
}
