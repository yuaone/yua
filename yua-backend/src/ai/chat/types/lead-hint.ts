// 🔥 YUA LeadHint — SSOT
// 설계/사고 질문에서 "얼마나 사용자를 이끌 것인가"에 대한 힌트

export type LeadHint =
  | "NONE"        // 리드 없음 (중립 응답)
  | "SOFT"        // GPT-style 부드러운 다음 단계 제안
  | "HARD";       // 강한 구조 제안 (아키텍처/설계 고정)
