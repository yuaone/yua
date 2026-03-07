// 📂 src/utils/error-response.ts
// 🔥 YUA-AI Unified Error Response Utility (2025.11 FINAL)
// ✔ 모든 API / Middleware / Controllers에서 동일 포맷 사용
// ✔ SaaS 표준 구조 (Stripe / OpenAI 스타일)
// ✔ timestamp / status 포함

import { Response } from "express";

export function errorResponse(
  res: Response,
  type: string,
  message: string,
  status: number = 400,
  details?: any
) {
  return res.status(status).json({
    error: {
      type,
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}), // 선택적으로 상세 정보 포함
    },
  });
}
