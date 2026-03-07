// 📂 src/gateway/rate-limiter.ts
// 🔥 RateLimiter — FINAL ENTERPRISE VERSION (2025.11)
// ✔ Key별 요청 횟수 관리
// ✔ TTL 자동 초기화
// ✔ Developer Console, 기관용 API 완전 호환

export const rateLimiter = {
  limits: new Map<string, { count: number; ts: number }>(),
  MAX: 60, // 1분 60회
  WINDOW: 60 * 1000, // 1분 TTL

  /**
   * 🚦 요청 허용 여부 체크
   */
  check(key: string) {
    const now = Date.now();
    const data = this.limits.get(key);

    // 기존 데이터 없음 → 새로 등록
    if (!data) {
      this.limits.set(key, { count: 1, ts: now });
      return { ok: true };
    }

    // TTL 만료 → 카운트 초기화
    if (now - data.ts > this.WINDOW) {
      this.limits.set(key, { count: 1, ts: now });
      return { ok: true };
    }

    // 초과
    if (data.count >= this.MAX) {
      return {
        ok: false,
        error: "요청 제한(1분 60회)을 초과했습니다.",
      };
    }

    return { ok: true };
  },

  /**
   * ➕ 카운트 증가
   */
  increment(key: string) {
    const now = Date.now();
    const data = this.limits.get(key);

    if (!data) {
      this.limits.set(key, { count: 1, ts: now });
    } else {
      data.count++;
      this.limits.set(key, data);
    }
  },
};
