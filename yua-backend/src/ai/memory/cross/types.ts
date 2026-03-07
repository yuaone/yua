// 📂 src/ai/memory/cross/types.ts

export type CrossMemoryType =
  | "DECISION"
  | "PINNED"
  | "SUMMARY"
  | "USER_NOTE"
  | "USER_PROFILE"
  | "USER_LONGTERM";

export type CrossMemoryAttachResult = {
  memoryContext?: string;
  referenceContext?: string;
  attachedIds: string[];
};
