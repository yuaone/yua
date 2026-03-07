// 📂 src/utils/error-format.ts
// 🔥 YUA-AI Error Format Utility — FINAL ENTERPRISE VERSION (2025.11)
// ✔ Middleware / Validator / Engine 내부 로직에서 공통 사용
// ✔ res.json 없이 "객체만 생성"하는 역할
// ✔ errorResponse()와 충돌 없음 (각자 역할 다름)
// ✔ SaaS/API 규격에 맞춘 표준 포맷

export interface YuaErrorFormat {
  error: {
    type: string;          // 오류 카테고리 (invalid_key, limit_exceeded)
    message: string;       // 사용자에게 보여 줄 오류 메시지
    status: number;        // HTTP 상태 코드
    timestamp: string;     // ISO 시간
    details?: any;         // 선택: metadata, 필드 오류 등
  };
}

/**
 * 🎯 errorFormat()
 * - 객체만 생성, res.json()은 Controller 또는 Middleware에서 직접 호출
 * - 구조화된 "오류 정보"만 관리하고 싶을 때 사용
 */
export function errorFormat(
  type: string,
  message: string,
  status: number = 400,
  details?: any
): YuaErrorFormat {
  return {
    error: {
      type,
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    },
  };
}
