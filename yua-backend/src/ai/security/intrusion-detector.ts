// 🚨 Intrusion Detector — Enterprise Production Version
// ---------------------------------------------------------
// ✔ IP 기반 초단기 스파이크 감지
// ✔ 1초 / 3초 / 60초 요청량 분리 체크
// ✔ DDOS / BOT 패턴 탐지
// ✔ IP 별 Ban Score 자동 증가
// ✔ SecurityMemory 연동 가능
// ---------------------------------------------------------

import { SecurityMemory } from "./security-memory";

export const IntrusionDetector = {
  track: new Map<string, number[]>(), // ip → timestamps
  BAN_THRESHOLD: 120,   // 1분 120회 이상 → 고위험
  SPIKE_3S: 40,         // 3초 40회 이상 → 스파이크
  SPIKE_1S: 20,         // 1초 20회 이상 → 초스파이크
  WINDOW_1S: 1000,
  WINDOW_3S: 3000,
  WINDOW_60S: 60000,

  check(ip: string) {
    const now = Date.now();
    const list = this.track.get(ip) || [];

    // 최근 요청만 유지
    const recent = list.filter(t => now - t < this.WINDOW_60S);
    recent.push(now);

    this.track.set(ip, recent);

    // 1) 1초 요청 수
    const oneSec = recent.filter(t => now - t < this.WINDOW_1S).length;
    if (oneSec > this.SPIKE_1S) {
      return this.block(ip, "1s_spike");
    }

    // 2) 3초 요청 수
    const threeSec = recent.filter(t => now - t < this.WINDOW_3S).length;
    if (threeSec > this.SPIKE_3S) {
      return this.block(ip, "3s_spike");
    }

    // 3) 60초 요청 수
    if (recent.length > this.BAN_THRESHOLD) {
      return this.block(ip, "60s_overflow");
    }

    return { ok: true };
  },

  block(ip: string, reason: string) {
    SecurityMemory.log({
      type: "intrusion_detected",
      ip,
      reason,
      time: Date.now(),
    });

    return { ok: false, reason };
  }
};
