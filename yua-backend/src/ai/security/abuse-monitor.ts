// 📡 Abuse Monitor — 악용 패턴 감지 (완성형)
// -----------------------------------------------------
// ✔ 유저별 요청 수 추적
// ✔ 시간당 Abuse Rate 계산
// ✔ Score 기반 위험 사용자 자동 차단
// ✔ SecurityMemory와 연동
// -----------------------------------------------------

import { SecurityMemory } from "./security-memory";

export const AbuseMonitor = {
  history: new Map<string, number[]>(), // userId → timestamp list
  BAN_THRESHOLD: 70,   // 차단 지점
  WINDOW_MS: 60_000,   // 1분 단위 체크
  SCORE_LIMIT: 5,      // 1분 안에 5회 이상 → 위험

  record(userId: string) {
    const now = Date.now();
    const list = this.history.get(userId) || [];

    // 1) 타임 윈도우 내 요청만 남기기
    const recent = list.filter(t => now - t < this.WINDOW_MS);
    recent.push(now);

    this.history.set(userId, recent);

    // 2) Abuse Score 계산
    const score = recent.length;

    // 3) 위험 사용자 자동 감지
    if (score >= this.SCORE_LIMIT) {
      SecurityMemory.log({
        type: "abuse_detected",
        userId,
        score,
        time: now
      });
    }

    return score;
  },

  isAbusing(userId: string) {
    const now = Date.now();
    const list = this.history.get(userId) || [];
    const recent = list.filter(t => now - t < this.WINDOW_MS);
    return recent.length >= this.BAN_THRESHOLD;
  }
};
