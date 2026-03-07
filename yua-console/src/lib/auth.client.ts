// src/lib/auth.client.ts
// YUA ONE Console — Auth Client (SSOT v1.0)
// 역할: 토큰 보관 / 조회 / 제거 ONLY
// ❌ 검증 ❌ 판단 ❌ 서버 로직

const TOKEN_KEY = "yua_token";

/**
 * 안전하게 토큰 조회
 * - SSR 환경 보호
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * 토큰 저장
 * - 빈 값 방지
 */
export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  if (!token || typeof token !== "string") return;

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage disabled / quota exceeded → 무시
  }
}

/**
 * 토큰 제거
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
}

/**
 * Authorization 헤더 생성 (편의 함수)
 * - fetch용
 */
export function getAuthHeader(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}
