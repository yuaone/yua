// src/lib/answer/closeTypes.ts
export type CloseIntent =
  | "CONTINUE"
  | "APPLY"
  | "DECIDE"
  | "VERIFY"
  | "STOP";

export type CloseSignal = {
  intent: CloseIntent;
  confidence: "LOW" | "MID" | "HIGH";

  /** UI 제어용 */
  show: boolean;        // 🔥 이게 핵심
  priority: "LOW" | "NORMAL" | "HIGH";
};
