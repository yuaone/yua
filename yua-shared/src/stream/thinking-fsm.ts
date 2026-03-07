// yua-shared/src/stream/thinking-fsm.ts
export type ThinkingFSM =
  | { state: "IDLE" }
  | { state: "THINKING" }
  | { state: "ANSWER_STREAMING" }
  | { state: "DONE" };
