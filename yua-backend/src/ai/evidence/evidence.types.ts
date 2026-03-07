// 🔒 EVIDENCE TYPES — SSOT FINAL (PHASE 2)
// ---------------------------------------
// 책임:
// - "이 요청에 실제 근거(evidence)가 있는가?"를 표현
// - TaskResolver / ToolGate / Verification 의 공통 언어
//
// 금지:
// - LLM 판단 ❌
// - async ❌
// - any ❌
// - 추론 로직 ❌
//
// 원칙:
// - Evidence는 사실(fact)이 아니라 "신호(signal)"다
// - 해석은 상위 레이어 책임

/* -------------------------------------------------- */
/* Evidence Kind                                      */
/* -------------------------------------------------- */

export type EvidenceKind =
  | "IMAGE_INPUT"        // 이미지 업로드됨
  | "CODE_SNIPPET"       // 코드 블록 존재
  | "ERROR_LOG"          // 에러 로그/스택 존재
  | "STACK_TRACE"        // 명시적 stack trace
  | "TYPE_ERROR"         // 타입 에러 문구
  | "RUNTIME_ERROR"     // 런타임 에러 문구
  | "URL_REFERENCE"     // URL 포함
  | "FILE_PATH"         // 파일 경로 언급
  | "DIFF_BLOCK"        // diff 형식 코드
  | "COMMAND"           // 실행 명령
  | "SCREENSHOT_TEXT";  // 이미지에서 추출된 텍스트 (OCR)

/* -------------------------------------------------- */
/* Evidence Confidence                                */
/* -------------------------------------------------- */

export type EvidenceStrength =
  | "WEAK"      // 추정 가능
  | "MEDIUM"    // 간접적 확실
  | "STRONG";   // 명시적/구조적 확실

/* -------------------------------------------------- */
/* Evidence Item                                      */
/* -------------------------------------------------- */

export interface EvidenceItem {
  kind: EvidenceKind;

  /**
   * 원본 문자열 or 요약
   * - 로그 일부
   * - 코드 첫 줄
   * - URL
   */
  value?: string;

  /**
   * Evidence 신뢰 강도
   * - STRONG: 파싱으로 확정 가능
   * - MEDIUM: 패턴 일치
   * - WEAK: 맥락 추정
   */
  strength: EvidenceStrength;

  /**
   * 입력 내 위치 힌트 (선택)
   */
  index?: number;
}

/* -------------------------------------------------- */
/* Evidence Snapshot                                  */
/* -------------------------------------------------- */

export interface EvidenceSnapshot {
  /**
   * 모든 수집된 evidence
   */
  items: EvidenceItem[];

  /**
   * 빠른 판단용 플래그
   * (TaskResolver / ToolGate 에서 사용)
   */
  flags: {
    hasImage: boolean;
    hasCode: boolean;
    hasError: boolean;
    hasTypeError: boolean;
    hasRuntimeError: boolean;
    hasDiff: boolean;
  };
}

/* -------------------------------------------------- */
/* Evidence Factory Result (Read Only)                */
/* -------------------------------------------------- */

export interface EvidenceResult {
  snapshot: EvidenceSnapshot;

  /**
   * 통계/학습용
   * - 판단에는 직접 사용 ❌
   */
  stats: {
    total: number;
    strong: number;
    medium: number;
    weak: number;
  };
}
