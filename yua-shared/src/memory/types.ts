// 🔒 YUA Shared Memory Types — SSOT

export type MemoryScope =
  | "user_profile"
  | "user_preference"
  | "user_research"
  | "project_architecture"
  | "project_decision"
  | "general_knowledge";

export type MemoryIndicatorState =
  | "idle"
  | "pending"
  | "saved"
  | "failed";

export type MemoryAckPayload = {
  message?: string;
};

// Memory SSE Stream Types

export type MemoryStreamOp =
  | "PENDING"
  | "SAVED"
  | "UPDATED"
  | "CONFLICT"
  | "SKIPPED";

export type MemoryStreamPayload = {
  op: MemoryStreamOp;
  memoryId?: number;
  scope: MemoryScope;
  content: string;
  confidence?: number;
  reason?: string;
  conflictWith?: number;
  mergedInto?: number;
};
