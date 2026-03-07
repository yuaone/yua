// 🔒 EXECUTION KIND — SSOT FINAL (PHASE 5)
// ---------------------------------------
// 책임:
// - TaskKind를 "실행 단위"로 변환
// - 언어 / 검증 / 출력 방식 결정
//
// 금지:
// - LLM 호출 ❌
// - 판단 ❌
// - async ❌

export type ExecutionKind =
  | "CHAT_RESPONSE"        // 일반 대화 응답
  | "IMAGE_OBSERVE"        // 이미지 관측/해석
  | "IMAGE_GENERATE"       // 텍스트 → 이미지 생성
  | "CODE_READONLY"        // 코드 분석 (변경 없음)
  | "CODE_WRITE"           // 코드 생성
  | "CODE_PATCH"           // 기존 코드 수정
  | "TYPE_FIX"             // 타입 오류 수정
  | "RUNTIME_FIX"          // 런타임 오류 수정
  | "REFACTOR_APPLY"       // 구조 개선
  | "FACT_VERIFICATION";   // 검색 결과 검증
