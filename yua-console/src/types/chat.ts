// src/types/chat.ts

export type FileType = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
};

export type ChatMessage = {
  id: string;
  clientId?: string;

  role: "user" | "assistant" | "system";

  /**
   * ✅ 확정된 메시지 (DONE 이후)
   */
  content: string;

  /**
   * 🔥 스트리밍 중 임시 텍스트
   * - stream 중에만 사용
   * - DONE 시 content로 병합
   */
  streamingText?: string;

  /**
   * 🔥 현재 스트리밍 중인지 여부
   */
  isStreaming?: boolean;

  files?: FileType[];

  // ⭐ Timeline + Spine 모델 필요 필드
  model?: string;

  createdAt: number;
};

// =============================================
// ⭐ saveMessage()가 요구하는 타입 정의
// =============================================
export interface SaveMessagePayload {
  threadId: number;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  files?: FileType[];

  spineChunks?: Array<{
    stage: string;
    output: any;
  }>;
}
