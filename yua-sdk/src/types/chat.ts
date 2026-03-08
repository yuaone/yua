// --- OpenAI-compatible response types ---

export interface ChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: CompletionUsage;
  yua?: YuaExtension;
}

export interface ChatCompletionChoice {
  index: number;
  message: { role: "assistant"; content: string };
  finish_reason: "stop" | "length" | "content_filter";
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// --- Streaming chunk ---

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model?: string;
  choices: ChatCompletionChunkChoice[];
  yua_event?: YuaStreamEvent;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: { role?: "assistant"; content?: string };
  finish_reason: null | "stop" | "length";
}

// --- YUA extension events ---

export interface YuaStreamEvent {
  type: YuaEventType;
  data: any;
}

export type YuaEventType =
  | "stage"
  | "activity"
  | "reasoning_block"
  | "reasoning_done"
  | "suggestion"
  | "memory"
  | "answer_unlocked";

// --- YUA extension data (non-streaming aggregated) ---

export interface YuaExtension {
  thinking_profile?: "FAST" | "NORMAL" | "DEEP";
  activities?: ActivityItem[];
  suggestions?: SuggestionItem[];
  memory_ops?: MemoryPayload[];
  reasoning_blocks?: ReasoningBlock[];
}

// --- Activity ---

export type ActivityKind =
  | "NOTE" | "TOOL" | "SEARCHING" | "RESEARCHING"
  | "RANKING_RESULTS" | "ANALYZING_INPUT" | "ANALYZING_IMAGE"
  | "PLANNING" | "REASONING_SUMMARY" | "EXECUTING"
  | "VERIFYING" | "FINALIZING" | "IMAGE_ANALYSIS"
  | "IMAGE_GENERATION" | "CODE_INTERPRETING" | "QUANT_ANALYSIS";

export type ActivityOp = "ADD" | "PATCH" | "END";
export type ActivityStatus = "RUNNING" | "OK" | "FAILED";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  status?: ActivityStatus;
  title?: string;
  body?: string;
  inlineSummary?: string;
  at?: number;
  meta?: Record<string, unknown>;
}

export interface ActivityEventPayload {
  op: ActivityOp;
  item: ActivityItem;
}

// --- Suggestion ---

export interface SuggestionItem {
  id: string;
  label: string;
  intent: "CONTINUE" | "COMPARE" | "STRUCTURE" | "APPLY" | "SUMMARIZE";
  emoji?: string;
}

// --- Reasoning ---

export interface ReasoningBlock {
  id: string;
  title: string;
  body: string;
  inlineSummary?: string;
  groupIndex?: number;
}

// --- Memory ---

export type MemoryScope =
  | "user_profile" | "user_preference" | "user_research"
  | "project_architecture" | "project_decision" | "general_knowledge";

export type MemoryOp = "PENDING" | "SAVED" | "UPDATED" | "CONFLICT" | "SKIPPED";

export interface MemoryPayload {
  op: MemoryOp;
  memoryId?: number;
  scope: MemoryScope;
  content: string;
  confidence?: number;
  reason?: string;
}

// --- Request params ---

export type ThinkingProfile = "FAST" | "NORMAL" | "DEEP";
export type DeepVariant = "STANDARD" | "EXPANDED";

export interface ChatCompletionCreateParams {
  model: string;
  messages: ChatMessageInput[];
  stream?: boolean;
  yua_options?: {
    thread_id?: number;
    attachments?: { file_id: string }[];
    deep_variant?: DeepVariant;
  };
}

export interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

// --- Thread / Message ---

export interface ChatThread {
  id: number;
  title: string;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  threadId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  model?: string | null;
  traceId?: string;
}

// --- Model mapping ---

export const MODEL_MAP: Record<string, ThinkingProfile> = {
  "yua-fast": "FAST",
  "yua-normal": "NORMAL",
  "yua-deep": "DEEP",
  "yua-deep-expanded": "DEEP",
  "yua-search": "NORMAL",
};
