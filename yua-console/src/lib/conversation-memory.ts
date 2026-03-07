// src/lib/conversation-memory.ts

declare global {
  // 전역 메모리 타입 정의
  var __conversationMemory: { prompt: string; response?: string }[] | undefined;
}

// Node.js 서버 메모리에 conversationMemory 배열을 하나만 유지
export const conversationMemory =
  globalThis.__conversationMemory ?? [];

// 글로벌 보존
globalThis.__conversationMemory = conversationMemory;
