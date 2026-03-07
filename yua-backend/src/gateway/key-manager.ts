// 📂 src/gateway/key-manager.ts
// 🔥 KeyManager — FINAL ENTERPRISE VERSION (2025.11)
// ✔ 시스템 Key / User Key 통합
// ✔ Developer Console 키 발급 구조 반영
// ✔ strict mode 완전 호환

export const keyManager = {
  systemKey: process.env.OPENAI_API_KEY || "",

  // DeveloperConsole에서 발급되는 UserKeys (In-memory 예시)
  userKeys: new Map<string, string>(),

  /**
   * 🧩 시스템 기본 Key 반환
   */
  getSystemKey(): string {
    return this.systemKey;
  },

  /**
   * 🧩 특정 유저의 API Key 등록
   */
  registerUserKey(userId: string, key: string) {
    this.userKeys.set(userId, key);
  },

  /**
   * 🔍 특정 유저의 API Key 조회
   */
  getUserKey(userId: string): string | null {
    return this.userKeys.get(userId) ?? null;
  },

  /**
   * ❌ 키 제거
   */
  removeUserKey(userId: string) {
    this.userKeys.delete(userId);
  }
};
