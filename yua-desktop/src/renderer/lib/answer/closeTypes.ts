// src/renderer/lib/answer/closeTypes.ts
// Ported from yua-web/src/lib/answer/closeTypes.ts

export type CloseIntent =
  | "CONTINUE"
  | "APPLY"
  | "DECIDE"
  | "VERIFY"
  | "STOP";

export type CloseSignal = {
  intent: CloseIntent;
  confidence: "LOW" | "MID" | "HIGH";
  show: boolean;
  priority: "LOW" | "NORMAL" | "HIGH";
};
