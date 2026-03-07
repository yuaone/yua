export type ActionPreview = {
  kind:
    | "SEARCHING"
    | "THINKING_HARD"
    | "VERIFYING"
    | "BRANCHING"
    | "UNKNOWN";
  /** 🔥 action 발생 근원 (SSOT) */
  source?:
    | "SEARCH_RUNTIME"
    | "VERIFICATION"
    | "FAILURE_SURFACE";

  /** 🔥 lifecycle 제어 */
  lifecycle?: "ONCE" | "UNTIL_NEXT_ACTION" | "UNTIL_FINAL";

  /** 🔥 디버그용 발생 사유 */
  reason?: string;

  frames: string[];
  cadenceMs?: number;
  confidence?: number;
};
