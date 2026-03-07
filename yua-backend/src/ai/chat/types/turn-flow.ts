// 🔒 TurnFlow — Conversation Rhythm Only
// -------------------------------------
// 판단 ❌ / 추론 ❌ / 메모리 ❌
// 오직 "이 턴이 어떤 흐름인가"만 표현

export type TurnFlow =
  | "NEW"            // 새 질문
  | "FOLLOW_UP"      // 이전 답변 기반 추가 질문
  | "ACK_CONTINUE"   // 응 / 그래 / 계속
  | "TOPIC_SHIFT";   // 명시적 주제 전환
