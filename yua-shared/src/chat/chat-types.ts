// yua-shared/chat/types.ts

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  threadId: number;
  role: ChatRole;
  traceId?: string;
  content: string;
  createdAt: number;
  model?: string | null;
  streaming?: boolean;
  meta?: {
    studio?: {
      sectionId: number;
      assetType:
        | "DOCUMENT"
        | "IMAGE"
        | "VIDEO"
        | "SEMANTIC_IMAGE"
        | "FACTUAL_VISUALIZATION"
        | "COMPOSITE_IMAGE";
    };
    suggestion?: any;
    thoughtStage?: any;
    stageNarration?: string;
    imageLoading?: boolean;
    isImageOnly?: boolean;
  };
};

export type ChatThread = {
  id: number;
  title: string;
  createdAt: number;
};

export type CreateThreadResponse = {
  ok: true;
  threadId: number;
};

export type ListThreadsResponse = {
  ok: true;
  threads: ChatThread[];
};

export type ListMessagesResponse = {
  ok: true;
  messages: ChatMessage[];
};
