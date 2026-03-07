// 📂 src/ai/sensor/sensor-engine.ts
// 🔥 Sensor Engine — Full Pipeline (Hub → Normalize → Analyze → Cache)
// -----------------------------------------------------------------------
// ✔ Hub → Normalize → Analyze 전체 파이프라인
// ✔ FinalSensorPacket 타입 100% 일치 (risk 포함)
// ✔ latest 캐싱 (ControlAggregator 연동)
// ✔ TS 오류 제거 완료
// -----------------------------------------------------------------------

import { SensorHub } from "./sensor-hubs";
import { SensorNormalizer } from "./sensor-normalizer";
import { SensorAnalyzer } from "./sensor-analyzer";
import { FinalSensorPacket } from "./sensor-types";

export const SensorEngine = {
  latest: null as FinalSensorPacket | null,

  read() {
    // 1) 📡 Raw sensor data
    const raw = SensorHub.read();

    // 2) 🔧 Normalize
    const normalized = SensorNormalizer.normalize(raw);

    // 3) 🔥 Analyze → event / tags / risk
    const analysis = SensorAnalyzer.analyze(normalized);

    // 👉 TS2741 해결: FinalSensorPacket 에 risk 필드 포함
    const finalPacket: FinalSensorPacket = {
      ir: normalized.ir,
      depth: normalized.depth,
      motion: normalized.motion,
      risk: normalized.risk,
      timestamp: normalized.timestamp,
      source: "sensor-engine",
    };

    // 4) 최신 데이터 캐시
    this.latest = finalPacket;

    // 5) 결과 반환
    return {
      ok: true,
      data: finalPacket,
      event: analysis.event,
      tags: analysis.tags,
      risk: analysis.risk,
    };
  },

  // 컨트롤룸 대시보드 연동
  getLatest() {
    return this.latest;
  },
};
