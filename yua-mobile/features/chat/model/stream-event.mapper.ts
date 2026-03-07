import type { StreamUIState } from "yua-shared/stream/stream-reducer";
import { ActivityKind, type SourceChip } from "yua-shared/stream/activity";

import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";
import type { MobileStreamSession } from "@/store/useMobileStreamSessionStore";

const reasoningKinds = new Set<string>([
  ActivityKind.ANALYZING_INPUT,
  ActivityKind.ANALYZING_IMAGE,
  ActivityKind.PLANNING,
  ActivityKind.RESEARCHING,
  ActivityKind.RANKING_RESULTS,
  ActivityKind.FINALIZING,
  ActivityKind.IMAGE_ANALYSIS,
  ActivityKind.IMAGE_GENERATION,
  ActivityKind.PREPARING_STUDIO,
  ActivityKind.REASONING_SUMMARY,
]);

export function applyStreamStateToAssistantMessage(
  messages: MobileChatMessage[],
  assistantId: string | null,
  stream: StreamUIState,
  session: MobileStreamSession
): MobileChatMessage[] {
  if (!assistantId) return messages;

  const reasoningChunks = (stream.activity ?? []).filter(
    (item) => reasoningKinds.has(String(item.kind)) || item.kind === ActivityKind.SEARCHING || item.kind === ActivityKind.TOOL
  );

  const summaries = (stream.activity ?? [])
    .filter((item) => item.kind === ActivityKind.REASONING_SUMMARY)
    .map((item) => ({
      id: item.id,
      summary: item.inlineSummary ?? item.body ?? item.title ?? "",
    }))
    .filter((item) => item.summary.trim().length > 0);

  const sources = (stream.activity ?? [])
    .flatMap((item) => item.chips ?? [])
    .map((chip): SourceChip => chip);

  const primarySummaryId = session.primarySummaryId ?? summaries[0]?.id ?? null;
  const thinkingElapsedMs =
    session.startedAt != null ? Math.max(0, Date.now() - session.startedAt) : null;

  return messages.map((message) =>
    message.id === assistantId
      ? {
          ...message,
          content: stream.text,
          traceId: stream.traceId ?? message.traceId,
          streaming: !(stream.finalized || stream.done),
          finalized: stream.finalized || stream.done,
          _finalizedAt: stream.finalized ? Date.now() : message._finalizedAt,
            meta: {
              ...(message.meta ?? {}),
              thinkingProfile: stream.thinkingProfile,
              suggestion: stream.suggestion ?? message.meta?.suggestion,
              drawerOpen: message.meta?.drawerOpen ?? false,
              sources: sources.length ? sources : message.meta?.sources,
              thinking: {
                thinkingProfile: stream.thinkingProfile,
                stage: stream.stage ?? null,
                chunks: reasoningChunks.map((item) => ({
                  id: item.id,
                  kind: item.kind,
                  title: item.title,
                  body: item.body,
                  inline: item.inlineSummary,
                  metaTool: typeof item.meta?.tool === "string" ? item.meta.tool : undefined,
                })),
                summaries,
                primarySummaryId,
                thinkingElapsedMs,
              },
            },
        }
      : message
  );
}
