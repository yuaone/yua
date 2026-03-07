// 📂 src/ai/memory/memory-short.ts
// 🔥 STRONG MODE — 30 LINE EXTENDED (2025.11 CUSTOM FINAL)

import { MemoryRecord, MemoryStore } from "./memory-store";

export const ShortMemoryEngine = {
  // ------------------------------------------
  // 1) 유효성 검사
  // ------------------------------------------
  isValidContent(content: string): boolean {
    if (!content) return false;

    const trimmed = content.trim();
    if (trimmed.length < 2) return false;

    const banned = [
      "?", "??", "ㅋㅋ", "ㅎㅎ", "ㅇㅇ", "응", "오케이",
      "ㅇ", "네", "아", "뭐야", "맞아", "헐"
    ];
    if (banned.includes(trimmed)) return false;

    const last = MemoryStore.short.peekLast();
    if (last && last.content === trimmed) return false;

    return true;
  },

  // ------------------------------------------
  // 2) SHORT MEMORY 저장
  // ------------------------------------------
  save(role: "user" | "assistant", content: string) {
    if (!this.isValidContent(content)) return;

    const record: MemoryRecord = {
      role,
      content,
      timestamp: Date.now(),
    };

    MemoryStore.short.add(record);

    const all = MemoryStore.short.getAll();

    // 🔥 기존 15 → 30줄 확장
    // 내부 slice는 24줄로 조절 (프롬프트 안정성)
    if (all.length > 30) {
      MemoryStore.short.setAll(all.slice(-24));
    }
  },

  // ------------------------------------------
  // 3) 대화 맥락 가져오기
  // ------------------------------------------
  getContext(): MemoryRecord[] {
    return MemoryStore.short.getAll();
  },

  // ------------------------------------------
  // 4) 초기화
  // ------------------------------------------
  clear() {
    MemoryStore.short.clear();
  },
};
