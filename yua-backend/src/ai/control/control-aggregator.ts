// 📂 src/ai/control/control-aggregator.ts
// 🔥 Control Aggregator — Unified Data Collector (FINAL)

import { VideoEngine } from "../video/video-engine";
import { SensorEngine } from "../sensor/sensor-engine";
import { GestureEngine } from "../video/video-gesture-actions";
import { AttackDetector } from "../security/attack-detector";
import { ThreatClassifier } from "../security/threat-classifier";

export const ControlAggregator = {
  async collect(cameraId: string = "default") {
    // -------------------------
    // 🎥 VIDEO
    // -------------------------
    const video =
      (VideoEngine as any).latest ??
      null;

    // -------------------------
    // 📡 SENSOR
    // -------------------------
    const sensor =
      (SensorEngine as any).latest ??
      { event: "NORMAL", tags: [], data: {} };

    // -------------------------
    // ✋ GESTURE
    // -------------------------
    const gesture =
      (GestureEngine as any).latest ??
      { event: "NORMAL", action: "", confidence: 0 };

    // -------------------------
    // 🔥 RECENT ATTACKS
    // -------------------------
    const attacks =
      typeof (AttackDetector as any).getRecent === "function"
        ? await (AttackDetector as any).getRecent()
        : [];

    // -------------------------
    // 🚨 RECENT THREATS
    // -------------------------
    const threats =
      typeof (ThreatClassifier as any).getRecent === "function"
        ? await (ThreatClassifier as any).getRecent()
        : [];

    // -------------------------
    // 📦 FINAL PACKET
    // -------------------------
    return {
      cameraId,
      video,
      sensor,
      gesture,
      attacks,
      threats,
      timestamp: Date.now(),
    };
  },
};
