// 📂 src/ai/chat/types/chat-mode.ts
// 🔥 YUA ChatMode — SSOT v1 (2026.01)

export type ChatMode =
  | "FAST"
  | "NORMAL"
  | "SEARCH"
  | "DEEP"
  | "BENCH"
  | "RESEARCH";
/**
 * 외부 입력 / legacy 방어용
 *
 * SSOT 규칙:
 * - 알 수 없는 값은 NORMAL로 강등
 * - MODE는 "행동 태도"이며 판단이 아님
 */
export function normalizeMode(mode?: string): ChatMode {
  switch (mode) {
    case "FAST":
    case "SEARCH":
    case "DEEP":
    case "BENCH":
    case "RESEARCH":
      return mode;
    default:
      return "NORMAL";
  }
}
