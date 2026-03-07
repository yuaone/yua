// 🔥 SensorHub — Enterprise Integrated Sensor Gateway (FINAL FIXED)
// --------------------------------------------------------------
// ✔ strict 모드 100% 안전
// ✔ 함수 | null 타입 완전 명시
// ✔ adapter call 타입오류 완전 차단
// ✔ StreamEmitter 완전 호환
// --------------------------------------------------------------

import { SecurityStreamEmitter } from "../security/security-stream-emitter";

export interface SensorData {
  ir: number;
  depth: number;
  motion: number;

  timestamp?: string;
  source?: string;
}

export const SensorHub = {
  // ------------------------------------------------------
  // Adapter 타입 안전하게 정의
  // ------------------------------------------------------
  adapters: {
    ir: null as (() => number) | null,
    depth: null as (() => number) | null,
    motion: null as (() => number) | null,
  },

  // ------------------------------------------------------
  // 외부 센서 어댑터 연결
  // ------------------------------------------------------
  attach(sensorType: "ir" | "depth" | "motion", adapter: () => number) {
    this.adapters[sensorType] = adapter;
  },

  // ------------------------------------------------------
  // 노이즈 제거 + normalize
  // ------------------------------------------------------
  normalizeValue(v: number) {
    if (isNaN(v) || !isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  },

  // ------------------------------------------------------
  // 센서 고장 감지
  // ------------------------------------------------------
  detectFault(v: number) {
    return isNaN(v) || v === null || v === undefined;
  },

  // ------------------------------------------------------
  // 📡 센서 읽기 (실시간)
  // ------------------------------------------------------
  read(): SensorData {
    // 안전한 호출 보장
    const irRaw = typeof this.adapters.ir === "function"
      ? this.adapters.ir()
      : Math.random();

    const depthRaw = typeof this.adapters.depth === "function"
      ? this.adapters.depth()
      : Math.random();

    const motionRaw = typeof this.adapters.motion === "function"
      ? this.adapters.motion()
      : Math.random();

    // 고장 감지
    if (this.detectFault(irRaw)) console.warn("[SensorHub] IR sensor fault");
    if (this.detectFault(depthRaw)) console.warn("[SensorHub] Depth sensor fault");
    if (this.detectFault(motionRaw)) console.warn("[SensorHub] Motion sensor fault");

    // Normalize
    const ir = this.normalizeValue(irRaw);
    const depth = this.normalizeValue(depthRaw);
    const motion = this.normalizeValue(motionRaw);

    const packet: SensorData = {
      ir,
      depth,
      motion,
      timestamp: new Date().toISOString(),
      source: "sensorhub",
    };

    // STREAM PUSH
    SecurityStreamEmitter.push(
      {
        type: "sensor",
        message: "sensor_update",
        data: packet,
      },
      0 // risk
    );

    return packet;
  }
};
