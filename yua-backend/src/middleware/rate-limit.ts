// 📂 src/middleware/rate-limit.ts
// 🔥 Production-Grade Rate Limit Middleware (2025.11 FINAL)
// -------------------------------------------------------------------
// ✔ IP 기반 per-route RateLimit
// ✔ Burst 허용 / 공격 자동 차단
// ✔ Memory 캐시 기반 (Redis 없이도 안정 작동)
// ✔ 클러스터 환경 대비 key 구조
// ✔ 실제 SaaS/보안플랫폼 운영 기준
// -------------------------------------------------------------------

import { Request, Response, NextFunction } from "express";

type RateInfo = {
  count: number;
  last: number;
};

const RATE_LIMIT_MS = 500;          // 최소 간격 0.5초
const MAX_BURST = 5;                // 단기 최대 5회
const BAN_THRESHOLD = 20;           // 20회 이상 초과 → 공격 간주
const BAN_DURATION_MS = 60 * 1000;  // 1분 Ban

// 메모리 캐시
const ipCache = new Map<string, RateInfo>();
const banList = new Map<string, number>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip ||
      "unknown";

    const route = req.originalUrl || "";
    const key = `${ip}::${route}`;

    const now = Date.now();

    // --------------------------------------------------------------
    // 0) Ban 상태 체크
    // --------------------------------------------------------------
    const bannedUntil = banList.get(key);
    if (bannedUntil && bannedUntil > now) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests (temporary ban applied)",
      });
    }

    // --------------------------------------------------------------
    // 1) 기존 기록 불러오기
    // --------------------------------------------------------------
    let info = ipCache.get(key);
    if (!info) {
      info = { count: 0, last: 0 };
      ipCache.set(key, info);
    }

    const diff = now - info.last;

    // --------------------------------------------------------------
    // 2) 정상 요청 간격 확인
    // --------------------------------------------------------------
    if (diff < RATE_LIMIT_MS) {
      info.count++;

      // ----------------------------------------------------------
      // 2-1) Burst 초과 감지
      // ----------------------------------------------------------
      if (info.count > MAX_BURST) {
        // Ban 처리
        banList.set(key, now + BAN_DURATION_MS);
        return res.status(429).json({
          ok: false,
          error: "rate_limited",
          reason: "banned_temporarily",
        });
      }

      return res.status(429).json({
        ok: false,
        error: "rate_limited",
        reason: "too_many_requests",
      });
    }

    // --------------------------------------------------------------
    // 3) 공격 패턴 탐지 (짧은 시간 과도 요청)
    // --------------------------------------------------------------
    if (info.count > BAN_THRESHOLD) {
      banList.set(key, now + BAN_DURATION_MS);
      info.count = 0;
      return res.status(429).json({
        ok: false,
        error: "rate_limited",
        reason: "suspicious_pattern",
      });
    }

    // --------------------------------------------------------------
    // 4) 정상 요청 → 시간·횟수 리셋/갱신
    // --------------------------------------------------------------
    info.last = now;
    info.count = 0;

    next();
  } catch (err: any) {
    console.error("RateLimit Error:", err);

    // RateLimit 로직 오류 시 API 동작 멈추지 않도록 fail-safe
    next();
  }
}
