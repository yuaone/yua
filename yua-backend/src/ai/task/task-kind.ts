// 🔒 TASK KIND — SSOT FINAL (PHASE 1)
// ----------------------------------
// 책임:
// - "이 턴에서 무엇을 해야 하는가"의 단일 진실
// - Reasoning / Tool / Prompt 의 기준점
//
// 금지:
// - 추론 ❌
// - LLM 의존 ❌
// - async ❌

export type TaskKind =
  | "DIRECT_CHAT"        // 일반 대화 (설명/확장/공감)
  | "IMAGE_ANALYSIS"     // 이미지 관측 + 오류/구조 추출
  | "IMAGE_GENERATION"   // 텍스트 → 이미지 생성 (Media Pipeline)
  | "CODE_REVIEW"        // 코드 읽기 + 문제 지적
  | "CODE_GENERATION"    // 신규 코드 생성
  | "TYPE_ERROR_FIX"     // 타입 에러 수정
  | "RUNTIME_ERROR_FIX"  // 런타임 에러 수정
  | "REFACTOR"           // 구조 개선
  | "SEARCH"             // unified search (NEW)
  | "SEARCH_VERIFY"
  | "DIRECT_URL_FETCH"   // ✅ 추가
  /* 🔧 TOOL TASKS */
  | "FILE_INTELLIGENCE"
  | "FILE_ANALYSIS"
  | "TABLE_EXTRACTION"
  | "DATA_TRANSFORM";
/**
 * TaskKind는 “행동 분류”이지 “의도”가 아니다.
 *
 * 예:
 * - intent === "design" 이더라도
 *   → CODE_GENERATION / REFACTOR / CODE_REVIEW 로 나뉠 수 있다
 *
 * 이 타입은 절대 축소/변경하지 않는다.
 * (추가만 가능)
 */
