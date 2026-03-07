// 🔒 YUA Memory Candidate Type — SSOT (ALIGNED WITH yua-shared)

export type MemoryCandidateScope =
  | "general_knowledge"
  | "user_preference"
  | "user_profile"
  | "user_research"
  | "project_architecture"
  | "project_decision";

/**
 * 🔑 기존 값 유지 + 확장
 * - 기존 코드 전부 안전
 */
export type MemoryCandidateSource =
  | "passive"
  | "explicit"
  | "tool_verified"
  | "search_verified";

export interface MemoryCandidate {
  content: string;
  scope: MemoryCandidateScope;
  confidence: number;
  reason: string;

  /** 🔒 SOURCE (확장됨) */
  source: MemoryCandidateSource;

  /**
   * 🔑 ChatEngine / CommitEngine 전용 힌트 메타
   * - 판단 ❌
   * - 저장 ❌
   * - scope 재결정용 신호만 전달
   */
  meta?: {
    decisionHint?: "DECISION" | "ARCHITECTURE";
    origin?: "language" | "execution" | "tool";
  };

  /** 🔮 future-proof (optional) */
  ttlDays?: number;
}
