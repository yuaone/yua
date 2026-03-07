// 📂 src/ai/sensor/sensor-analyzer.ts
// 🔥 Sensor Analyzer — Motion / Depth / IR Threat Interpretation

import { NormalizedSensorPacket } from "./sensor-types";

export const SensorAnalyzer = {
  analyze(packet: NormalizedSensorPacket) {
    const { ir, depth, motion, risk } = packet;

    const tags: string[] = [];
    let event: "NORMAL" | "WARNING" | "DANGER" = "NORMAL";

    // Depth 접근 (가까워짐) — 침입 판단
    if (depth > 0.75) {
      tags.push("approaching");
      event = "WARNING";
    }

    // Motion 급상승 — 격렬한 움직임
    if (motion > 0.8) {
      tags.push("violent_motion");
      event = "WARNING";
    }

    // IR 강한 변화 — 물체/사람 갑작스러운 등장
    if (ir > 0.9) {
      tags.push("sudden_presence");
      event = "WARNING";
    }

    // 센서 기반 위험도
    if (risk >= 80) {
      tags.push("sensor_spike");
      event = "DANGER";
    }

    return {
      event,
      tags,
      risk,
    };
  }
};
