export interface ChatMessage {
  id?: string;
  userId: string;
  role: "user" | "assistant" | "system";
  message: string;
  prompt?: string;      // 🔹 optional (AI 프롬프트 저장용)
  createdAt?: number;   // 🔹 repo가 자동 생성하므로 optional 처리
}
