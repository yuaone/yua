import { YUA } from "./yua";
export { YUA };
export type { YUAConfig } from "./yua";
export default YUA;

// Error classes
export {
  APIError,
  AuthenticationError,
  RateLimitError,
  BadRequestError,
} from "./core/error";

// Stream
export { Stream } from "./core/streaming";

// Response types
export type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionChoice,
  ChatCompletionChunkChoice,
  ChatCompletionCreateParams,
  ChatMessageInput,
  CompletionUsage,
  YuaStreamEvent,
  YuaEventType,
  YuaExtension,
} from "./types/chat";

// YUA extension types
export type {
  ActivityItem,
  ActivityEventPayload,
  ActivityKind,
  ActivityOp,
  ActivityStatus,
  SuggestionItem,
  ReasoningBlock,
  MemoryPayload,
  MemoryScope,
  MemoryOp,
  ThinkingProfile,
  DeepVariant,
  ChatThread,
  ChatMessage,
} from "./types/chat";

// Model mapping
export { MODEL_MAP } from "./types/chat";

// Embedding types
export type {
  EmbeddingModel,
  EmbeddingCreateParams,
  EmbeddingObject,
  EmbeddingResponse,
} from "./types/embedding";

// Utility functions
export { cosineSimilarity } from "./utils/cosine-similarity";

// Admin types
export type {
  AdminUser,
  AdminUserListResponse,
  AdminStats,
  AdminTicket,
  AdminTicketListResponse,
} from "./resources/admin";

// Billing types
export type {
  CreditBalance,
  CreditPurchaseParams,
  CreditPurchaseResult,
  Subscription,
  SubscribeParams,
  Transaction,
} from "./resources/billing";
