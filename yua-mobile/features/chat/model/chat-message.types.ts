import type { ChatMessage, ChatRole } from "yua-shared/chat/chat-types";
import type { SourceChip } from "yua-shared/stream/activity";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { SuggestionPayload } from "yua-shared/types/suggestion";
import type { ThoughtStage } from "@/components/common/thoughtStage";

// Re-export ChatRole from yua-shared (SSOT)
export type { ChatRole };

export type MobileCompareTable = {
  caption?: string;
  columns: { key: string; title: string }[];
  rows: {
    label: string;
    values: Record<string, string>;
  }[];
};

export type MobileThinkingChunk = {
  id: string;
  kind?: string;
  title?: string;
  body?: string;
  inline?: string;
  metaTool?: string;
};

export type MobileThinkingMeta = {
  thinkingProfile?: "FAST" | "NORMAL" | "DEEP";
  stage?: string | null;
  chunks?: MobileThinkingChunk[];
  summaries?: { id: string; summary: string | null }[];
  primarySummaryId?: string | null;
  thinkingElapsedMs?: number | null;
};

export type MobileChatMessageMeta = {
  thinkingProfile?: "FAST" | "NORMAL" | "DEEP";
  thinking?: MobileThinkingMeta;
  suggestion?: SuggestionPayload | null;
  studio?: { sectionId: number; assetType: string };
  imageLoading?: boolean;
  isImageOnly?: boolean;
  drawerOpen?: boolean;
  branchEmoji?: string;
  sources?: SourceChip[];
  compareTable?: MobileCompareTable;
  attachments?: AttachmentMeta[];
  thoughtStage?: ThoughtStage;
  persona?: "DEFAULT" | "KID";
  confidence?: number;
};

/**
 * MobileChatMessage extends yua-shared ChatMessage with mobile-specific fields.
 * ChatMessage is the SSOT base type from yua-shared.
 */
export type MobileChatMessage = Omit<ChatMessage, "meta"> & {
  streaming?: boolean;
  finalized?: boolean;
  _finalizedAt?: number;
  meta?: MobileChatMessageMeta;
  attachments?: AttachmentMeta[];
};
