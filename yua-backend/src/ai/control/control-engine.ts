// 📂 src/ai/control/control-engine.ts
// 🔥 Control Engine — Enterprise Final (2025.11)

import { ControlAggregator } from "./control-aggregator";
import { ImpactAnalyzer } from "./control-impact";

export const ControlEngine = {
  async snapshot(cameraId: string = "default") {
    const data = await ControlAggregator.collect(cameraId);

    // data 내부에 cameraId가 있을 경우 제거하여 TS2783 방지
    const { cameraId: _ignored, ...safeData } = data || {};

    const impact = ImpactAnalyzer.analyze(data.video);

    return {
      ok: true,
      cameraId,   // cameraId 우선 유지
      ...safeData, // 덮어쓰기 충돌 제거됨
      impact,
    };
  }
};
